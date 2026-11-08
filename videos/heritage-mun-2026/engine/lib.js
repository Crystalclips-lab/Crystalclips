// Core motion library: math, easing, springs, seeded randomness, camera,
// parallax and drawing helpers. Everything is a pure function of time so any
// frame can be rendered in any order (seek(t) determinism).

const W = 1920, H = 1080, FPS = 60;

const PAL = {
  night: '#09134B', violet: '#180A59', royal: '#243CDB', purple: '#6535A8',
  teal: '#22D7DA', cyan: '#33B9D7', orange: '#FF851D', pink: '#ED4BA4',
  yellow: '#FFD244', sky: '#8CAAF7', white: '#F4F6FF', ink: '#070B2E',
};

// ---------- math ----------
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, v) => (v - a) / (b - a);
const prog = (t, a, b) => clamp((t - a) / (b - a));
const TAU = Math.PI * 2;

const E = {
  lin: t => t,
  inQ: t => t * t,
  outQ: t => 1 - (1 - t) * (1 - t),
  ioQ: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inC: t => t * t * t,
  outC: t => 1 - Math.pow(1 - t, 3),
  ioC: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuint: t => 1 - Math.pow(1 - t, 5),
  ioQuint: t => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
  outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  ioSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  inBack: (t, s = 1.70158) => (s + 1) * t * t * t - s * t * t,
};

// Damped spring step response (0 -> 1 with overshoot). t in seconds.
function spring(t, freq = 2.2, damp = 0.42) {
  if (t <= 0) return 0;
  const w = TAU * freq, wd = w * Math.sqrt(1 - damp * damp);
  return 1 - Math.exp(-damp * w * t) * (Math.cos(wd * t) + (damp * w / wd) * Math.sin(wd * t));
}
// Decaying oscillation impulse (0 at rest), e.g. a wire bounce after landing.
function wobble(t, freq = 3, decay = 3.5) {
  if (t <= 0) return 0;
  return Math.sin(TAU * freq * t) * Math.exp(-decay * t);
}
// Smooth pulse 0->1->0 inside [a,b] with fade length f.
function pulse(t, a, b, f = 0.2) {
  return E.ioSine(prog(t, a, a + f)) * (1 - E.ioSine(prog(t, b - f, b)));
}

// ---------- seeded randomness ----------
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Smooth 1D value noise, deterministic.
function noise1(x, seed = 1) {
  const i = Math.floor(x), f = x - i;
  const h = n => { const r = Math.sin((n + seed * 101.3) * 127.1) * 43758.5453; return r - Math.floor(r); };
  const u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u) * 2 - 1;
}

// Blink curve: returns eyelid closure 0..1, blinking every ~2.5-4s.
function blinkAt(t, seed = 3, extra = []) {
  const r = rng(seed);
  let k = 0.6 + r() * 1.5, c = 0;
  while (k < t + 1) {
    c = Math.max(c, 1 - clamp(Math.abs(t - k) / 0.075));
    k += 2.5 + r() * 1.5;
  }
  for (const e of extra) c = Math.max(c, 1 - clamp(Math.abs(t - e) / 0.075));
  return c;
}

// ---------- colour ----------
function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixColor(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(lerp(v, B[i], clamp(t))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
function rgba(h, a) {
  const c = hexToRgb(h);
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

// ---------- camera & parallax ----------
// cam = {x, y, z, r} : world point at screen centre, zoom, roll.
// depth p: 0 = locked to screen, 1 = main plane, >1 = foreground.
function applyCam(ctx, cam, p = 1, shake = [0, 0]) {
  const s = Math.max(0.05, 1 + (cam.z - 1) * p);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(W / 2 + shake[0], H / 2 + shake[1]);
  ctx.rotate((cam.r || 0) * p);
  ctx.scale(s, s);
  ctx.translate(-(W / 2 + (cam.x - W / 2) * p), -(H / 2 + (cam.y - H / 2) * p));
}
function camLerp(a, b, t) {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t), r: lerp(a.r || 0, b.r || 0, t) };
}
// Camera path through keyframes [{t, x,y,z,r, ease}], eased per segment.
function camPath(t, keys) {
  if (t <= keys[0].t) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b.t) return camLerp(a, b, (b.ease || E.ioC)(prog(t, a.t, b.t)));
  }
  return keys[keys.length - 1];
}
// Gentle hand-held drift so no shot is ever perfectly static.
function drift(t, amt = 6, seed = 7) {
  return [noise1(t * 0.35, seed) * amt, noise1(t * 0.3, seed + 5) * amt * 0.6];
}

// ---------- drawing helpers ----------
function circle(ctx, x, y, r, fill) {
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); ctx.fillStyle = fill; ctx.fill();
}
function ellipse(ctx, x, y, rx, ry, rot, fill) {
  ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, TAU); ctx.fillStyle = fill; ctx.fill();
}
function rrect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
}
function poly(ctx, pts, fill) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
function line(ctx, x1, y1, x2, y2, w, col, cap = 'round') {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.lineWidth = w; ctx.strokeStyle = col; ctx.lineCap = cap; ctx.stroke();
}
// Smooth closed blob through points (Catmull-Rom -> Bezier).
function blob(ctx, pts, fill) {
  const n = pts.length;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    if (i === 0) ctx.moveTo(p1[0], p1[1]);
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}

// Pre-rendered radial glow sprite, drawn additively for cheap bloom.
const GLOW = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return c;
})();
const tintCache = {};
function glowSprite(col) {
  if (tintCache[col]) return tintCache[col];
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.drawImage(GLOW, 0, 0); g.globalCompositeOperation = 'source-in';
  g.fillStyle = col; g.fillRect(0, 0, 128, 128);
  return (tintCache[col] = c);
}
function glow(ctx, x, y, r, col, a = 1) {
  if (a <= 0 || r <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(a);
  ctx.drawImage(glowSprite(col), x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

// ---------- typography ----------
// Spring "pop" title: words enter staggered with overshoot.
function popText(ctx, txt, x, y, t, opts = {}) {
  const { size = 64, weight = 900, color = PAL.white, stagger = 0.07, align = 'center',
    shadow = PAL.ink, out = null, letter = 2 } = opts;
  ctx.save();
  ctx.font = `${weight} ${size}px Montserrat`;
  ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${letter}px`;
  const words = txt.split(' ');
  const widths = words.map(w => ctx.measureText(w).width);
  const space = size * 0.28;
  const total = widths.reduce((a, b) => a + b, 0) + space * (words.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  words.forEach((w, i) => {
    const lt = t - i * stagger;
    let s = spring(lt, 2.4, 0.45);
    let a = clamp(lt / 0.12);
    if (out !== null) { const o = E.inBack(prog(t, out, out + 0.3)); s *= 1 - o; a *= 1 - o; }
    if (a > 0.001) {
      ctx.save();
      ctx.translate(cx + widths[i] / 2, y + (1 - s) * size * 0.35);
      ctx.scale(Math.max(0.001, s), Math.max(0.001, s));
      ctx.globalAlpha *= clamp(a);
      ctx.textAlign = 'center';
      if (shadow) { ctx.fillStyle = shadow; ctx.fillText(w, 0, size * 0.07); }
      ctx.fillStyle = color; ctx.fillText(w, 0, 0);
      ctx.restore();
    }
    cx += widths[i] + space;
  });
  ctx.restore();
}

// Rounded label panel with pointer that springs in.
function label(ctx, txt, x, y, t, opts = {}) {
  const { size = 30, bg = PAL.white, fg = PAL.night, out = null, px = 22, py = 13, tip = null } = opts;
  let s = spring(t, 2.6, 0.5);
  if (out !== null) s *= 1 - E.inBack(prog(t, out, out + 0.25));
  if (s <= 0.01) return;
  ctx.save();
  ctx.font = `800 ${size}px Montserrat`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '1px';
  const w = ctx.measureText(txt).width + px * 2, h = size + py * 2;
  ctx.translate(x, y); ctx.scale(s, s);
  if (tip) {
    ctx.beginPath(); ctx.moveTo(-14, h / 2 - 4); ctx.lineTo(tip[0] - x, tip[1] - y); ctx.lineTo(14, h / 2 - 4);
    ctx.fillStyle = bg; ctx.fill();
  }
  ctx.fillStyle = rgba(PAL.ink, 0.35); ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2 + 6, w, h, h / 2); ctx.fill();
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(txt, 0, 2);
  ctx.restore();
}

// Lightning bolt icon (used on signs and warnings).
function bolt(ctx, x, y, s, fill) {
  poly(ctx, [[x + 0.15 * s, y - 0.5 * s], [x - 0.3 * s, y + 0.08 * s], [x - 0.02 * s, y + 0.08 * s],
    [x - 0.15 * s, y + 0.5 * s], [x + 0.3 * s, y - 0.1 * s], [x + 0.02 * s, y - 0.1 * s]], fill);
}

// =====================================================================
// Precision shading: rim lights and core shadows are cut from the shape's
// own outline (the shape clipped against a shifted copy of itself), so they
// follow every curve exactly. They are drawn OVER the base fill, never
// under it, so antialiased edges can't leak a coloured halo.
// =====================================================================
const BIG = (() => { const p = new Path2D(); p.rect(-20000, -20000, 40000, 40000); return p; })();
function crescent(ctx, path, dx, dy, col) {
  // paints (path minus path shifted by (dx,dy)) — a crescent on the side opposite the shift
  const p = new Path2D(BIG);
  p.addPath(path, new DOMMatrix([1, 0, 0, 1, dx, dy]));
  ctx.save(); ctx.clip(path); ctx.fillStyle = col; ctx.fill(p, 'evenodd'); ctx.restore();
}
// light: unit-ish vector pointing TOWARD the light (screen space, y down)
function isOpaque(c) { return typeof c === 'string' && c[0] === '#'; }
// Base fill that leaves room for an opaque rim: the base stops (r-1)px short of the lit
// edge, so the rim (drawn after) owns the silhouette there and overlaps the base by 1px.
function baseFill(ctx, path, fillFn, lx, ly, r) {
  ctx.save();
  if (r > 1.0) { const keep = new Path2D(); keep.addPath(path, new DOMMatrix([1, 0, 0, 1, -lx * (r - 1), -ly * (r - 1)])); ctx.clip(keep); }
  fillFn();
  ctx.restore();
}
function shapeFill(ctx, path, base, o = {}) {
  const { rim, r = 0, light = [0.7, -0.7], shadow, s = 0, gloss } = o;
  const L = Math.hypot(light[0], light[1]) || 1, lx = light[0] / L, ly = light[1] / L;
  const exclusive = rim && r > 0 && isOpaque(rim);
  baseFill(ctx, path, () => { ctx.fillStyle = base; ctx.fill(path); }, lx, ly, exclusive ? r : 0);
  if (shadow && s > 0) crescent(ctx, path, lx * s, ly * s, shadow);   // shadow on the far side
  if (rim && r > 0) crescent(ctx, path, -lx * r, -ly * r, rim);        // rim on the lit side
  if (gloss) gloss(ctx, path);
}
// clip to everything EXCEPT path (evenodd against a huge rect)
function clipOut(ctx, path, m) { const p = new Path2D(BIG); p.addPath(path, m || new DOMMatrix()); ctx.clip(p, 'evenodd'); }
function pEllipse(x, y, rx, ry, rot = 0) { const p = new Path2D(); p.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); return p; }
function pRect(x, y, w, h, r = 0) { const p = new Path2D(); p.roundRect(x, y, w, h, r); return p; }
function pPoly(pts) { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); p.closePath(); return p; }
function pCircle(x, y, r) { const p = new Path2D(); p.arc(x, y, Math.max(0.01, r), 0, TAU); return p; }
function pBlob(pts) {
  const n = pts.length, p = new Path2D();
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    if (i === 0) p.moveTo(p1[0], p1[1]);
    p.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  p.closePath(); return p;
}

// Word-wrap text into lines that fit maxW at the current ctx.font.
function wrapLines(ctx, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width <= maxW || !cur) cur = test; else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
// Debug registry: every text block records its box so QC can verify nothing overflows.
const TEXT_BOXES = [];
function textBlock(ctx, text, x, y, maxW, o = {}) {
  const { size = 40, weight = 800, color = PAL.white, lh = 1.25, align = 'left', t = 1, stagger = 0.035, letter = 0 } = o;
  ctx.save();
  ctx.font = `${weight} ${size}px Montserrat`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${letter}px`;
  ctx.textBaseline = 'top'; ctx.textAlign = align;
  const lines = wrapLines(ctx, text, maxW);
  let maxLine = 0;
  lines.forEach((ln, i) => {
    const lt = t - i * stagger * 3;
    const a = clamp(lt / 0.25), dy = (1 - E.outC(clamp(lt / 0.35))) * 18;
    maxLine = Math.max(maxLine, ctx.measureText(ln).width);
    if (a <= 0) return;
    ctx.globalAlpha = a;
    ctx.fillStyle = color; ctx.fillText(ln, x, y + i * size * lh + dy);
  });
  ctx.restore();
  TEXT_BOXES.push({ text, x, y, maxW, w: maxLine, h: lines.length * size * lh, lines: lines.length });
  return lines.length * size * lh;
}
