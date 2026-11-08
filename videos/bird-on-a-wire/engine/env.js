// Illustrated environments. Each is layered (background / midground /
// foreground) and drawn through the camera with per-layer parallax depth.

// ======================= DUSK POWER-LINE WORLD (side view) =======================
const DUSK = {
  poleX: 300, ground: 1000,
  wires: [
    { x0: 446, y0: 262, x1: 2860, sag: 64 },   // A (upper phase)
    { x0: 446, y0: 482, x1: 2860, sag: 72 },   // B (Pip's wire)
    { x0: 330, y0: 712, x1: 2860, sag: 70 },   // C (neutral)
  ],
};
const STARS = (() => { const r = rng(11); return Array.from({ length: 170 }, () => ({ x: r() * 2400 - 240, y: r() * 760, s: 0.8 + r() * 2.2, ph: r() * TAU, f: 0.6 + r() * 1.8 })); })();
const MOTES = (() => { const r = rng(21); return Array.from({ length: 46 }, () => ({ x: r() * 2600 - 300, y: 200 + r() * 860, s: 2 + r() * 4, ph: r() * TAU, sp: 8 + r() * 22, c: r() < 0.6 ? PAL.teal : PAL.yellow })); })();
const HOUSES = (() => { const r = rng(5); return Array.from({ length: 11 }, (_, i) => ({ x: -350 + i * 270 + r() * 120, w: 46 + r() * 40, h: 34 + r() * 26, lit: r() })); })();

// base catenary-ish sag + optional local bounce dip (bx = x of the disturbance)
function wireY(i, x, bounce = 0, bx = 0) {
  const w = DUSK.wires[i];
  const u = clamp((x - w.x0) / (w.x1 - w.x0));
  let y = w.y0 + w.sag * 4 * u * (1 - u) + (x - w.x0) * 0.0;
  if (bounce) y += bounce * Math.exp(-Math.pow((x - bx) / 420, 2)) * Math.min(1, u * 6);
  return y;
}

function hillY(x, base, a1, f1, a2, f2, ph) { return base + a1 * Math.sin(x * f1 + ph) + a2 * Math.sin(x * f2 + ph * 2.3); }

function drawDuskSky(ctx, cam, t, o = {}) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#070E3D'); g.addColorStop(0.45, '#160B57'); g.addColorStop(0.8, '#4A2A93'); g.addColorStop(1, '#7A3AA8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // stars
  applyCam(ctx, cam, 0.04);
  for (const s of STARS) {
    const a = 0.45 + 0.55 * Math.sin(t * s.f + s.ph);
    circle(ctx, s.x, s.y, s.s, rgba('#DDE3FF', 0.35 + 0.5 * a));
    if (s.s > 2.4) glow(ctx, s.x, s.y, s.s * 6, '#8CAAF7', 0.25 * a);
  }
  // moon
  applyCam(ctx, cam, 0.08);
  glow(ctx, 1560, 190, 260, '#6F7DF0', 0.35);
  circle(ctx, 1560, 190, 74, '#ECEBFF');
  circle(ctx, 1536, 172, 14, '#D3D0F6'); circle(ctx, 1584, 214, 19, '#D3D0F6'); circle(ctx, 1590, 160, 8, '#D3D0F6');
}

function drawDuskWorld(ctx, cam, t, o = {}) {
  const sh = o.shake || [0, 0];
  drawDuskSky(ctx, cam, t, o);
  // far hills + village lights
  applyCam(ctx, cam, 0.28, sh);
  ctx.beginPath(); ctx.moveTo(-1400, 1400);
  for (let x = -1400; x <= 3400; x += 40) ctx.lineTo(x, hillY(x, 770, 46, 0.0035, 22, 0.011, 1));
  ctx.lineTo(3400, 1400); ctx.closePath(); ctx.fillStyle = '#231A73'; ctx.fill();
  for (const hs of HOUSES) {
    const y = hillY(hs.x + hs.w / 2, 770, 46, 0.0035, 22, 0.011, 1) + 6;
    rrect(ctx, hs.x, y - hs.h, hs.w, hs.h + 30, 3, '#1A1260');
    poly(ctx, [[hs.x - 6, y - hs.h], [hs.x + hs.w / 2, y - hs.h - 22], [hs.x + hs.w + 6, y - hs.h]], '#1A1260');
    if (hs.lit > 0.25) {
      const flick = 0.85 + 0.15 * Math.sin(t * 2 + hs.x);
      rrect(ctx, hs.x + hs.w * 0.3, y - hs.h * 0.7, 10, 12, 2, rgba(PAL.yellow, flick));
      glow(ctx, hs.x + hs.w * 0.3 + 5, y - hs.h * 0.7 + 6, 26, PAL.orange, 0.5 * flick);
    }
  }
  // mid hills with distant pole line
  applyCam(ctx, cam, 0.55, sh);
  ctx.beginPath(); ctx.moveTo(-1400, 1500);
  for (let x = -1400; x <= 3600; x += 40) ctx.lineTo(x, hillY(x, 880, 34, 0.005, 16, 0.016, 2));
  ctx.lineTo(3600, 1500); ctx.closePath(); ctx.fillStyle = '#17105A'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = '#2E2590';
  let prev = null;
  for (let x = -1300; x <= 3500; x += 420) {
    const gy = hillY(x, 880, 34, 0.005, 16, 0.016, 2);
    line(ctx, x, gy, x, gy - 120, 6, '#120C48');
    line(ctx, x - 26, gy - 110, x + 26, gy - 110, 5, '#120C48');
    if (prev) {
      ctx.beginPath(); ctx.moveTo(prev[0] + 24, prev[1]);
      ctx.quadraticCurveTo((prev[0] + x) / 2, (prev[1] + gy - 110) / 2 + 26, x - 24, gy - 110);
      ctx.lineWidth = 2; ctx.strokeStyle = '#2E2590'; ctx.stroke();
    }
    prev = [x, gy - 110];
  }

  // main plane
  applyCam(ctx, cam, 1, sh);
  // ground
  ctx.beginPath(); ctx.moveTo(-1800, 1700);
  for (let x = -1800; x <= 4200; x += 40) ctx.lineTo(x, DUSK.ground + 10 * Math.sin(x * 0.01));
  ctx.lineTo(4200, 1700); ctx.closePath(); ctx.fillStyle = '#0D0A3C'; ctx.fill();
  const gr = rng(9);
  for (let i = 0; i < 90; i++) {
    const x = -1600 + i * 64 + gr() * 30, y = DUSK.ground + 10 * Math.sin(x * 0.01) + 4;
    const sway = Math.sin(t * 1.4 + x * 0.02) * 4;
    poly(ctx, [[x - 6, y], [x + sway, y - 18 - gr() * 18], [x + 6, y]], '#1C1670');
  }

  drawPoleSide(ctx, DUSK.poleX, t, o);
  drawWires(ctx, t, o);
  if (o.actors) o.actors(ctx);

  // foreground motes + framing grass
  applyCam(ctx, cam, 1.35, sh);
  for (const m of MOTES) {
    const x = m.x + Math.sin(t * 0.5 + m.ph) * 30, y = m.y - ((t * m.sp) % 900) + Math.cos(t * 0.7 + m.ph) * 12;
    const yy = ((y - 150) % 900 + 900) % 900 + 150;
    const a = 0.35 + 0.35 * Math.sin(t * 2 + m.ph);
    glow(ctx, x, yy, m.s * 5, m.c, a * (o.motes ?? 1));
    circle(ctx, x, yy, m.s * 0.5, rgba('#FFFFFF', a * 0.8 * (o.motes ?? 1)));
  }
}

function drawPoleSide(ctx, x, t, o) {
  const top = 180, g = DUSK.ground;
  const bp = o.blueprint;
  if (bp) {
    ctx.lineWidth = 3; ctx.strokeStyle = bp;
    ctx.strokeRect(x - 17, top, 34, g - top);
    ctx.strokeRect(x - 160, 285, 320, 20); ctx.strokeRect(x - 160, 505, 320, 20);
    ctx.strokeRect(x - 10, 712, 40, 14);
    return;
  }
  // pole body with moon rim light
  rrect(ctx, x - 17, top, 34, g - top + 20, 4, '#100C40');
  rrect(ctx, x + 7, top, 8, g - top + 20, 3, '#2C2486');
  for (let y = top + 60; y < g; y += 120) line(ctx, x - 17, y, x + 17, y + 4, 2, '#0A0732');
  // crossarms
  for (const cy of [285, 505]) {
    rrect(ctx, x - 160, cy, 320, 22, 4, '#130F4A');
    rrect(ctx, x - 160, cy, 320, 6, 3, '#2C2486');
    // braces
    line(ctx, x - 110, cy + 20, x, cy + 90, 6, '#0E0A3A'); line(ctx, x + 110, cy + 20, x, cy + 90, 6, '#0E0A3A');
    // insulators at both ends
    for (const ix of [x - 146, x + 146]) drawInsulator(ctx, ix, cy, o.covers);
  }
  // neutral bracket
  rrect(ctx, x - 6, 712, 44, 14, 3, '#130F4A');
  // ground wire running down the pole (grounded hardware)
  line(ctx, x - 24, 525, x - 24, g, 3, o.groundHL ? PAL.yellow : '#2A2275');
  // warning sign
  ctx.save(); ctx.translate(x, 800); ctx.rotate(Math.PI / 4);
  rrect(ctx, -34, -34, 68, 68, 8, PAL.yellow); rrect(ctx, -28, -28, 56, 56, 6, '#FFB21D');
  ctx.restore();
  bolt(ctx, x, 800, 46, PAL.night);
  rrect(ctx, x - 52, 856, 104, 30, 6, PAL.yellow);
  ctx.font = '900 17px Montserrat'; ctx.fillStyle = PAL.night; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '1px';
  ctx.fillText('DANGER', x, 872);
}

function drawInsulator(ctx, x, y, cover) {
  for (let i = 0; i < 3; i++) ellipse(ctx, x, y - 6 - i * 9, 14 - i * 1.5, 5, 0, i % 2 ? '#9FB6FF' : '#7F98F0');
  rrect(ctx, x - 4, y - 32, 8, 30, 3, '#6E86E6');
}

function drawWires(ctx, t, o) {
  DUSK.wires.forEach((w, i) => {
    const bounce = (o.bounce && o.bounce[i]) || 0;
    const bx = o.bounceX || 0;
    ctx.beginPath();
    for (let x = w.x0; x <= w.x1; x += 20) {
      const y = wireY(i, x, bounce, bx);
      x === w.x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    if (o.blueprint) {
      ctx.lineWidth = 3; ctx.strokeStyle = o.wireCol?.[i] || o.blueprint; ctx.stroke();
    } else {
      ctx.lineWidth = 8; ctx.strokeStyle = '#08062A'; ctx.lineCap = 'round'; ctx.stroke();
      ctx.save(); ctx.translate(0, -2.5); ctx.lineWidth = 2; ctx.strokeStyle = '#4038A8'; ctx.stroke(); ctx.restore();
    }
    // flowing energy dashes (stylised current)
    const en = o.energy ?? 0.6;
    if (en > 0) {
      const len = w.x1 - w.x0, sp = 520, gap = 150;
      for (let d = ((t * sp) % gap) - gap; d < len; d += gap) {
        const x = w.x0 + d + i * 37;
        if (x < w.x0 || x > w.x1) continue;
        const y = wireY(i, x, bounce, bx);
        glow(ctx, x, y, 16, PAL.teal, 0.55 * en);
        line(ctx, x - 12, wireY(i, x - 12, bounce, bx), x + 12, wireY(i, x + 12, bounce, bx), 3, rgba('#C8FFFC', 0.8 * en));
      }
    }
  });
}

// ======================= LAB (pressure analogy) =======================
const BUBBLES = (() => { const r = rng(33); return Array.from({ length: 36 }, () => ({ x: r(), sp: 30 + r() * 60, ph: r() * 900, s: 3 + r() * 6 })); })();

function drawLab(ctx, cam, t, st) {
  const sh = st.shake || [0, 0];
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1A2BB8'); g.addColorStop(1, '#2A43E0');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // back wall panels + shelves (parallax 0.5)
  applyCam(ctx, cam, 0.5, sh);
  for (let x = -600; x < 2600; x += 240) {
    rrect(ctx, x + 8, -200, 224, 1060, 10, '#2238C9');
    rrect(ctx, x + 8, -200, 224, 8, 4, '#3350E8');
  }
  // big round porthole window with a starry view
  const WX = 960, WY = 330;
  circle(ctx, WX, WY, 150, '#14209A');
  ctx.save(); ctx.beginPath(); ctx.arc(WX, WY, 132, 0, TAU); ctx.clip();
  const wg = ctx.createLinearGradient(0, WY - 140, 0, WY + 140); wg.addColorStop(0, '#09134B'); wg.addColorStop(1, '#6535A8');
  ctx.fillStyle = wg; ctx.fillRect(WX - 140, WY - 140, 280, 280);
  for (let i = 0; i < 18; i++) circle(ctx, WX - 120 + (i * 61) % 250, WY - 120 + (i * 37) % 230, 1.8, rgba('#FFFFFF', 0.5 + 0.5 * Math.sin(t * 2 + i)));
  ctx.restore();
  ctx.lineWidth = 10; ctx.strokeStyle = '#8CAAF7'; ctx.beginPath(); ctx.arc(WX, WY, 136, 0, TAU); ctx.stroke();
  // shelves with flasks
  for (const [sx, sy] of [[-40, 250], [-40, 440]]) {
    rrect(ctx, sx, sy, 400, 16, 4, '#14209A');
    const cols = [PAL.pink, PAL.yellow, PAL.teal, PAL.orange, PAL.purple];
    for (let k = 0; k < 4; k++) {
      const fx = sx + 50 + k * 95, h = 50 + ((k * 37) % 40);
      rrect(ctx, fx - 18, sy - h, 36, h, 8, rgba('#CFE0FF', 0.35));
      rrect(ctx, fx - 15, sy - h * 0.55, 30, h * 0.55 - 3, 6, cols[k]);
      glow(ctx, fx, sy - h * 0.3, 40, cols[k], 0.25 + 0.15 * Math.sin(t * 3 + k));
    }
  }
  // blinking control panel
  rrect(ctx, 1730, 470, 260, 300, 18, '#14209A');
  for (let k = 0; k < 12; k++) {
    const on = Math.sin(t * (2 + k * 0.7) + k) > 0;
    circle(ctx, 1770 + (k % 4) * 52, 520 + Math.floor(k / 4) * 52, 12, on ? [PAL.pink, PAL.yellow, PAL.teal][k % 3] : '#0D1780');
  }
  // pipes along the wall
  line(ctx, -600, 120, 2600, 120, 26, '#1A2AA8'); line(ctx, -600, 112, 2600, 112, 6, '#3B58F0');

  // floor
  applyCam(ctx, cam, 1, sh);
  rrect(ctx, -1000, 905, 4000, 800, 0, '#16239C');
  for (let x = -1000; x < 3000; x += 160) line(ctx, x, 905, x - 120, 1300, 3, '#1D2CB4');
  line(ctx, -1000, 905, 3000, 905, 8, '#3350E8');

  // ----- the two tanks -----
  const Lh = st.levelL, Rh = st.levelR; // water heights in px
  drawTank(ctx, 600, 300, Lh, t, st.gaugeL, st.labelT, 'HIGH');
  drawTank(ctx, 1320, 300, Rh, t, st.gaugeR, st.labelT, 'LOW');
  // connecting pipe
  const pipeY = 840;
  line(ctx, 600, 760, 600, pipeY, 40, '#7F98F0'); line(ctx, 1320, 760, 1320, pipeY, 40, '#7F98F0');
  line(ctx, 600, pipeY, 1320, pipeY, 40, '#7F98F0');
  line(ctx, 600, pipeY, 1320, pipeY, 26, '#0E1A8A');
  // water + flow particles inside the pipe
  if (st.flow > 0.001 || st.pipeFull) {
    line(ctx, 610, pipeY, 1310, pipeY, 22, rgba(PAL.teal, 0.85));
    const n = 16;
    for (let k = 0; k < n; k++) {
      const u = ((k / n) + st.flowPos) % 1;
      const x = 620 + u * 680;
      circle(ctx, x, pipeY + Math.sin(k * 2.1 + t * 6) * 4, 5, rgba('#FFFFFF', 0.75 * st.flow));
      glow(ctx, x, pipeY, 22, PAL.teal, 0.35 * st.flow);
    }
  }
  // valve
  ctx.save(); ctx.translate(960, pipeY);
  rrect(ctx, -34, -34, 68, 68, 14, PAL.orange);
  ctx.rotate(st.valve * Math.PI / 2);
  rrect(ctx, -54, -9, 108, 18, 9, PAL.yellow);
  circle(ctx, 0, 0, 13, '#D9620A');
  ctx.restore();
  // highlight rings on the two measurement points
  if (st.points > 0) {
    for (const px of [600, 1320]) {
      const r = 40 + 14 * Math.sin(t * 6);
      ctx.beginPath(); ctx.arc(px, pipeY, r, 0, TAU); ctx.lineWidth = 6;
      ctx.strokeStyle = rgba(PAL.yellow, st.points); ctx.stroke();
      glow(ctx, px, pipeY, 70, PAL.yellow, 0.4 * st.points);
    }
  }
  if (st.actors) st.actors(ctx);

  // foreground bubbles
  applyCam(ctx, cam, 1.3, sh);
  for (const b of BUBBLES) {
    const y = 1150 - ((t * b.sp + b.ph) % 1300);
    const x = -100 + b.x * 2120 + Math.sin(t + b.ph) * 18;
    ctx.beginPath(); ctx.arc(x, y, b.s, 0, TAU); ctx.lineWidth = 2; ctx.strokeStyle = rgba('#BFD4FF', 0.45); ctx.stroke();
  }
}

function drawTank(ctx, cx, top, level, t, gauge, labelT, txt) {
  const w = 240, h = 460, base = top + h;
  // stand
  rrect(ctx, cx - 100, base, 200, 905 - base, 8, '#121D8F');
  rrect(ctx, cx - 130, base - 6, 260, 26, 8, '#3350E8');
  // glass
  rrect(ctx, cx - w / 2, top, w, h, 26, rgba('#BFD4FF', 0.18));
  ctx.save(); ctx.beginPath(); ctx.roundRect(cx - w / 2, top, w, h, 26); ctx.clip();
  const wy = base - level;
  const wg = ctx.createLinearGradient(0, wy, 0, base);
  wg.addColorStop(0, '#5BF0F2'); wg.addColorStop(1, '#1597C9');
  ctx.beginPath(); ctx.moveTo(cx - w / 2, base);
  for (let x = cx - w / 2; x <= cx + w / 2; x += 10) ctx.lineTo(x, wy + Math.sin(x * 0.05 + t * 4) * 4);
  ctx.lineTo(cx + w / 2, base); ctx.closePath(); ctx.fillStyle = wg; ctx.fill();
  ctx.restore();
  ctx.lineWidth = 8; ctx.strokeStyle = '#BFD4FF'; ctx.beginPath(); ctx.roundRect(cx - w / 2, top, w, h, 26); ctx.stroke();
  line(ctx, cx - w / 2 + 26, top + 40, cx - w / 2 + 26, top + h - 60, 8, rgba('#FFFFFF', 0.35));
  // pressure gauge on the front
  const gx = cx, gy = top - 70;
  circle(ctx, gx, gy, 54, '#14209A'); circle(ctx, gx, gy, 46, PAL.white);
  for (let k = 0; k <= 8; k++) {
    const a = Math.PI * (0.8 + k * 0.175);
    line(ctx, gx + Math.cos(a) * 34, gy + Math.sin(a) * 34, gx + Math.cos(a) * 42, gy + Math.sin(a) * 42, 3, PAL.night);
  }
  const na = Math.PI * (0.8 + clamp(gauge) * 1.4);
  line(ctx, gx, gy, gx + Math.cos(na) * 36, gy + Math.sin(na) * 36, 6, PAL.pink);
  circle(ctx, gx, gy, 7, PAL.night);
  if (labelT !== undefined && labelT > 0) label(ctx, txt, gx, gy - 92, labelT, { size: 28, bg: PAL.yellow });
}

// ======================= MACRO: INSIDE THE WIRE =======================
const ELECTRONS = (() => { const r = rng(44); return Array.from({ length: 150 }, () => ({ u: r(), y: r() * 2 - 1, sp: 0.18 + r() * 0.14, s: 4 + r() * 5 })); })();
const BOKEH = (() => { const r = rng(55); return Array.from({ length: 26 }, () => ({ x: r() * 2400 - 240, y: r() * 1080, r: 30 + r() * 110, c: [PAL.purple, PAL.royal, PAL.pink, PAL.teal][Math.floor(r() * 4)] })); })();
const MACRO = { wireY: 700, wireR: 105, feet: [700, 1220] };

function drawMacro(ctx, cam, t, st) {
  const sh = st.shake || [0, 0];
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0B1150'); g.addColorStop(1, '#2A1470');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  applyCam(ctx, cam, 0.3, sh);
  for (const b of BOKEH) glow(ctx, b.x + Math.sin(t * 0.3 + b.r) * 20, b.y, b.r, b.c, 0.22);

  applyCam(ctx, cam, 1, sh);
  const wy = MACRO.wireY, R = MACRO.wireR;
  // legs up to the bird body (above frame)
  for (const fx of MACRO.feet) {
    rrect(ctx, fx - 22, -400, 44, wy - R + 420, 22, PIP_COL.beak);
    rrect(ctx, fx - 22, -400, 12, wy - R + 420, 6, rgba('#FFFFFF', 0.18));
  }
  ellipse(ctx, 960, -120, 700, 260, 0, PIP_COL.body);
  ellipse(ctx, 1010, -150, 460, 200, 0, PIP_COL.belly);

  // wire tube: outer strands
  const x0 = -1300, x1 = 3200;
  const tg = ctx.createLinearGradient(0, wy - R, 0, wy + R);
  tg.addColorStop(0, '#C4D3FF'); tg.addColorStop(0.35, '#8CAAF7'); tg.addColorStop(1, '#4A5FC8');
  rrect(ctx, x0, wy - R, x1 - x0, R * 2, R, tg);
  ctx.save(); ctx.beginPath(); ctx.roundRect(x0, wy - R, x1 - x0, R * 2, R); ctx.clip();
  for (let x = x0; x < x1; x += 46) line(ctx, x, wy - R, x + 70, wy + R, 5, rgba('#3E52B8', 0.45));
  // cut-away window showing the moving electrons
  const cw = st.cut ?? 1;
  const cx0 = lerp(960, x0 + 200, cw), cx1 = lerp(960, x1 - 200, cw);
  if (cw > 0.001) {
    rrect(ctx, cx0, wy - R * 0.72, cx1 - cx0, R * 1.44, 30, '#0A0F4A');
    ctx.save(); ctx.beginPath(); ctx.roundRect(cx0, wy - R * 0.72, cx1 - cx0, R * 1.44, 30); ctx.clip();
    const flowAmt = st.flow ?? 1;
    for (const e of ELECTRONS) {
      const u = (e.u + t * e.sp * (st.speed ?? 1)) % 1;
      const x = x0 + u * (x1 - x0), y = wy + e.y * R * 0.55;
      glow(ctx, x, y, e.s * 4, PAL.teal, 0.5 * flowAmt);
      circle(ctx, x, y, e.s * 0.7, rgba('#E6FFFE', flowAmt));
      line(ctx, x - e.s * 5, y, x, y, e.s * 0.6, rgba(PAL.teal, 0.5 * flowAmt));
    }
    ctx.restore();
    ctx.lineWidth = 6; ctx.strokeStyle = '#3E52B8'; ctx.beginPath(); ctx.roundRect(cx0, wy - R * 0.72, cx1 - cx0, R * 1.44, 30); ctx.stroke();
  }
  ctx.restore();

  // toes gripping the top of the wire
  for (const fx of MACRO.feet) {
    for (const d of [-60, -10, 40]) {
      ctx.beginPath(); ctx.arc(fx + d + 10, wy - R + 30, 46, Math.PI * 1.05, Math.PI * 1.75);
      ctx.lineWidth = 30; ctx.strokeStyle = PIP_COL.beak; ctx.lineCap = 'round'; ctx.stroke();
    }
    ellipse(ctx, fx, wy - R - 4, 46, 20, 0, '#E8700F');
  }
  // hard-path squiggle up a leg (resistance)
  if (st.legPath > 0.001) {
    const fx = MACRO.feet[0];
    ctx.save(); ctx.globalAlpha = clamp(st.legPath);
    ctx.beginPath();
    for (let y = wy - R; y > 120; y -= 6) ctx.lineTo(fx + Math.sin(y * 0.11) * 12, y);
    ctx.lineWidth = 5; ctx.strokeStyle = rgba(PAL.pink, 0.9); ctx.setLineDash([10, 9]); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
  if (st.actors) st.actors(ctx);
}

// Analogue voltmeter widget
function drawMeter(ctx, x, y, t, value, txt, opts = {}) {
  const s = spring(t, 2.4, 0.5);
  if (s <= 0.001) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rrect(ctx, -120, -96, 240, 192, 34, rgba(PAL.ink, 0.4));
  rrect(ctx, -120, -104, 240, 192, 34, opts.bg || PAL.white);
  ctx.beginPath(); ctx.arc(0, 30, 84, Math.PI * 1.1, Math.PI * 1.9); ctx.lineWidth = 14; ctx.strokeStyle = '#D7DEFF'; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 30, 84, Math.PI * 1.1, Math.PI * (1.1 + 0.8 * clamp(value))); ctx.lineWidth = 14; ctx.strokeStyle = opts.col || PAL.teal; ctx.stroke();
  const a = Math.PI * (1.1 + 0.8 * clamp(value));
  line(ctx, 0, 30, Math.cos(a) * 70, 30 + Math.sin(a) * 70, 7, PAL.night);
  circle(ctx, 0, 30, 10, PAL.night);
  ctx.font = '900 34px Montserrat'; ctx.fillStyle = PAL.night; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(txt, 0, 64);
  ctx.restore();
}

// ======================= BLUEPRINT (what-if diagram) =======================
function drawBlueprintBG(ctx, cam, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#1B0D5E'; ctx.fillRect(0, 0, W, H);
  applyCam(ctx, cam, 1);
  for (let x = -800; x < 2800; x += 60) line(ctx, x, -400, x, 1500, x % 300 === 0 ? 2 : 1, rgba('#6535A8', x % 300 === 0 ? 0.9 : 0.5), 'butt');
  for (let y = -400; y < 1500; y += 60) line(ctx, -800, y, 2800, y, y % 300 === 0 ? 2 : 1, rgba('#6535A8', y % 300 === 0 ? 0.9 : 0.5), 'butt');
}

// ======================= SUNSET POLE (front view, perspective) =======================
const SUN = { vp: [3300, 840] };
const CLOUDS = [
  { x: 260, y: 230, w: 360, p: 0.12, c: '#F2639B' }, { x: 1180, y: 160, w: 460, p: 0.08, c: '#C64BA8' },
  { x: 1700, y: 330, w: 300, p: 0.15, c: '#FF7A6B' }, { x: 640, y: 420, w: 260, p: 0.2, c: '#FF8E5E' },
];

function sunsetCols(dusk) {
  return {
    top: mixColor('#5B2E9E', '#0B1250', dusk), mid: mixColor('#ED4BA4', '#3A1C7E', dusk),
    low: mixColor('#FF851D', '#8A3A9A', dusk), hor: mixColor('#FFD244', '#FF7A3D', dusk),
  };
}

// st: armHalf (crossarm half width), covers 0..1, perch 0..1, dusk 0..1, sunY, actors, wireGlow
function drawSunset(ctx, cam, t, st) {
  const sh = st.shake || [0, 0];
  const dusk = st.dusk || 0, sc = sunsetCols(dusk);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, sc.top); g.addColorStop(0.42, sc.mid); g.addColorStop(0.68, sc.low); g.addColorStop(0.78, sc.hor);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // stars fade in at dusk
  if (dusk > 0.05) { applyCam(ctx, cam, 0.04); for (const s of STARS) if (s.y < 520) circle(ctx, s.x, s.y, s.s, rgba('#FFFFFF', dusk * 0.6 * (0.5 + 0.5 * Math.sin(t * s.f + s.ph)))); }
  // sun
  applyCam(ctx, cam, 0.06, sh);
  const sy = st.sunY ?? 640;
  glow(ctx, 1240, sy, 520, PAL.orange, 0.55 * (1 - dusk * 0.6));
  glow(ctx, 1240, sy, 260, PAL.yellow, 0.6 * (1 - dusk * 0.5));
  circle(ctx, 1240, sy, 120, mixColor('#FFE27A', '#FF9A3D', dusk));
  // clouds
  for (const c of CLOUDS) {
    applyCam(ctx, cam, c.p, sh);
    const x = c.x + t * 6 * (1 + c.p * 4);
    const col = mixColor(c.c, '#3A1F7A', dusk * 0.8);
    rrect(ctx, x, c.y, c.w, 44, 22, col);
    rrect(ctx, x + c.w * 0.18, c.y - 30, c.w * 0.45, 52, 26, col);
    rrect(ctx, x + c.w * 0.5, c.y - 14, c.w * 0.32, 40, 20, col);
  }
  // hills
  applyCam(ctx, cam, 0.25, sh);
  ctx.beginPath(); ctx.moveTo(-1200, 1500);
  for (let x = -1200; x <= 3200; x += 40) ctx.lineTo(x, hillY(x, 820, 40, 0.004, 18, 0.013, 4));
  ctx.lineTo(3200, 1500); ctx.closePath(); ctx.fillStyle = mixColor('#8E3A8C', '#2A145F', dusk); ctx.fill();
  applyCam(ctx, cam, 0.45, sh);
  ctx.beginPath(); ctx.moveTo(-1200, 1500);
  for (let x = -1200; x <= 3400; x += 40) ctx.lineTo(x, hillY(x, 900, 30, 0.006, 14, 0.019, 1.3));
  ctx.lineTo(3400, 1500); ctx.closePath(); ctx.fillStyle = mixColor('#5E2A7E', '#1B0F4E', dusk); ctx.fill();

  // main plane: pole + perspective wires
  applyCam(ctx, cam, 1, sh);
  const half = st.armHalf ?? 380, armY = 470, poleCol = mixColor('#3A1D5C', '#140C3E', dusk), rim = mixColor('#FF9A4D', '#5B3FB0', dusk);
  const vp = SUN.vp;
  const wireTops = [[960 - half, armY - 34], [960 + half, armY - 34]];
  // distant poles receding to the vanishing point
  for (let k = 1; k <= 7; k++) {
    const f = 1 - Math.pow(0.6, k), sc2 = 1 - f;
    const a = sunsetWirePoint(half, 0, f), b = sunsetWirePoint(half, 1, f);
    const px = (a[0] + b[0]) / 2, ay = (a[1] + b[1]) / 2 + 34 * sc2;
    line(ctx, px, ay - 60 * sc2, px, lerp(1400, vp[1], f), Math.max(1.5, 40 * sc2), poleCol);
    line(ctx, a[0] - 30 * sc2, ay, b[0] + 30 * sc2, ay, Math.max(1.5, 26 * sc2), poleCol);
  }
  // wires: from beyond the camera through each insulator to the vanishing point
  const glowW = st.wireGlow || [0, 0];
  wireTops.forEach((p, i) => {
    ctx.beginPath();
    for (let k = 0; k <= 40; k++) { const q = sunsetWirePoint(half, i, k / 40); k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
    ctx.lineWidth = 7; ctx.strokeStyle = mixColor('#2A1240', '#0A0730', dusk); ctx.lineCap = 'round'; ctx.stroke();
    if (glowW[i] > 0) { ctx.lineWidth = 4; ctx.strokeStyle = rgba(PAL.pink, glowW[i]); ctx.stroke(); }
  });
  // perch post (rises up out of the pole top)
  const perch = st.perch || 0;
  if (perch > 0.001) {
    const ph = 190 * E.outBack(clamp(perch));
    rrect(ctx, 960 - 10, armY - 40 - ph, 20, ph + 20, 4, poleCol);
    rrect(ctx, 960 - 90, armY - 52 - ph, 180, 18, 8, poleCol);
    rrect(ctx, 960 - 90, armY - 52 - ph, 180, 6, 3, rim);
  }
  // pole + crossarm
  rrect(ctx, 960 - 30, armY - 60, 60, 900, 6, poleCol);
  rrect(ctx, 960 + 14, armY - 60, 12, 900, 4, rim);
  rrect(ctx, 960 - half - 40, armY, (half + 40) * 2, 34, 6, poleCol);
  rrect(ctx, 960 - half - 40, armY, (half + 40) * 2, 8, 4, rim);
  line(ctx, 960 - half * 0.55, armY + 30, 960, armY + 160, 10, poleCol); line(ctx, 960 + half * 0.55, armY + 30, 960, armY + 160, 10, poleCol);
  // insulators + covers
  for (const p of wireTops) {
    for (let i = 0; i < 3; i++) ellipse(ctx, p[0], armY - 6 - i * 12, 20 - i * 2, 7, 0, i % 2 ? '#C9D6FF' : '#9FB6FF');
    rrect(ctx, p[0] - 6, armY - 40, 12, 40, 4, '#8CA0F0');
    const cv = st.covers || 0;
    if (cv > 0.001) {
      const s = spring(cv * 1.2, 2.2, 0.45);
      const i = p[0] < 960 ? 0 : 1;
      ctx.save(); ctx.lineCap = 'round';
      ctx.beginPath();
      for (let k = 0; k <= 8; k++) { const q = sunsetWirePoint(half, i, 0.05 * s * k / 8); k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
      ctx.lineWidth = 20 * s; ctx.strokeStyle = PAL.orange; ctx.stroke();
      ctx.translate(p[0], armY - 22); ctx.scale(s, s);
      rrect(ctx, -32, -30, 64, 54, 22, PAL.orange); rrect(ctx, -26, -26, 52, 12, 6, '#FFB067');
      ctx.restore();
    }
  }
  if (st.actors) st.actors(ctx, wireTops);
}
// point along a perspective wire (i = 0 left, 1 right), f from insulator (0) toward vp (1)
function sunsetWirePoint(half, i, f) {
  const armY = 470, p = [960 + (i ? half : -half), armY - 34], vp = SUN.vp;
  const dx = vp[0] - p[0], dy = vp[1] - p[1];
  // quadratic from p (t=0) to vp (t=1) with control at p + 0.3d + (0,14)
  const c = [p[0] + dx * 0.5, p[1] + dy * 0.5 + 30];
  const u = f;
  return [(1 - u) * (1 - u) * p[0] + 2 * (1 - u) * u * c[0] + u * u * vp[0], (1 - u) * (1 - u) * p[1] + 2 * (1 - u) * u * c[1] + u * u * vp[1]];
}
