// Deterministic frame renderer: Chromium (Playwright) -> PNG frames -> FFmpeg.
// Splits the timeline across parallel workers, each encoding its own segment,
// then concatenates the segments losslessly. Also dumps window.EV for the mix.
//
//   node render.mjs [--workers 4] [--from 0] [--to END] [--out build/video.mp4] [--crf 17]
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const FPS = parseInt(args.fps || '60', 10);
const SSF = parseFloat(args.ss || '1');
const workers = parseInt(args.workers || '4', 10);
const outFile = path.resolve(args.out || 'build/video.mp4');
const crf = args.crf || '17';
const VERT = !!args.v;
const [VW, VH] = (VERT ? [1080, 1920] : [1920, 1080]).map(v => Math.round(v * SSF));
const segDir = path.resolve(`build/segments${VERT ? '-v' : ''}-${VW}x${VH}-${FPS}`);
fs.mkdirSync(segDir, { recursive: true });

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const q = new URLSearchParams(); if (VERT) q.set('v', '1'); if (SSF !== 1) q.set('ss', String(SSF)); if (FPS !== 60) q.set('fps', String(FPS));
  await page.goto('file://' + path.resolve('index.html') + (q.toString() ? '?' + q : ''));
  await page.waitForFunction(() => window.READY === true, null, { timeout: 30000 });
  if (errors.length) throw new Error(errors.join('\n'));
  const cdp = await page.context().newCDPSession(page);
  return { page, cdp };
}

const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--disable-gpu-vsync'] });
const { page: probe } = await openPage(browser);
const END = await probe.evaluate(() => window.END);
const EV = await probe.evaluate(() => window.EV);
fs.writeFileSync('build/events.json', JSON.stringify(EV, null, 1));
await probe.close();

const f0 = Math.round(parseFloat(args.from || '0') * FPS);
const f1 = Math.round(parseFloat(args.to || String(END)) * FPS);
const total = f1 - f0;
const per = Math.ceil(total / workers);
console.log(`rendering frames ${f0}..${f1} (${total}) with ${workers} workers, END=${END}s, ${EV.length} events`);
const started = Date.now();
let done = 0;

async function worker(i) {
  const a = f0 + i * per, b = Math.min(f1, a + per);
  if (a >= b) return null;
  const seg = path.join(segDir, `seg_${String(i).padStart(2, '0')}.mp4`);
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-tune', 'animation',
    '-x264-params', 'aq-mode=3:aq-strength=0.9', '-r', String(FPS), seg],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const { page, cdp } = await openPage(browser);
  for (let f = a; f < b; f++) {
    await page.evaluate(t => window.seek(t), f / FPS);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, clip: { x: 0, y: 0, width: VW, height: VH, scale: 1 } });
    const buf = Buffer.from(data, 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    done++;
    if (i === 0 && done % 120 === 0) {
      const el = (Date.now() - started) / 1000;
      console.log(`  ${done}/${total} frames  ${(done / el).toFixed(1)} fps  eta ${((total - done) / (done / el)).toFixed(0)}s`);
    }
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));
  await page.close();
  return seg;
}

const segs = (await Promise.all(Array.from({ length: workers }, (_, i) => worker(i)))).filter(Boolean);
await browser.close();
const list = path.join(segDir, 'list.txt');
fs.writeFileSync(list, segs.map(s => `file '${s}'`).join('\n'));
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', outFile]);
console.log(`done: ${outFile} in ${((Date.now() - started) / 1000).toFixed(0)}s`);
