// Environments for Heritage MUN 2026. Layered (background / midground / foreground)
// and drawn through the camera with parallax. Box-shaped rims use shapeFill on
// rect paths, so highlights sit exactly on the edges they light.

// ============================== HIMS CAMPUS ==============================
// Based on the real campus: a cluster of white multi-storey blocks with grid
// windows, red rooftop signage, trees and a forecourt along the NH-2 bypass.
const CAMPUS = {
  ground: 870,
  blocks: [
    { x: 230, w: 380, top: 352, floors: 9, cols: 7, sign: 'HIMS' },
    { x: 1000, w: 640, top: 368, floors: 9, cols: 11, sign: 'HERITAGE IMS' },
    { x: 590, w: 430, top: 300, floors: 10, cols: 7, entrance: true },
  ],
};
const CAMPUS_STARS = (() => { const r = rng(71); return Array.from({ length: 140 }, () => ({ x: r() * 2400 - 240, y: r() * 600, s: 0.8 + r() * 2, ph: r() * TAU })); })();
const LIT = (() => { const r = rng(99); return Array.from({ length: 400 }, () => r()); })();

function skyGrad(ctx, night) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, mixColor('#241466', '#060B33', night));
  g.addColorStop(0.42, mixColor('#6535A8', '#130A4E', night));
  g.addColorStop(0.64, mixColor('#ED4BA4', '#3A1E86', night));
  g.addColorStop(0.78, mixColor('#FF851D', '#5A2A9A', night));
  g.addColorStop(0.9, mixColor('#FFD244', '#7A3AA8', night));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

function temple(ctx, x, base, h, col) {
  // shikhara: curved spire on a plinth, with a small finial and flag
  const w = h * 0.42;
  ctx.fillStyle = col;
  ctx.fillRect(x - w * 0.75, base - h * 0.28, w * 1.5, h * 0.28);
  ctx.beginPath(); ctx.moveTo(x - w * 0.6, base - h * 0.28);
  ctx.quadraticCurveTo(x - w * 0.55, base - h * 0.9, x, base - h);
  ctx.quadraticCurveTo(x + w * 0.55, base - h * 0.9, x + w * 0.6, base - h * 0.28);
  ctx.closePath(); ctx.fill();
  ctx.fillRect(x - 1.5, base - h - 16, 3, 16);
  ctx.beginPath(); ctx.moveTo(x + 1.5, base - h - 16); ctx.lineTo(x + 16, base - h - 11); ctx.lineTo(x + 1.5, base - h - 6); ctx.fill();
}

function drawCampus(ctx, cam, t, o = {}) {
  const night = o.night || 0, sh = o.shake || [0, 0];
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  skyGrad(ctx, night);
  // stars (night)
  if (night > 0.05) { applyCam(ctx, cam, 0.03); for (const st of CAMPUS_STARS) circle(ctx, st.x, st.y, st.s, rgba('#E6E9FF', night * (0.4 + 0.5 * Math.sin(t * 1.5 + st.ph)))); }
  // sun (dawn) / moon (night)
  applyCam(ctx, cam, 0.06, sh);
  const sunY = lerp(560, 900, night), sunX = V ? 1180 : 1560;
  glow(ctx, sunX, sunY, 560, PAL.orange, 0.5 * (1 - night));
  glow(ctx, sunX, sunY, 260, PAL.yellow, 0.7 * (1 - night));
  if (night < 0.98) circle(ctx, sunX, sunY, 120, mixColor('#FFE58A', '#FF9A3D', night));
  if (night > 0.02 && !V) { glow(ctx, 1720, 150, 200, '#6F7DF0', 0.35 * night); circle(ctx, 1720, 150, 52, rgba('#ECEBFF', night)); circle(ctx, 1702, 138, 9, rgba('#D3D0F6', night)); circle(ctx, 1738, 166, 12, rgba('#D3D0F6', night)); }
  // clouds
  for (const [cx, cy, cw, p] of [[260, 250, 380, 0.1], [1150, 180, 460, 0.07], [1750, 300, 300, 0.12]]) {
    applyCam(ctx, cam, p, sh);
    const x = cx + t * 9, col = mixColor('#F46DB0', '#2A1A6B', night);
    rrect(ctx, x, cy, cw, 42, 21, col); rrect(ctx, x + cw * 0.2, cy - 28, cw * 0.42, 50, 25, col); rrect(ctx, x + cw * 0.52, cy - 12, cw * 0.3, 38, 19, col);
  }
  // Varanasi skyline on the horizon: temple spires & ghat buildings
  applyCam(ctx, cam, 0.22, sh);
  const far = mixColor('#9A4A9E', '#24165E', night);
  ctx.fillStyle = far;
  ctx.beginPath(); ctx.moveTo(-1000, 1200);
  for (let x = -1000; x <= 3000; x += 40) ctx.lineTo(x, 800 + 14 * Math.sin(x * 0.004 + 1));
  ctx.lineTo(3000, 1200); ctx.closePath(); ctx.fill();
  const r = rng(12);
  for (let x = -900; x < 2900; x += 70 + r() * 90) {
    const hh = 30 + r() * 50;
    if (r() < 0.28) temple(ctx, x, 802, 90 + r() * 80, far);
    else { ctx.fillStyle = far; ctx.fillRect(x, 800 - hh, 50 + r() * 40, hh + 10); }
  }
  // mid trees line
  applyCam(ctx, cam, 0.5, sh);
  for (let x = -600; x < 2600; x += 48) {
    const yy = 840 + Math.sin(x * 0.07) * 8;
    circle(ctx, x, yy, 34 + Math.sin(x) * 8, mixColor('#5C2E86', '#170F48', night));
  }

  // event searchlights sweeping behind the campus
  if (o.beams) {
    applyCam(ctx, cam, 0.7, sh);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [bx, ph] of [[380, 0], [1320, 1.7], [880, 3.1]]) {
      const a = -Math.PI / 2 + Math.sin(t * 0.55 + ph) * 0.42, L = 1300, sp = 0.06;
      const gr = ctx.createLinearGradient(bx, 860, bx + Math.cos(a) * L, 860 + Math.sin(a) * L);
      gr.addColorStop(0, rgba('#8CAAF7', 0.28)); gr.addColorStop(1, rgba('#8CAAF7', 0));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(bx - 10, 860); ctx.lineTo(bx + Math.cos(a - sp) * L, 860 + Math.sin(a - sp) * L);
      ctx.lineTo(bx + Math.cos(a + sp) * L, 860 + Math.sin(a + sp) * L); ctx.lineTo(bx + 10, 860); ctx.fill();
    }
    ctx.restore();
  }
  // ---------------- campus blocks ----------------
  applyCam(ctx, cam, 0.85, sh);
  const light = [1, -0.55];
  const rimCol = mixColor('#FFC48A', '#6F7DF0', night);
  for (const b of CAMPUS.blocks) drawBlock(ctx, b, t, night, rimCol, light, o);
  // forecourt trees in front of the blocks
  for (const [tx, ts] of [[180, 1.1], [420, 0.9], [640, 1.0], [960, 0.85], [1150, 1.05], [1420, 0.95], [1700, 1.1]]) drawTree(ctx, tx, CAMPUS.ground + 10, ts, night, t);

  // ---------------- road + sidewalk (main plane) ----------------
  applyCam(ctx, cam, 1, sh);
  rrect(ctx, -1200, CAMPUS.ground - 4, 4400, 1000, 0, mixColor('#4A2F86', '#120C40', night));
  rrect(ctx, -1200, 915, 4400, 80, 0, mixColor('#2B1D5E', '#0B0830', night));
  for (let x = -1200 + ((t * 0) % 120); x < 3200; x += 120) rrect(ctx, x, 952, 60, 6, 3, rgba('#FFD244', 0.7));
  // cars on NH-2 (secondary motion)
  const cr = rng(31);
  for (let k = 0; k < 6; k++) {
    const dir = k % 2 ? 1 : -1, sp = 180 + cr() * 140, ph = cr() * 3000;
    const x = dir > 0 ? ((t * sp + ph) % 3000) - 600 : 2400 - ((t * sp + ph) % 3000);
    const y = dir > 0 ? 968 : 934, col = [PAL.pink, PAL.teal, PAL.yellow, '#FFFFFF', PAL.orange, PAL.sky][k];
    drawCar(ctx, x, y, dir, col, night);
  }
  rrect(ctx, -1200, 995, 4400, 2400, 0, mixColor('#3A2775', '#100B3A', night));
  line(ctx, -1200, 995, 3200, 995, 4, mixColor('#7B5BC8', '#2A2280', night), 'butt');
  // lamp posts
  for (const lx of [-120, 520, 1100, 1800]) drawLamp(ctx, lx, 995, night);
  if (o.actors) o.actors(ctx);
  // foreground foliage framing (parallax > 1)
  applyCam(ctx, cam, 1.35, sh);
  if (!V) for (const [fx, fy, fr] of [[-120, 1080, 190], [60, 1150, 150], [2020, 1100, 200]]) {
    const leaf = pCircle(fx, fy, fr);
    shapeFill(ctx, leaf, mixColor('#2A1458', '#070522', night), { rim: mixColor('#7A3AA8', '#1C1660', night), r: 6, light: [1, -0.6] });
  }
}

function drawBlock(ctx, b, t, night, rimCol, light, o) {
  const g = CAMPUS.ground, h = g - b.top, fh = h / (b.floors + 0.6);
  const front = pRect(b.x, b.top, b.w, h + 6, 4);
  const faceA = mixColor('#F3EEFA', '#2B2470', night), faceB = mixColor('#D9CDEB', '#1E1A5C', night);
  const grad = ctx.createLinearGradient(0, b.top, 0, g);
  grad.addColorStop(0, faceA); grad.addColorStop(1, faceB);
  shapeFill(ctx, front, grad, { rim: rimCol, r: 7, light, shadow: rgba('#2A1A6B', 0.18), s: 26 });
  // parapet + rooftop
  shapeFill(ctx, pRect(b.x - 6, b.top - 14, b.w + 12, 18, 3), mixColor('#E7DDF4', '#26205F', night), { rim: rimCol, r: 3, light });
  // solar panels on the roof
  for (let x = b.x + 16; x < b.x + b.w - 50; x += 46) {
    ctx.fillStyle = mixColor('#2E3B9E', '#151A58', night);
    ctx.beginPath(); ctx.moveTo(x, b.top - 14); ctx.lineTo(x + 8, b.top - 34); ctx.lineTo(x + 44, b.top - 34); ctx.lineTo(x + 36, b.top - 14); ctx.fill();
  }
  // red rooftop sign
  if (b.sign) {
    ctx.save(); ctx.font = '900 34px Montserrat'; if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
    const sw = ctx.measureText(b.sign).width + 30, sx = b.x + b.w - sw - 14;
    line(ctx, sx + 14, b.top - 14, sx + 14, b.top - 40, 4, '#7A1F2B'); line(ctx, sx + sw - 14, b.top - 14, sx + sw - 14, b.top - 40, 4, '#7A1F2B');
    ctx.fillStyle = '#E8343F'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    if (night > 0.3) { ctx.shadowColor = '#FF4D5A'; ctx.shadowBlur = 18 * night; }
    ctx.fillText(b.sign, sx + 15, b.top - 36);
    ctx.restore();
  }
  // floors + window grid
  const cols = b.cols, cw = (b.w - 40) / cols;
  let wi = Math.floor(b.x);
  for (let f = 0; f < b.floors; f++) {
    const y = b.top + 18 + f * fh;
    line(ctx, b.x + 4, y + fh - 6, b.x + b.w - 4, y + fh - 6, 2, mixColor('#CFC3E4', '#1A1650', night), 'butt');
    for (let c = 0; c < cols; c++) {
      if (b.entrance && f === b.floors - 1 && c > 1 && c < cols - 2) continue;
      const x = b.x + 22 + c * cw, ww = cw - 14, wh = fh * 0.5;
      const lit = night > 0.1 && LIT[(wi++) % 400] > 0.45;
      const glass = lit ? mixColor('#3B3F9E', '#FFD27A', night * (0.7 + 0.3 * Math.sin(t * 0.7 + c + f))) : mixColor('#4A4FB0', '#0E1450', night);
      rrect(ctx, x, y + fh * 0.18, ww, wh, 3, glass);
      if (!lit) rrect(ctx, x, y + fh * 0.18, ww, wh * 0.28, 3, rgba('#FFFFFF', 0.12 * (1 - night)));
    }
  }
  // glass entrance with canopy (central block)
  if (b.entrance) {
    const ex = b.x + b.w * 0.25, ew = b.w * 0.5;
    rrect(ctx, ex, g - fh * 1.05, ew, fh * 1.05, 4, mixColor('#3FB6D0', '#1A4E8E', night));
    for (let k = 1; k < 5; k++) line(ctx, ex + k * ew / 5, g - fh * 1.05, ex + k * ew / 5, g, 3, mixColor('#E9F6FF', '#2A3A9E', night), 'butt');
    shapeFill(ctx, pRect(ex - 30, g - fh * 1.15, ew + 60, 16, 4), mixColor('#FFFFFF', '#3A3490', night), { rim: rimCol, r: 3, light });
    if (night > 0.2) glow(ctx, ex + ew / 2, g - fh * 0.5, 160, PAL.yellow, 0.35 * night);
  }
  // event banners hanging on the facade
  if (o.banners && b.entrance) {
    for (const bx of [b.x + 26, b.x + b.w - 26 - 64]) {
      const drop = E.outBack(clamp(o.banners), 1.2);
      ctx.save(); ctx.beginPath(); ctx.rect(bx - 4, b.top + 10, 72, 420 * drop + 4); ctx.clip();
      shapeFill(ctx, pRect(bx, b.top + 10, 64, 420, 6), PAL.royal, { rim: '#8CAAF7', r: 3, light });
      ctx.save(); ctx.translate(bx + 32, b.top + 220); ctx.rotate(-Math.PI / 2);
      ctx.font = '900 30px Montserrat'; if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
      ctx.fillStyle = PAL.yellow; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('HERITAGE MUN 2026', 0, 0);
      ctx.restore(); ctx.restore();
    }
  }
}

function drawTree(ctx, x, base, s, night, t) {
  ctx.save(); ctx.translate(x, base); ctx.scale(s, s);
  rrect(ctx, -7, -70, 14, 70, 5, mixColor('#5A3A2A', '#1A1030', night));
  const sway = Math.sin(t * 0.9 + x) * 2;
  const crown = new Path2D();
  for (const [cx, cy, r] of [[-30, -92, 42], [24, -98, 46], [0, -132, 48], [-6, -78, 40]]) crown.addPath(pCircle(cx + sway, cy, r));
  shapeFill(ctx, crown, mixColor('#2E9E6E', '#10363A', night), { rim: mixColor('#B8F27A', '#3D6FB0', night), r: 6, light: [1, -0.6], shadow: rgba('#0B2A3A', 0.35), s: 16 });
  ctx.restore();
}
function drawLamp(ctx, x, base, night) {
  rrect(ctx, x - 5, base - 300, 10, 300, 4, mixColor('#3A2775', '#1A1450', night));
  line(ctx, x, base - 296, x + 70, base - 300, 7, mixColor('#3A2775', '#1A1450', night));
  shapeFill(ctx, pRect(x + 50, base - 304, 48, 14, 7), mixColor('#52409A', '#2A2275', night), {});
  if (night > 0.05) {
    glow(ctx, x + 74, base - 290, 120, PAL.yellow, 0.6 * night);
    ctx.save(); ctx.globalAlpha = 0.16 * night; ctx.fillStyle = PAL.yellow;
    ctx.beginPath(); ctx.moveTo(x + 56, base - 292); ctx.lineTo(x + 92, base - 292); ctx.lineTo(x + 170, base); ctx.lineTo(x - 22, base); ctx.fill(); ctx.restore();
  }
}
function drawCar(ctx, x, y, dir, col, night) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  shapeFill(ctx, pRect(-46, -26, 92, 22, 9), col, { rim: '#FFFFFF', r: 2, light: [0.3, -1] });
  shapeFill(ctx, pRect(-24, -40, 46, 18, 8), col, {});
  rrect(ctx, -18, -36, 16, 12, 3, mixColor('#9FD8FF', '#2A3A8E', night)); rrect(ctx, 2, -36, 16, 12, 3, mixColor('#9FD8FF', '#2A3A8E', night));
  circle(ctx, -28, -4, 9, '#1A1440'); circle(ctx, 28, -4, 9, '#1A1440');
  if (night > 0.1) { glow(ctx, 46, -16, 60, PAL.yellow, 0.7 * night); glow(ctx, -46, -16, 30, '#FF3B5C', 0.6 * night); }
  ctx.restore();
}

// ============================== TITLE STAGE ==============================
const DUST = (() => { const r = rng(5); return Array.from({ length: 90 }, () => ({ x: r() * 2200 - 140, y: r() * 1200, s: 1 + r() * 3, sp: 6 + r() * 20, ph: r() * TAU })); })();
function drawStage(ctx, cam, t, o = {}) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createRadialGradient(W / 2, H * 0.44, 40, W / 2, H / 2, Math.max(W, H) * 1.1);
  g.addColorStop(0, o.c0 || '#2A3BC8'); g.addColorStop(0.45, o.c1 || '#14197A'); g.addColorStop(1, o.c2 || '#070A33');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  applyCam(ctx, cam, 0.3);
  // slow rotating light rays
  ctx.save(); ctx.translate(960, 460); ctx.rotate(t * 0.05);
  for (let k = 0; k < 14; k++) {
    ctx.rotate(TAU / 14);
    ctx.fillStyle = rgba('#FFFFFF', 0.035);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1600, -120); ctx.lineTo(1600, 120); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  applyCam(ctx, cam, 0.7);
  for (const d of DUST) {
    const y = ((d.y - t * d.sp) % 1200 + 1200) % 1200 - 60;
    glow(ctx, d.x + Math.sin(t * 0.6 + d.ph) * 14, y, d.s * 6, o.dust || PAL.sky, 0.35);
  }
}

// ============================== UNSC CHAMBER ==============================
function horseshoe(cx, cy, ro, ri, a0, a1) {
  const p = new Path2D();
  p.ellipse(cx, cy, ro[0], ro[1], 0, a0, a1, false);
  p.ellipse(cx, cy, ri[0], ri[1], 0, a1, a0, true);
  p.closePath(); return p;
}
function drawUNSC(ctx, cam, t, o = {}) {
  const sh = o.shake || [0, 0];
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0B1660'); g.addColorStop(1, '#1D2FA6');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // back wall pilasters + mural (doves of peace over a rising sun)
  applyCam(ctx, cam, 0.55, sh);
  for (let x = -600; x < 2600; x += 180) shapeFill(ctx, pRect(x, -200, 120, 900, 8), '#14228A', { rim: '#2C44C8', r: 3, light: [1, -0.4] });
  const mural = pRect(130, 120, 800, 330, 24);
  ctx.save(); ctx.clip(mural);
  const mg = ctx.createLinearGradient(0, 120, 0, 450); mg.addColorStop(0, '#FF9A3D'); mg.addColorStop(1, '#ED4BA4');
  ctx.fillStyle = mg; ctx.fillRect(130, 120, 800, 330);
  circle(ctx, 530, 470, 170, '#FFD244');
  for (let k = 0; k < 9; k++) { ctx.save(); ctx.translate(530, 470); ctx.rotate(-Math.PI + k * Math.PI / 8 + 0.0); ctx.fillStyle = rgba('#FFF2C2', 0.35); ctx.fillRect(180, -6, 200, 12); ctx.restore(); }
  for (const [dx, dy, ds, ph] of [[300, 230, 1, 0], [720, 200, 0.8, 1.3], [560, 170, 0.6, 2.2]]) dove(ctx, dx + Math.sin(t + ph) * 6, dy + Math.cos(t * 1.3 + ph) * 4, ds, t + ph);
  ctx.restore();
  ctx.lineWidth = 10; ctx.strokeStyle = '#FFD244'; ctx.stroke(mural);
  // ceiling lights
  for (let x = -200; x < 2200; x += 160) glow(ctx, x, 40, 70, '#BFD0FF', 0.5);

  // floor
  applyCam(ctx, cam, 1, sh);
  rrect(ctx, -1000, 560, 4000, 900, 0, '#101B78');
  for (let k = 0; k < 14; k++) { ctx.beginPath(); ctx.ellipse(530, 760, 120 + k * 90, 40 + k * 30, 0, 0, TAU); ctx.lineWidth = 2; ctx.strokeStyle = rgba('#2C44C8', 0.35); ctx.stroke(); }
  // horseshoe table
  const cx = 530, cy = 720, RO = [400, 150], RI = [300, 96], a0 = Math.PI * 0.88, a1 = Math.PI * 2.12;
  // seated delegates behind the back arc (drawn first, the table hides their legs)
  const seats = [];
  for (let k = 0; k < 9; k++) {
    const a = lerp(Math.PI * 1.08, Math.PI * 1.92, k / 8);
    seats.push([cx + Math.cos(a) * RO[0] * 1.02, cy + Math.sin(a) * RO[1] * 1.02 + 34, a]);
  }
  const cols = ['pink', 'yellow', 'purple', 'orange', 'sky', 'green', 'pink', 'yellow', 'purple'];
  seats.forEach(([x, y, a], k) => {
    shapeFill(ctx, pRect(x - 30, y - 128, 60, 80, 14), '#2238B8', { rim: '#4F6BFF', r: 3, light: [1, -0.5] });
    drawBird(ctx, { x, y: y + 6, s: 0.62, col: cols[k], costume: 'blazer', flip: x < cx ? 1 : -1, look: [x < cx ? 0.6 : -0.6, 0.3], blink: blinkAt(t, 40 + k),
      head: Math.sin(t * 1.2 + k) * 0.05, light: { dir: [0.8, -0.6], rim: '#BFD0FF', r: 3, s: 10 }, hideLegs: true });
  });
  // table: inner front face of the back arc, then the top band, then arm end caps
  const th = 30;
  const face = new Path2D();
  face.ellipse(cx, cy, RI[0], RI[1], 0, Math.PI, TAU, false);
  face.ellipse(cx, cy + th, RI[0], RI[1], 0, TAU, Math.PI, true); face.closePath();
  ctx.fillStyle = '#B07A4A'; ctx.fill(face);
  // outer faces of the two front arms — separate paths so no stray edge joins them
  for (const [b0, b1] of [[a0, Math.PI], [0, a1 - TAU]]) {
    const f = new Path2D();
    f.ellipse(cx, cy, RO[0], RO[1], 0, b0, b1, false); f.ellipse(cx, cy + th, RO[0], RO[1], 0, b1, b0, true); f.closePath();
    ctx.fillStyle = '#9A6438'; ctx.fill(f);
  }
  const top = horseshoe(cx, cy, RO, RI, a0, a1);
  shapeFill(ctx, top, '#F1D6A0', { rim: '#FFF4DA', r: 3, light: [0, -1] });
  for (const a of [a0, a1]) {
    const po = [cx + Math.cos(a) * RO[0], cy + Math.sin(a) * RO[1]], pi = [cx + Math.cos(a) * RI[0], cy + Math.sin(a) * RI[1]];
    ctx.fillStyle = '#C48A55'; ctx.fill(pPoly([po, pi, [pi[0], pi[1] + th], [po[0], po[1] + th]]));
  }
  // name placards on the table
  seats.forEach(([x, y, a], k) => {
    const px = cx + Math.cos(a) * (RO[0] + RI[0]) / 2, py = cy + Math.sin(a) * (RO[1] + RI[1]) / 2;
    shapeFill(ctx, pRect(px - 22, py - 18, 44, 18, 3), '#FFFFFF', { shadow: 'rgba(9,14,60,0.25)', s: 3 });
    rrect(ctx, px - 22, py - 18, 44, 5, [3, 3, 0, 0], [PAL.pink, PAL.yellow, PAL.teal, PAL.orange, PAL.sky][k % 5]);
  });
  if (o.actors) o.actors(ctx);
}
function dove(ctx, x, y, s, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const f = Math.sin(t * 5) * 0.4;
  ctx.fillStyle = '#FFFFFF';
  ctx.fill(pEllipse(0, 0, 34, 15, -0.1));
  ctx.save(); ctx.rotate(-0.6 + f); ctx.fill(pEllipse(-6, -24, 12, 28, 0.5)); ctx.restore();
  ctx.fill(pCircle(30, -8, 11));
  ctx.fillStyle = PAL.orange; ctx.fill(pPoly([[40, -10], [52, -6], [40, -3]]));
  ctx.fillStyle = '#FFFFFF'; ctx.fill(pPoly([[-30, -4], [-56, -16], [-52, 8]]));
  ctx.restore();
}

// ============================== UNGA HALL ==============================
function drawUNGA(ctx, cam, t, o = {}) {
  const sh = o.shake || [0, 0];
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#1B0F4E'; ctx.fillRect(0, 0, W, H);
  applyCam(ctx, cam, 0.5, sh);
  // golden wall with vertical ribs
  const wall = pRect(-400, -200, 2600, 900, 0);
  const wg = ctx.createLinearGradient(0, -200, 0, 700); wg.addColorStop(0, '#FFD244'); wg.addColorStop(1, '#C9861C');
  ctx.fillStyle = wg; ctx.fill(wall);
  for (let x = -400; x < 2200; x += 64) shapeFill(ctx, pRect(x, -200, 40, 900, 0), rgba('#E09A1E', 0.55), {});
  // sunburst medallion
  ctx.save(); ctx.translate(520, 250);
  for (let k = 0; k < 32; k++) { ctx.rotate(TAU / 32); ctx.fillStyle = rgba('#FFF2C2', k % 2 ? 0.35 : 0.15); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(260, -16); ctx.lineTo(260, 16); ctx.fill(); }
  ctx.restore();
  const med = pCircle(520, 250, 130);
  shapeFill(ctx, med, '#FFE38A', { rim: '#FFFFFF', r: 6, light: [0.6, -0.8], shadow: rgba('#A86A0A', 0.35), s: 22 });
  ctx.lineWidth = 8; ctx.strokeStyle = '#E0A51C'; ctx.beginPath(); ctx.arc(520, 250, 96, 0, TAU); ctx.stroke();
  circle(ctx, 520, 250, 50, '#E0A51C');
  // rostrum (green marble tiers)
  applyCam(ctx, cam, 0.8, sh);
  shapeFill(ctx, pRect(150, 560, 740, 70, 10), '#1F6E5A', { rim: '#4FD6A4', r: 4, light: [0, -1] });
  shapeFill(ctx, pRect(80, 620, 880, 90, 10), '#175647', { rim: '#3FB98A', r: 4, light: [0, -1] });
  if (o.speaker) o.speaker(ctx);
  // lectern
  shapeFill(ctx, pPoly([[440, 470], [600, 470], [585, 600], [455, 600]]), '#2A8E6E', { rim: '#7CF2BE', r: 4, light: [0.7, -0.7], shadow: rgba('#0B2A20', 0.35), s: 18 });
  rrect(ctx, 430, 462, 180, 16, 6, '#3FB98A');
  // delegate rows (foreground)
  applyCam(ctx, cam, 1, sh);
  const cols = ['pink', 'yellow', 'orange', 'purple', 'sky', 'green', 'teal'];
  for (let row = 0; row < 3; row++) {
    const y = 820 + row * 120, s = 0.78 + row * 0.12;
    for (let k = 0; k < 9; k++) {
      const x = -60 + k * (150 + row * 18) + (row % 2) * 70;
      if (x > 1150) continue;
      drawBird(ctx, { x, y: y + 20, s, col: cols[(k + row * 3) % cols.length], costume: 'blazer', flip: x < 520 ? 1 : -1, look: [x < 520 ? 0.7 : -0.7, -0.3],
        blink: blinkAt(t, 60 + k + row * 9), head: Math.sin(t + k + row) * 0.04, light: { dir: [0.4, -1], rim: '#FFE38A', r: 3, s: 10 }, hideLegs: true });
    }
    shapeFill(ctx, pRect(-400, y + 2, 2400, 70, 12), '#3A1C7E', { rim: '#7B4FD6', r: 4, light: [0, -1] });
  }
}

// ============================== WHO ==============================
const VIRUSES = (() => { const r = rng(17); return Array.from({ length: 9 }, (_, i) => ({ a: (i / 9) * TAU + r() * 0.3, d: 400 + r() * 70, s: 22 + r() * 16, ph: r() * TAU })); })();
function drawGlobe(ctx, x, y, R, t) {
  const globe = pCircle(x, y, R);
  const gg = ctx.createLinearGradient(x - R, y - R, x + R, y + R); gg.addColorStop(0, '#33B9D7'); gg.addColorStop(1, '#1B3FC8');
  ctx.fillStyle = gg; ctx.fill(globe);
  ctx.save(); ctx.clip(globe);
  ctx.lineWidth = Math.max(2, R / 50); ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  for (const ry of [0.32, 0.66]) { ctx.beginPath(); ctx.ellipse(x, y, R, R * ry, 0, 0, TAU); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(x - R, y); ctx.lineTo(x + R, y); ctx.stroke();
  const rot = (t * 0.06) % 1;
  for (let k = 0; k < 6; k++) { const u = ((k / 6 + rot) % 1) * 2 - 1; ctx.beginPath(); ctx.ellipse(x, y, Math.abs(u) * R, R, 0, 0, TAU); ctx.stroke(); }
  ctx.fillStyle = 'rgba(61,220,151,0.9)';
  for (const [cx, cy, rx, ry] of [[-0.25, -0.35, 0.32, 0.22], [0.35, 0.05, 0.25, 0.38], [-0.45, 0.35, 0.22, 0.17], [0.6, -0.5, 0.2, 0.13], [-0.05, 0.6, 0.18, 0.12]]) {
    const xx = (((cx + rot * 2.2 + 3) % 2.6) - 1.3) * R + x, yy = cy * R + y;
    ctx.fill(pBlob([[xx - rx * R, yy], [xx - rx * R * 0.3, yy - ry * R], [xx + rx * R, yy - ry * R * 0.5], [xx + rx * R * 0.7, yy + ry * R * 0.6], [xx, yy + ry * R]]));
  }
  ctx.restore();
  crescent(ctx, globe, -0.6 * R * 0.05, 0.8 * R * 0.05, 'rgba(255,255,255,0.6)');
  crescent(ctx, globe, 0.6 * R * 0.2, -0.8 * R * 0.2, 'rgba(6,20,60,0.32)');
}
function drawWHO(ctx, cam, t, o = {}) {
  const sh = o.shake || [0, 0];
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createRadialGradient(520, 520, 60, 600, 540, 1300); g.addColorStop(0, '#0E6C7E'); g.addColorStop(0.5, '#0A3A5E'); g.addColorStop(1, '#061A3A');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  applyCam(ctx, cam, 0.4, sh);
  // hex grid
  ctx.lineWidth = 1.5; ctx.strokeStyle = rgba('#22D7DA', 0.12);
  for (let row = -2; row < 16; row++) for (let col = -3; col < 26; col++) {
    const hx = col * 90 + (row % 2) * 45, hy = row * 78;
    ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + Math.PI / 6; ctx.lineTo(hx + Math.cos(a) * 44, hy + Math.sin(a) * 44); } ctx.closePath(); ctx.stroke();
  }
  applyCam(ctx, cam, 1, sh);
  const gx = 470, gy = 500, R = 220;
  // shield bubble
  const pul = 0.5 + 0.5 * Math.sin(t * 3);
  glow(ctx, gx, gy, 420, PAL.teal, 0.18 + 0.08 * pul);
  ctx.beginPath(); ctx.arc(gx, gy, 300, 0, TAU); ctx.lineWidth = 6; ctx.strokeStyle = rgba('#7FF3F5', 0.65 + 0.2 * pul); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(gx, gy, 300, 0, TAU); ctx.clip();
  ctx.lineWidth = 1.5; ctx.strokeStyle = rgba('#7FF3F5', 0.18);
  for (let row = -5; row < 6; row++) for (let col = -5; col < 6; col++) {
    const hx = gx + col * 60 + (row % 2) * 30, hy = gy + row * 52;
    ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + Math.PI / 6; ctx.lineTo(hx + Math.cos(a) * 29, hy + Math.sin(a) * 29); } ctx.closePath(); ctx.stroke();
  }
  ctx.restore();
  drawGlobe(ctx, gx, gy, R, t);
  // viruses press in and bounce off the shield
  for (const v of VIRUSES) {
    const bob = Math.abs(Math.sin(t * 1.6 + v.ph));
    const d = lerp(v.d, 336 + v.s, E.outQ(bob));
    const vx = gx + Math.cos(v.a + t * 0.08) * d, vy = gy + Math.sin(v.a + t * 0.08) * d;
    if (vx > 1000) continue;
    virus(ctx, vx, vy, v.s, t + v.ph);
    if (bob > 0.95) glow(ctx, gx + Math.cos(v.a + t * 0.08) * 300, gy + Math.sin(v.a + t * 0.08) * 300, 50, PAL.teal, (bob - 0.95) * 14);
  }
  // ECG line
  ctx.save(); ctx.beginPath();
  for (let x = -100; x <= 1100; x += 4) {
    const u = ((x - t * 420) % 600 + 600) % 600;
    let y = 905;
    if (u > 260 && u < 340) { const k = (u - 260) / 80; y -= Math.sin(k * Math.PI) * (k < 0.5 ? 70 : -30) * (k > 0.3 && k < 0.7 ? 1.6 : 0.4); }
    x === -100 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.lineWidth = 5; ctx.strokeStyle = rgba('#7FF3F5', 0.9); ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
  if (o.actors) o.actors(ctx);
}

// ============================== LOK SABHA ==============================
function drawLok(ctx, cam, t, o = {}) {
  const sh = o.shake || [0, 0];
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#062A20'); g.addColorStop(1, '#0F5A40');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // peacock-feather motif on the upper walls (the new Lok Sabha chamber's theme)
  applyCam(ctx, cam, 0.45, sh);
  for (let row = 0; row < 5; row++) for (let col = -4; col < 26; col++) {
    const x = col * 96 + (row % 2) * 48, y = 40 + row * 90;
    ctx.fillStyle = rgba('#1F9E68', 0.35); ctx.fill(pEllipse(x, y, 22, 38));
    ctx.fillStyle = rgba('#FFD244', 0.28); ctx.fill(pEllipse(x, y - 10, 12, 14));
    ctx.fillStyle = rgba('#22D7DA', 0.35); ctx.fill(pEllipse(x, y - 9, 8, 9));
  }
  // gold arch behind the Speaker
  applyCam(ctx, cam, 0.75, sh);
  ctx.lineWidth = 16; ctx.strokeStyle = '#E0A51C'; ctx.beginPath(); ctx.arc(520, 640, 360, Math.PI, TAU); ctx.stroke();
  ctx.lineWidth = 5; ctx.strokeStyle = '#FFD244'; ctx.beginPath(); ctx.arc(520, 640, 384, Math.PI, TAU); ctx.stroke();
  // Speaker's dais
  shapeFill(ctx, pRect(250, 640, 540, 70, 10), '#5A2E1A', { rim: '#E0A51C', r: 4, light: [0, -1] });
  shapeFill(ctx, pRect(180, 700, 680, 70, 10), '#4A2414', { rim: '#C98A2A', r: 4, light: [0, -1] });
  if (o.speaker) o.speaker(ctx);
  // curved green benches with delegates
  applyCam(ctx, cam, 1, sh);
  const cx = 520, cy = 1320;
  const cols = ['yellow', 'pink', 'orange', 'purple', 'sky', 'teal', 'green'];
  for (let row = 0; row < 3; row++) {
    const R = 430 + row * 150;
    const n = 7 + row * 2;
    for (let k = 0; k < n; k++) {
      const a = lerp(Math.PI * 1.14, Math.PI * 1.86, k / (n - 1));
      const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * 0.8 + 6;
      if (x > 1100 || x < -150) continue;
      drawBird(ctx, { x, y, s: 0.7 + row * 0.1, col: cols[(k + row * 2) % cols.length], costume: 'blazer', flip: x < cx ? 1 : -1, look: [x < cx ? 0.6 : -0.6, -0.4],
        blink: blinkAt(t, 80 + k + row * 11), head: Math.sin(t * 1.1 + k) * 0.05, light: { dir: [0.3, -1], rim: '#B8F7D6', r: 3, s: 10 }, hideLegs: true });
    }
    const bench = new Path2D();
    bench.ellipse(cx, cy, R + 60, (R + 60) * 0.8, 0, Math.PI * 1.08, Math.PI * 1.92, false);
    bench.ellipse(cx, cy, R - 10, (R - 10) * 0.8, 0, Math.PI * 1.92, Math.PI * 1.08, true); bench.closePath();
    shapeFill(ctx, bench, '#1F8A5B', { rim: '#7CF2BE', r: 4, light: [0, -1], shadow: rgba('#06301F', 0.4), s: 16 });
  }
  if (o.actors) o.actors(ctx);
}

// ============================== FREE PASS BACKDROP ==============================
const CONFETTI = (() => { const r = rng(23); return Array.from({ length: 120 }, () => ({ x: r() * 2000 - 40, y: r() * 1400, sp: 120 + r() * 220, rot: r() * TAU, vr: (r() - 0.5) * 8, w: 8 + r() * 10, c: [PAL.yellow, PAL.teal, PAL.white, PAL.royal, PAL.pink][Math.floor(r() * 5)] })); })();
function drawCelebration(ctx, cam, t, o = {}) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = V ? ctx.createRadialGradient(540, 880, 50, 540, 960, 1500) : ctx.createRadialGradient(700, 520, 50, 900, 540, 1400); g.addColorStop(0, '#FFC04A'); g.addColorStop(0.45, '#FF7A2E'); g.addColorStop(1, '#D9358F');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  applyCam(ctx, cam, 0.3);
  ctx.save(); ctx.translate(700, 520); ctx.rotate(t * 0.12);
  for (let k = 0; k < 18; k++) { ctx.rotate(TAU / 18); ctx.fillStyle = rgba('#FFF2C2', 0.09); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1800, -150); ctx.lineTo(1800, 150); ctx.fill(); }
  ctx.restore();
  if (o.actors) o.actors(ctx);
  if (o.confetti > 0) {
    applyCam(ctx, cam, 1.2);
    const ct = o.confetti;
    for (const c of CONFETTI) {
      const y = c.y - 600 + ct * c.sp, x = c.x + Math.sin(ct * 2 + c.rot) * 30;
      if (y < -40 || y > 1200) continue;
      ctx.save(); ctx.translate(x, y); ctx.rotate(c.rot + ct * c.vr); ctx.scale(1, Math.cos(ct * 6 + c.rot));
      ctx.fillStyle = c.c; ctx.fillRect(-c.w / 2, -c.w * 0.3, c.w, c.w * 0.6); ctx.restore();
    }
  }
}
