// Render individual frames (or the character sheets) to PNG for inspection.
//   node snap.mjs out_dir 1.2 5.5 12      -> frames at those times
//   node snap.mjs out_dir sheet:pip sheet:atlas
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import path from 'node:path';
import fs from 'node:fs';

const [outDir, ...items] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const VERT = process.env.V === '1';
const page = await browser.newPage({ viewport: VERT ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('file://' + path.resolve('index.html') + (VERT ? '?v=1' : ''));
await page.waitForFunction(() => window.READY === true, null, { timeout: 20000 }).catch(() => {});
if (errors.length) { console.error(errors.join('\n')); }
const el = await page.$('#c');
for (const it of items) {
  if (it.startsWith('sheet:')) await page.evaluate(w => window.drawSheet(w), it.slice(6));
  else await page.evaluate(t => window.seek(t), parseFloat(it));
  const name = it.startsWith('sheet:') ? `sheet-${it.slice(6)}.png` : `t${parseFloat(it).toFixed(2).padStart(6, '0')}.png`;
  await el.screenshot({ path: path.join(outDir, name) });
  console.log(name);
}
if (errors.length) console.error('ERRORS:\n' + errors.join('\n'));
await browser.close();
