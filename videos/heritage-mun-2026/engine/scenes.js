// Heritage MUN 2026 — timeline. Every cue is derived from narration timings.
const TM = window.TIMINGS;
const LN = Object.fromEntries(TM.lines.map(l => [l.id, l]));
const S = id => LN[id].start, En = id => LN[id].end;
const EV = [];
const ev = (t, type, extra = {}) => EV.push({ t: +t.toFixed(3), type, ...extra });
TM.lines.forEach(l => ev(l.start, 'line', { id: l.id, end: l.end, text: l.text }));

const COMMITTEES = [
  { id: 'unsc', short: 'UNSC', name: 'United Nations Security Council', accent: '#5B7BFF', icon: iconUNSC,
    agenda: 'Sudan: Balancing the Protection of Civilians with State Sovereignty amid the Ongoing Conflict' },
  { id: 'unga', short: 'UNGA', name: 'United Nations General Assembly', accent: '#FFD244', icon: iconUNGA,
    agenda: 'Reparations for Historical Injustices: Addressing Questions of Responsibility, Recognition and Restitution' },
  { id: 'who', short: 'WHO', name: 'World Health Organization', accent: '#22D7DA', icon: iconWHO,
    agenda: 'The Next Pandemic: Global Responsibility, Preparedness and Equitable Response.' },
  { id: 'lok', short: 'LOK SABHA', name: 'House of the People · Parliament of India', accent: '#3DDC97', icon: iconLok,
    agenda: 'A Parliamentary Review of the Anti-Defection Law, UPI and Hindi in India’s Administration' },
];

// fit a single line of text to a width by shrinking the font size
function fitSize(ctx, text, weight, size, maxW, letter = 0) {
  ctx.save(); ctx.font = `${weight} ${size}px Montserrat`; if ('letterSpacing' in ctx) ctx.letterSpacing = `${letter}px`;
  const w = ctx.measureText(text).width; ctx.restore();
  return w > maxW ? size * maxW / w : size;
}
function txt(ctx, text, x, y, o = {}) {
  const { size = 40, weight = 900, color = PAL.white, align = 'left', letter = 0, alpha = 1, base = 'top' } = o;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.font = `${weight} ${size}px Montserrat`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${letter}px`;
  ctx.textAlign = align; ctx.textBaseline = base; ctx.fillStyle = color; ctx.fillText(text, x, y);
  const w = ctx.measureText(text).width; ctx.restore();
  TEXT_BOXES.push({ text, x, y, w, h: size, align });
  return w;
}
const screenCam = { x: W / 2, y: H / 2, z: 1 };

// ---------------------------------------------------------------------------
// 1. CAMPUS AT DAWN — "Every day at Heritage, you train to save lives."
// ---------------------------------------------------------------------------
const C1 = { land: 1.5, title: 0.95, titleOut: S('L2') - 0.15, spin: S('L2') + 0.55, swap: S('L2') + 0.82, raise: S('L2') + 1.35, exit: S('L3') - 0.7 };
const PIP_C = [1380, 995];
ev(0.1, 'whoosh', { gain: 0.5 }); ev(0.15, 'flutter', { dur: C1.land - 0.15 }); ev(C1.land, 'land');
ev(C1.title, 'pop'); ev(C1.title + 0.2, 'pop', { gain: 0.6 });
ev(C1.spin - 0.1, 'riser', { dur: 0.4 }); ev(C1.swap, 'sparkle'); ev(C1.swap, 'pop'); ev(C1.raise, 'whoosh', { gain: 0.4 });

function campusCam(t) {
  return camPath(t, [
    { t: 0, x: 900, y: 560, z: 1.04 },
    { t: C1.land + 0.2, x: 960, y: 560, z: 1.0, ease: E.ioQ },
    { t: S('L2'), x: 1060, y: 600, z: 1.1, ease: E.ioSine },
    { t: C1.swap, x: 1270, y: 780, z: 1.55, ease: E.ioC },
    { t: C1.exit + 0.6, x: 1300, y: 790, z: 1.7, ease: E.ioSine },
  ]);
}
function campusPip(t) {
  const o = { x: PIP_C[0], y: PIP_C[1], s: 1.5, flip: -1, costume: 'coat', blink: blinkAt(t, 2), expr: 'happy', light: { dir: [0.8, -0.6], rim: '#FFD9A8', r: 5, s: 14 } };
  if (t < C1.land) {
    const u = E.outQ(prog(t, 0, C1.land));
    const p0 = [2200, 380], p1 = [1700, 260], p2 = PIP_C;
    o.x = (1 - u) ** 2 * p0[0] + 2 * (1 - u) * u * p1[0] + u * u * p2[0];
    o.y = (1 - u) ** 2 * p0[1] + 2 * (1 - u) * u * p1[1] + u * u * p2[1];
    const fl = Math.sin(t * TAU * 7);
    o.wing = 2.35 + fl * 0.75; o.tilt = lerp(-0.3, 0, u); o.legs = lerp(0.5, 1.3, prog(t, C1.land - 0.3, C1.land));
    if (t > C1.land - 0.2) o.wing = lerp(o.wing, 2.9, prog(t, C1.land - 0.2, C1.land - 0.05));
    return o;
  }
  const dt = t - C1.land;
  o.sq = 0.24 * Math.exp(-6 * dt) * Math.cos(TAU * 2.6 * dt) + 0.015 * Math.sin(t * 2.6);
  o.wing = lerp(2.9, 0, E.outBack(prog(dt, 0, 0.5)));
  o.look = [0.2, 0.15]; o.head = noise1(t * 0.6, 4) * 0.06;
  // spin + costume swap
  const sp = prog(t, C1.spin, C1.swap + 0.25);
  if (sp > 0) {
    o.sq = -0.3 * Math.sin(Math.PI * sp) + (t > C1.swap + 0.25 ? 0.16 * Math.exp(-7 * (t - C1.swap - 0.25)) * Math.cos((t - C1.swap - 0.25) * 22) : 0);
    o.flip = Math.cos(sp * TAU * 1.5) >= 0 ? -1 : 1;
    o.s = 1.5 * (1 + 0.12 * Math.sin(Math.PI * sp));
  }
  if (t >= C1.swap) { o.costume = 'blazer'; o.expr = 'proud'; o.flip = -1; }
  if (t >= C1.raise - 0.1) {
    const r = E.outBack(prog(t, C1.raise - 0.1, C1.raise + 0.3), 1.6);
    o.placard = PAL.yellow; o.placardText = 'HIMS'; o.placardUp = r; o.wing = 2.85 * r; o.reach = 40 * r; o.expr = 'happy';
  }
  return o;
}
function drawCampusScene(ctx, t) {
  const cam = campusCam(t), d = drift(t, 4, 3);
  drawCampus(ctx, { ...cam, x: cam.x + d[0], y: cam.y + d[1] }, t, {
    night: 0,
    actors: (c) => {
      const pip = campusPip(t);
      drawBird(c, pip);
      if (t > C1.swap - 0.12 && t < C1.swap + 0.9) {
        const k = prog(t, C1.swap - 0.12, C1.swap + 0.9);
        const cy = PIP_C[1] - 120;
        glow(c, PIP_C[0], cy, 260 * (1 - k * 0.5), '#FFFFFF', 0.9 * (1 - k));
        for (let i = 0; i < 10; i++) {
          const a = i / 10 * TAU + 0.3, dd = 60 + E.outC(k) * 210;
          star(c, PIP_C[0] + Math.cos(a) * dd, cy + Math.sin(a) * dd, 16 * (1 - k), i % 2 ? PAL.yellow : PAL.teal);
        }
      }
    },
  });
  applyCam(ctx, screenCam, 0);
  const tt = t - C1.title;
  if (tt > 0 && t < C1.titleOut + 0.4) {
    popText(ctx, 'HERITAGE INSTITUTE OF MEDICAL SCIENCES', 110, 120, tt, { size: 50, align: 'left', out: C1.titleOut - C1.title, stagger: 0.05 });
    popText(ctx, 'VARANASI  ·  UTTAR PRADESH', 112, 186, tt - 0.25, { size: 28, align: 'left', color: PAL.yellow, letter: 6, out: C1.titleOut - C1.title - 0.1 });
  }
  return { cam, prevCam: campusCam(t - 1 / FPS) };
}
function star(ctx, x, y, r, col) {
  if (r <= 0.3) return;
  const p = [];
  for (let k = 0; k < 8; k++) { const a = k / 8 * TAU - Math.PI / 2, rr = k % 2 ? r * 0.38 : r; p.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  poly(ctx, p, col);
}

// ---------------------------------------------------------------------------
// 2. TITLE — "Heritage MUN, twenty twenty-six."
// ---------------------------------------------------------------------------
const C2 = { t0: S('L3') - 0.7, build0: S('L3') - 0.45, title: S('L3') + 0.1, sub: S('L3') + 1.0 };
ev(C2.build0, 'riser', { dur: 0.5 }); ev(C2.title, 'impact', { gain: 0.6 }); ev(C2.title, 'chime'); ev(C2.sub, 'pop', { gain: 0.6 });
function titleCam(t) { return camPath(t, [{ t: C2.t0, x: 960, y: 540, z: 1.12 }, { t: S('L4') + 0.4, x: 960, y: 540, z: 1.0, ease: E.outC }]); }
function drawTitleScene(ctx, t) {
  const cam = titleCam(t);
  drawStage(ctx, cam, t);
  applyCam(ctx, cam, 0.9);
  drawEmblem(ctx, 960, 380, 1.0, t, prog(t, C2.build0, C2.build0 + 1.1));
  applyCam(ctx, cam, 1);
  const tt = t - C2.title;
  if (tt > 0) {
    popText(ctx, 'HERITAGE MUN', 960, 700, tt, { size: 124, stagger: 0.09, letter: 3 });
    popText(ctx, '2026', 960, 812, tt - 0.25, { size: 76, color: PAL.yellow, letter: 22 });
  }
  if (t > C2.sub) popText(ctx, 'MODEL UNITED NATIONS', 960, 895, t - C2.sub, { size: 28, color: PAL.sky, letter: 10, shadow: null });
  return { cam, prevCam: titleCam(t - 1 / FPS) };
}

// ---------------------------------------------------------------------------
// 3. FOUR COMMITTEES overview
// ---------------------------------------------------------------------------
const C3 = { t0: S('L4') - 0.3, head: S('L4') + 0.0, cards: S('L4') + 0.15, bump: S('L4') + 1.25, dive: S('L5') - 0.55 };
ev(C3.head, 'pop'); for (let k = 0; k < 4; k++) ev(C3.cards + k * 0.17, 'pop', { gain: 0.7 }); ev(C3.bump, 'sparkle', { gain: 0.5 }); ev(C3.dive, 'whoosh');
const CARD_X = [300, 740, 1180, 1620];
function overviewCam(t) {
  return camPath(t, [{ t: C3.t0, x: 960, y: 560, z: 1.05 }, { t: C3.dive, x: 960, y: 560, z: 1.0, ease: E.outC }, { t: C3.dive + 0.55, x: CARD_X[0], y: 600, z: 2.6, ease: E.inExpo }]);
}
function drawOverview(ctx, t) {
  const cam = overviewCam(t);
  drawStage(ctx, cam, t, { c0: '#3A2AA8', c1: '#1A1270', c2: '#09093A' });
  applyCam(ctx, cam, 1);
  if (t > C3.head) popText(ctx, 'FOUR COMMITTEES', 960, 150, t - C3.head, { size: 66, letter: 4 });
  COMMITTEES.forEach((c, k) => {
    const lt = t - C3.cards - k * 0.17;
    if (lt <= 0) return;
    const s = spring(lt, 2.2, 0.45) * (1 + 0.05 * pulse(t, C3.bump + k * 0.08, C3.bump + k * 0.08 + 0.35, 0.12));
    const x = CARD_X[k], y = 610;
    ctx.save(); ctx.translate(x, y + (1 - s) * 60); ctx.scale(s, s);
    const card = pRect(-190, -250, 380, 500, 34);
    const gg = ctx.createLinearGradient(0, -250, 0, 250); gg.addColorStop(0, rgba(c.accent, 0.95)); gg.addColorStop(1, mixColor(c.accent, '#0B0F4A', 0.55));
    shapeFill(ctx, card, gg, { rim: '#FFFFFF', r: 4, light: [0.5, -1], shadow: rgba('#05062A', 0.3), s: 18 });
    shapeFill(ctx, pCircle(0, -105, 92), '#FFFFFF', { shadow: rgba('#05062A', 0.12), s: 8, light: [0.5, -1] });
    ctx.save(); ctx.translate(0, -105); ctx.scale(0.95, 0.95); c.icon(ctx, mixColor(c.accent, '#0B0F4A', 0.25)); ctx.restore();
    const fs = fitSize(ctx, c.short, 900, 58, 320, 2);
    txt(ctx, c.short, 0, 30, { size: fs, align: 'center', letter: 2 });
    ctx.save(); ctx.font = '800 22px Montserrat'; if ('letterSpacing' in ctx) ctx.letterSpacing = '1px';
    const lines = wrapLines(ctx, c.name.toUpperCase(), 310); ctx.restore();
    lines.forEach((ln, i) => txt(ctx, ln, 0, 110 + i * 30, { size: 22, weight: 800, align: 'center', letter: 1, alpha: 0.85 }));
    ctx.restore();
  });
  return { cam, prevCam: overviewCam(t - 1 / FPS) };
}

// ---------------------------------------------------------------------------
// 4–7. COMMITTEE CHAMBERS with agenda panel
// ---------------------------------------------------------------------------
const PANEL = { x: 1060, y: 150, w: 770, h: 780 };
function drawPanel(ctx, t, c) {
  const s = E.outBack(prog(t, 0, 0.55), 1.2), a = clamp(t / 0.25);
  if (a <= 0) return;
  const off = (1 - s) * 420;
  ctx.save(); ctx.translate(off, 0); ctx.globalAlpha = a;
  const P = pRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 36);
  // frosted-glass backdrop: blur what's behind the panel
  ctx.save(); ctx.clip(P); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = 'blur(16px)'; ctx.drawImage(ctx.canvas, 0, 0); ctx.restore();
  ctx.fillStyle = 'rgba(7,9,40,0.74)'; ctx.fill(P);
  ctx.save(); ctx.clip(P); ctx.fillStyle = c.accent; ctx.fillRect(PANEL.x, PANEL.y, 12, PANEL.h); ctx.restore();
  ctx.lineWidth = 2; ctx.strokeStyle = rgba(c.accent, 0.55); ctx.stroke(P);
  const X = PANEL.x + 64, MW = PANEL.w - 64 - 56;
  // icon badge
  ctx.save(); ctx.translate(PANEL.x + PANEL.w - 104, PANEL.y + 104);
  shapeFill(ctx, pCircle(0, 0, 62), '#FFFFFF', {}); ctx.scale(0.7, 0.7); c.icon(ctx, mixColor(c.accent, '#0B0F4A', 0.25)); ctx.restore();
  const ts = (k) => t - 0.25 - k * 0.12;
  const fade = (k) => clamp(ts(k) / 0.3);
  const rise = (k) => (1 - E.outC(clamp(ts(k) / 0.4))) * 20;
  const fs = fitSize(ctx, c.short, 900, 92, MW - 150, 2);
  txt(ctx, c.short, X, PANEL.y + 58 + rise(0), { size: fs, color: c.accent, letter: 2, alpha: fade(0) });
  txt(ctx, c.name.toUpperCase(), X, PANEL.y + 172 + rise(1), { size: fitSize(ctx, c.name.toUpperCase(), 800, 25, MW, 2), weight: 800, letter: 2, alpha: 0.85 * fade(1) });
  ctx.save(); ctx.globalAlpha *= fade(2); line(ctx, X, PANEL.y + 236, X + MW * E.outC(clamp(ts(2) / 0.5)), PANEL.y + 236, 3, rgba('#FFFFFF', 0.25), 'butt'); ctx.restore();
  txt(ctx, 'AGENDA', X, PANEL.y + 264 + rise(2), { size: 22, weight: 800, color: c.accent, letter: 8, alpha: fade(2) });
  textBlock(ctx, c.agenda, X, PANEL.y + 310, MW, { size: 44, weight: 800, lh: 1.24, t: ts(3) });
  ctx.restore();
}
function chamberScene(c, drawSet, cam0, cam1, extra) {
  return (ctx, t, a, b) => {
    const cam = camPath(t, [{ t: a, ...cam0 }, { t: b, ...cam1, ease: E.ioSine }]);
    const d = drift(t, 3, 7);
    drawSet(ctx, { ...cam, x: cam.x + d[0], y: cam.y + d[1] }, t, extra(t));
    applyCam(ctx, screenCam, 0);
    drawPanel(ctx, t - a - 0.15, c);
    return { cam };
  };
}

const C4 = { a: S('L5') - 0.5, b: S('L6') - 0.15 };
const C5 = { a: S('L6') - 0.35, b: S('L7') - 0.15 };
const C6 = { a: S('L7') - 0.35, b: S('L8') - 0.15 };
const C7 = { a: S('L8') - 0.35, b: S('L9') - 0.1 };
for (const C of [C4, C5, C6, C7]) { ev(C.a + 0.2, 'swoosh'); ev(C.a + 0.45, 'pop', { gain: 0.6 }); }
ev(S('L5') + 0.3, 'whoosh', { gain: 0.35 }); ev(S('L6') + 0.4, 'murmur', { dur: 2.6 }); ev(S('L7') + 0.2, 'shield', { dur: 3 }); ev(S('L8') + 0.2, 'gavel');

const LIGHT_BLUE = { dir: [0.8, -0.6], rim: '#C8D6FF', r: 5, s: 14 };
const drawUNSCScene = chamberScene(COMMITTEES[0], drawUNSC, { x: 620, y: 560, z: 1.06 }, { x: 600, y: 600, z: 1.16 }, (t) => ({
  actors: (c) => {
    const r = E.outBack(prog(t, S('L5') + 0.2, S('L5') + 0.6), 1.6);
    drawBird(c, { x: 340, y: 1035, s: 1.5, costume: 'blazer', expr: 'happy', placard: PAL.yellow, placardText: 'HIMS', placardUp: r, wing: 2.85 * r, reach: 40 * r,
      blink: blinkAt(t, 5), look: [0.5, -0.3 * r], sq: 0.015 * Math.sin(t * 2.6), light: LIGHT_BLUE });
  },
}));
const drawUNGAScene = chamberScene(COMMITTEES[1], drawUNGA, { x: 560, y: 520, z: 1.04 }, { x: 540, y: 500, z: 1.14 }, (t) => ({
  speaker: (c) => {
    const talk = (Math.sin(t * 17) > 0 && t > S('L6') && t < En('L6')) ? 0.5 : 0.05;
    const gest = Math.sin(t * 2.2) * 0.25;
    drawBird(c, { x: 520, y: 508, s: 1.25, costume: 'blazer', flip: 1, expr: 'talk', beak: talk - 0.45, wing: -1.5 + gest, reach: 12,
      blink: blinkAt(t, 8), look: [0.2, 0.1], head: Math.sin(t * 1.4) * 0.06, light: { dir: [0.3, -1], rim: '#FFF0B8', r: 5, s: 14 }, hideLegs: true });
  },
}));
const drawWHOScene = chamberScene(COMMITTEES[2], drawWHO, { x: 600, y: 540, z: 1.0 }, { x: 560, y: 540, z: 1.1 }, (t) => ({
  actors: (c) => {
    const L = { dir: [0.6, -0.8], rim: '#B8FBFF', r: 5, s: 14 };
    drawBird(c, { x: 110, y: 1010, s: 1.5, costume: 'coat', expr: 'happy', wing: -1.65, reach: 26, blink: blinkAt(t, 3), look: [0.6, -0.6], light: L });
  },
}));
const drawLokScene = chamberScene(COMMITTEES[3], drawLok, { x: 600, y: 560, z: 1.02 }, { x: 560, y: 540, z: 1.12 }, (t) => ({
  speaker: (c) => {
    const fan = E.outBack(prog(t, C7.a + 0.1, C7.a + 0.9), 1.3);
    drawPeacock(c, { x: 520, y: 645, s: 1.05, fan, t, blink: blinkAt(t, 21), look: [0, 0], light: { dir: [0.4, -1], rim: '#B8F7D6', r: 4, s: 12 } });
  },
  actors: (c) => {
    const r = E.outBack(prog(t, S('L8') + 1.4, S('L8') + 1.8), 1.6);
    drawBird(c, { x: 150, y: 1020, s: 1.5, costume: 'blazer', expr: 'happy', placard: PAL.orange, placardText: 'HIMS', placardUp: r, wing: 2.85 * r, reach: 40 * r,
      blink: blinkAt(t, 6), look: [0.6, -0.4], light: { dir: [0.4, -1], rim: '#B8F7D6', r: 5, s: 14 } });
  },
}));

// ---------------------------------------------------------------------------
// 8. FREE REGISTRATION
// ---------------------------------------------------------------------------
const C8 = { a: S('L9') - 0.45, head: S('L9') + 0.05, ticket: S('L9') + 0.35, stamp: En('L9') - 0.45, b: S('L10') - 0.05 };
ev(C8.head, 'pop'); ev(C8.ticket, 'whoosh', { gain: 0.5 }); ev(C8.ticket + 0.35, 'thump', { gain: 0.5 }); ev(C8.stamp, 'stamp'); ev(C8.stamp + 0.05, 'cheer'); ev(C8.stamp + 0.1, 'sparkle');
function freeCam(t) { return camPath(t, [{ t: C8.a, x: 960, y: 540, z: 1.08 }, { t: C8.b + 0.6, x: 940, y: 540, z: 1.0, ease: E.outC }]); }
function ticketPath() {
  const p = new Path2D(); p.roundRect(150, 330, 1000, 480, 34);
  return p;
}
function drawFreeScene(ctx, t) {
  const cam = freeCam(t);
  const stampT = t - C8.stamp;
  const shake = stampT > 0 ? [Math.sin(t * 90) * 10 * Math.exp(-8 * stampT), Math.cos(t * 70) * 10 * Math.exp(-8 * stampT)] : [0, 0];
  const camS = { ...cam, x: cam.x + shake[0], y: cam.y + shake[1] };
  drawCelebration(ctx, camS, t, {
    confetti: Math.max(0, stampT),
    actors: (c) => {
      applyCam(c, camS, 1);
      // ticket drops in
      const k = spring(t - C8.ticket, 1.8, 0.5);
      if (k > 0.001) {
        c.save(); c.translate(650, 570); c.rotate((1 - k) * -0.25); c.translate(-650, -570 + (1 - k) * -700);
        const tp = ticketPath();
        const notch = new Path2D(); notch.addPath(pCircle(450, 330, 28)); notch.addPath(pCircle(450, 810, 28));
        c.save(); clipOut(c, notch);
        c.fillStyle = rgba('#5A1240', 0.25); c.translate(10, 16); c.fill(tp); c.translate(-10, -16);
        c.save(); c.clip(tp); c.fillStyle = '#FFF7E8'; c.fillRect(449, 320, 720, 500); c.fillStyle = '#1D2C75'; c.fillRect(140, 320, 310, 500); c.restore();
        crescent(c, tp, 0, 6, '#FFFFFF');
        c.restore();
        c.setLineDash([12, 10]); c.lineWidth = 4; c.strokeStyle = rgba('#1D2C75', 0.4); c.beginPath(); c.moveTo(450, 368); c.lineTo(450, 772); c.stroke(); c.setLineDash([]);
        drawEmblem(c, 300, 500, 0.5, t, 1);
        txt(c, 'HERITAGE', 300, 640, { size: 38, align: 'center', letter: 2 });
        txt(c, 'MUN 2026', 300, 688, { size: 38, align: 'center', color: PAL.yellow, letter: 2 });
        txt(c, 'REGISTRATION FEE', 800, 380, { size: 30, weight: 800, color: '#1D2C75', align: 'center', letter: 6 });
        txt(c, '₹0', 800, 420, { size: 220, color: '#1D2C75', align: 'center' });
        txt(c, 'FOR HIMS STUDENTS', 800, 660, { size: 40, color: PAL.pink, align: 'center', letter: 2 });
        txt(c, 'DELEGATES & EXECUTIVE BOARD (EB)', 800, 718, { size: 26, weight: 800, color: '#1D2C75', align: 'center', letter: 1 });
        c.restore();
      }
      // FREE stamp
      if (stampT > 0) {
        const s = lerp(2.4, 1, E.outQuint(clamp(stampT / 0.18))) + 0.05 * Math.exp(-8 * stampT) * Math.sin(stampT * 40);
        c.save(); c.translate(1188, 398); c.rotate(-0.22); c.scale(s, s); c.globalAlpha *= clamp(stampT / 0.08);
        c.lineWidth = 12; c.strokeStyle = PAL.pink; c.beginPath(); c.arc(0, 0, 118, 0, TAU); c.stroke();
        c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 98, 0, TAU); c.stroke();
        txt(c, 'FREE', 0, 6, { size: fitSize(c, 'FREE', 900, 66, 150, 2), color: PAL.pink, align: 'center', base: 'middle', letter: 2 });
        for (const sx of [-62, 62]) star(c, sx, -64, 10, PAL.pink);
        c.restore();
      }
      // Pip celebrates
      const jt = t - C8.stamp;
      const jump = jt > 0 ? Math.max(0, Math.sin(Math.min(jt, 0.62) / 0.62 * Math.PI)) * 160 : 0;
      drawBird(c, { x: 1540, y: 1000 - jump, s: 2.0, costume: 'blazer', flip: -1, expr: jt > 0 ? 'happy' : 'surprised', exprK: 0,
        wing: jt > 0 ? 2.75 + Math.sin(jt * 18) * 0.15 : 0.3, reach: jt > 0 ? 18 : 0, sq: jt > 0 && jt < 0.08 ? 0.2 : (jt > 0.62 && jt < 0.9 ? 0.18 * Math.exp(-8 * (jt - 0.62)) : 0.015 * Math.sin(t * 3)),
        blink: blinkAt(t, 12), look: [0.6, 0.1], perched: jump < 2, light: { dir: [-0.6, -0.8], rim: '#FFF2C2', r: 5, s: 14 } });
    },
  });
  applyCam(ctx, camS, 1);
  if (t > C8.head) {
    popText(ctx, 'NO REGISTRATION FEES', 150, 150, t - C8.head, { size: 70, align: 'left', letter: 2, shadow: '#9A1F5E' });
    textBlock(ctx, 'for students of Heritage Institute of Medical Sciences', 152, 210, 1000, { size: 34, weight: 800, t: t - C8.head - 0.3 });
  }
  return { cam: camS };
}

// ---------------------------------------------------------------------------
// 9. CAMPUS AT NIGHT — dates, venue, call to action, end card
// ---------------------------------------------------------------------------
const C9 = { a: S('L10') - 0.35, dates: S('L10') + 0.1, datesOut: S('L11') - 0.25, y1: S('L11') + 0.0, y2: S('L11') + 0.85, y3: S('L11') + 1.7, card: En('L11') + 0.3 };
ev(C9.dates, 'impact', { gain: 0.45 }); ev(C9.dates + 0.25, 'pop', { gain: 0.6 }); ev(C9.dates + 0.4, 'whoosh', { gain: 0.4 });
ev(C9.y1, 'pop'); ev(C9.y2, 'pop'); ev(C9.y3, 'pop'); ev(C9.card, 'chime'); ev(C9.card, 'riser', { dur: 0.3 });
function nightCam(t) { return camPath(t, [{ t: C9.a, x: 960, y: 470, z: 0.98 }, { t: C9.card, x: 960, y: 500, z: 0.92, ease: E.ioSine }, { t: TM.duration, x: 960, y: 505, z: 0.9, ease: E.ioSine }]); }
function drawEndScene(ctx, t) {
  const cam = nightCam(t), d = drift(t, 3, 13);
  drawCampus(ctx, { ...cam, x: cam.x + d[0], y: cam.y + d[1] }, t, {
    night: 1, banners: prog(t, C9.a + 0.3, C9.a + 1.2), beams: true,
    actors: (c) => {
      // spotlight on Pip
      c.save(); c.globalAlpha = 0.18; c.fillStyle = '#FFF2C2';
      c.beginPath(); c.moveTo(1330, 300); c.lineTo(1430, 300); c.lineTo(1560, 1000); c.lineTo(1200, 1000); c.fill(); c.restore();
      glow(c, 1380, 990, 220, PAL.yellow, 0.35);
      const wave = Math.sin(t * 7) * 0.35;
      drawBird(c, { x: 1380, y: 995, s: 1.5, costume: 'blazer', flip: -1, expr: 'happy', wing: 2.6 + wave, reach: 14, blink: blinkAt(t, 4),
        look: [-0.3, 0.2], sq: 0.015 * Math.sin(t * 3), light: { dir: [-0.3, -1], rim: '#FFF2C2', r: 5, s: 14 } });
    },
  });
  applyCam(ctx, screenCam, 0);
  // dates + venue
  if (t > C9.dates && t < C9.datesOut + 0.4) {
    const out = C9.datesOut - C9.dates;
    popText(ctx, '28–29 NOVEMBER 2026', 960, 120, t - C9.dates, { size: 96, letter: 3, out });
    popText(ctx, 'HERITAGE INSTITUTE OF MEDICAL SCIENCES  ·  VARANASI', 960, 212, t - C9.dates - 0.25, { size: 32, color: PAL.yellow, letter: 3, out: out - 0.1, stagger: 0.03 });
  }
  // call to action
  if (t > C9.y1 && t < C9.card + 0.3) {
    const out = C9.card - 0.25;
    popText(ctx, 'YOUR COLLEGE.', 960, 105, t - C9.y1, { size: 70, letter: 2, out: out - C9.y1 });
    if (t > C9.y2) popText(ctx, 'YOUR PLATFORM.', 960, 195, t - C9.y2, { size: 70, letter: 2, out: out - C9.y2 });
    if (t > C9.y3) popText(ctx, 'YOUR OPPORTUNITY TO LEAD.', 960, 285, t - C9.y3, { size: 70, letter: 2, color: PAL.yellow, out: out - C9.y3 });
  }
  // end card
  if (t > C9.card) {
    const k = E.ioC(prog(t, C9.card, C9.card + 0.6));
    ctx.fillStyle = rgba('#05072A', 0.72 * k); ctx.fillRect(0, 0, W, H);
    drawEmblem(ctx, 960, 330, 0.62, t, prog(t, C9.card, C9.card + 0.9));
    popText(ctx, 'HERITAGE MUN 2026', 960, 590, t - C9.card - 0.2, { size: 92, letter: 3 });
    popText(ctx, '28–29 NOVEMBER 2026  ·  HIMS, VARANASI', 960, 680, t - C9.card - 0.45, { size: 34, color: PAL.yellow, letter: 3, stagger: 0.04 });
    popText(ctx, 'Academic Committee 2026-27  ·  Heritage Institute of Medical Sciences', 960, 748, t - C9.card - 0.7, { size: 26, weight: 600, color: '#C9D2EE', letter: 1, stagger: 0.02, shadow: null });
  }
  const fade = prog(t, TM.duration - 0.45, TM.duration - 0.02);
  if (fade > 0) { ctx.fillStyle = rgba('#000000', E.inQ(fade)); ctx.fillRect(0, 0, W, H); }
  return { cam };
}

// ---------------------------------------------------------------------------
const SCENES = [
  { id: 'campus', a: 0, b: S('L3'), draw: drawCampusScene },
  { id: 'title', a: C1.exit, b: S('L4') + 0.2, draw: drawTitleScene },
  { id: 'overview', a: C3.t0, b: S('L5') + 0.1, draw: drawOverview },
  { id: 'unsc', a: C4.a, b: C4.b + 0.45, draw: (c, t) => drawUNSCScene(c, t, C4.a, C4.b) },
  { id: 'unga', a: C5.a, b: C5.b + 0.45, draw: (c, t) => drawUNGAScene(c, t, C5.a, C5.b) },
  { id: 'who', a: C6.a, b: C6.b + 0.45, draw: (c, t) => drawWHOScene(c, t, C6.a, C6.b) },
  { id: 'lok', a: C7.a, b: C7.b + 0.5, draw: (c, t) => drawLokScene(c, t, C7.a, C7.b) },
  { id: 'free', a: C8.a, b: C8.b + 0.5, draw: drawFreeScene },
  { id: 'end', a: C9.a, b: TM.duration + 1, draw: drawEndScene },
];
const TRANSITIONS = [
  { from: 'campus', to: 'title', t0: C1.exit, t1: C1.exit + 0.6, type: 'circle', col: '#14197A', at: () => { const c = campusCam(C1.exit); return [W / 2 + (PIP_C[0] - c.x) * c.z, H / 2 + (PIP_C[1] - 150 - c.y) * c.z]; } },
  { from: 'title', to: 'overview', t0: C3.t0, t1: C3.t0 + 0.45, type: 'push' },
  { from: 'overview', to: 'unsc', t0: C4.a, t1: C4.a + 0.55, type: 'circle', col: '#1D2FA6', at: () => [CARD_X[0], 610] },
  { from: 'unsc', to: 'unga', t0: C5.a, t1: C5.a + 0.45, type: 'push' },
  { from: 'unga', to: 'who', t0: C6.a, t1: C6.a + 0.45, type: 'push' },
  { from: 'who', to: 'lok', t0: C7.a, t1: C7.a + 0.45, type: 'push' },
  { from: 'lok', to: 'free', t0: C8.a, t1: C8.a + 0.55, type: 'diag', col: '#FF851D' },
  { from: 'free', to: 'end', t0: C9.a, t1: C9.a + 0.55, type: 'diag', col: '#14197A' },
];
for (const tr of TRANSITIONS) ev(tr.t0, tr.type === 'push' ? 'swoosh' : 'wipe');
EV.sort((a, b) => a.t - b.t);
