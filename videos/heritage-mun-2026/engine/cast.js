// Characters, emblem and icons for Heritage MUN 2026.
// All shading uses shapeFill/crescent (lib.js): rim lights and core shadows are
// cut from each shape's own outline, so they always sit exactly on the curve.

const BIRD_COLS = {
  teal:   { body: '#22D7DA', belly: '#B5F6F1', tuft: '#ED4BA4', tail: '#0E7F96' },
  pink:   { body: '#F25AAE', belly: '#FFD0EA', tuft: '#FFD244', tail: '#B32D7D' },
  yellow: { body: '#FFD244', belly: '#FFF2C2', tuft: '#FF851D', tail: '#D99A0B' },
  orange: { body: '#FF8A2B', belly: '#FFD7B0', tuft: '#22D7DA', tail: '#C85A0E' },
  purple: { body: '#9A6BFF', belly: '#E3D6FF', tuft: '#FFD244', tail: '#5E37C9' },
  sky:    { body: '#8CAAF7', belly: '#E2EAFF', tuft: '#FF851D', tail: '#4E6CD0' },
  green:  { body: '#3DDC97', belly: '#CFF8E6', tuft: '#ED4BA4', tail: '#1F9E68' },
};
const COSTUME = {
  coat:   { main: '#F6F8FF', dark: '#C9D2EE', trim: '#DCE3F8' },
  blazer: { main: '#1D2C75', dark: '#121C52', trim: '#2C3E96', shirt: '#F6F8FF', tie: '#ED4BA4' },
};
const EXPR2 = {
  neutral:   { eyeR: 15, pupilR: 7.2, browY: 0,  browA: 0.08,  lowLid: 0,    topLid: 0,   beak: 0 },
  happy:     { eyeR: 15, pupilR: 7.2, browY: -5, browA: -0.1,  lowLid: 0.42, topLid: 0,   beak: 0.3 },
  surprised: { eyeR: 17, pupilR: 5.2, browY: -9, browA: -0.12, lowLid: 0,    topLid: 0,   beak: 0.55 },
  proud:     { eyeR: 15, pupilR: 7.2, browY: -3, browA: 0.0,   lowLid: 0.32, topLid: 0.2, beak: 0.1 },
  talk:      { eyeR: 15, pupilR: 7.0, browY: -4, browA: -0.05, lowLid: 0.1,  topLid: 0,   beak: 0.45 },
};
const LIGHT_DEFAULT = { dir: [0.75, -0.65], rim: '#FFE9C4', shadow: 'rgba(9,14,60,0.28)', r: 5, s: 14 };

// o: x,y feet, s, flip, col (BIRD_COLS key), costume ('coat'|'blazer'|null), expr/expr2/exprK,
// blink, look, head, tilt, sq, wing (near-wing angle), legs, perched, light, placard (text|color), beak
function drawBird(ctx, o) {
  const s = o.s ?? 1, flip = o.flip ?? 1, sq = o.sq ?? 0;
  const C = BIRD_COLS[o.col || 'teal'];
  const A = EXPR2[o.expr || 'neutral'], B = EXPR2[o.expr2 || o.expr || 'neutral'], k = clamp(o.exprK || 0);
  const ex = {}; for (const key in A) ex[key] = lerp(A[key], B[key], k);
  const L = { ...LIGHT_DEFAULT, ...(o.light || {}) };
  const light = [L.dir[0] * flip, L.dir[1]]; // light direction in the bird's local (flipped) space
  const legLen = 24 * (o.legs ?? 1);
  const cos = o.costume ? COSTUME[o.costume] : null;
  ctx.save();
  ctx.translate(o.x, o.y); ctx.scale(s * flip, s);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;

  // legs
  if (!o.hideLegs) for (const lx of [-10, 9]) {
    line(ctx, lx, -legLen, lx + 1, -2, 5, '#FF851D');
    if (o.perched) { ctx.beginPath(); ctx.arc(lx + 4, 3, 7, Math.PI * 1.05, Math.PI * 2.05); ctx.lineWidth = 4.5; ctx.strokeStyle = '#FF851D'; ctx.lineCap = 'round'; ctx.stroke(); }
    else { line(ctx, lx + 1, -2, lx + 12, 0, 4.5, '#FF851D'); line(ctx, lx + 1, -2, lx - 7, 0, 4.5, '#FF851D'); }
  }
  ctx.translate(0, -legLen); ctx.rotate(o.tilt || 0); ctx.scale(1 + sq * 0.65, 1 - sq);

  // tail feathers
  shapeFill(ctx, pPoly([[-30, -30], [-84, -62], [-90, -46], [-38, -16]]), C.tail, { shadow: L.shadow, s: 5, light });
  shapeFill(ctx, pPoly([[-30, -34], [-78, -74], [-86, -60], [-36, -22]]), cos ? cos.dark : C.tail, { rim: L.rim, r: 3, light });

  // body: colour regions partition the silhouette (head colour / belly / costume), each drawn
  // by filling the silhouette clipped to its region, lower layers inset 1px under the seams.
  const body = pEllipse(0, -56, 47, 55, 0.12);
  const Ll = Math.hypot(light[0], light[1]), lx = light[0] / Ll, ly = light[1] / Ll;
  const coatPoly = [[-80, -56], [-2, -58], [19, -20], [38, -58], [90, -56], [90, 20], [-80, 20]];
  const coat = cos ? pPoly(coatPoly) : null;
  const coatDown = cos ? pPoly(coatPoly.map(([x, y]) => [x, y + 1.2])) : null;
  const belly = pEllipse(18, -34, 32, 36, 0.25), bellyIn = pEllipse(18, -34, 31, 35, 0.25);
  baseFill(ctx, body, () => {
    ctx.save(); clipOut(ctx, bellyIn); if (coatDown) clipOut(ctx, coatDown);
    ctx.fillStyle = C.body; ctx.fill(body); ctx.restore();
    ctx.save(); ctx.clip(belly); if (coatDown) clipOut(ctx, coatDown);
    ctx.fillStyle = C.belly; ctx.fill(body); ctx.restore();
    if (cos) {
      ctx.save(); ctx.clip(coat);
      if (o.costume === 'blazer') { ctx.fillStyle = cos.main; ctx.fill(body); }
      else { ctx.fillStyle = cos.main; ctx.fill(body); }
      ctx.restore();
    }
  }, lx, ly, isOpaque(L.rim) ? L.r : 0);
  ctx.save(); ctx.clip(body);
  if (cos) {
    if (o.costume === 'blazer') {
      ctx.fillStyle = cos.shirt; ctx.fill(pPoly([[-2, -58], [19, -20], [38, -58]]));
      shapeFill(ctx, pPoly([[15, -56], [23, -56], [26, -34], [19, -24], [12, -34]]), cos.tie, { shadow: 'rgba(80,0,40,0.35)', s: 3, light });
    }
    // lapels
    ctx.fillStyle = cos.dark;
    ctx.fill(pPoly([[-2, -58], [8, -58], [21, -26], [19, -20]]));
    ctx.fill(pPoly([[38, -58], [30, -58], [19, -24], [19, -20]]));
    if (o.costume === 'coat') {
      rrect(ctx, -32, -30, 22, 4, 2, cos.dark);                 // breast pocket
      line(ctx, -22, -38, -22, -30, 3, PAL.royal);               // pen
      circle(ctx, 32, -8, 3, cos.dark); circle(ctx, 33, 4, 3, cos.dark);
    } else {
      circle(ctx, 31, -8, 3.2, '#FFD244'); circle(ctx, 32, 5, 3.2, '#FFD244');
    }
  }
  ctx.restore();
  // core shadow (translucent darkening) + rim light (opaque), both cut from the silhouette
  crescent(ctx, body, lx * L.s, ly * L.s, L.shadow);
  crescent(ctx, body, -lx * L.r, -ly * L.r, L.rim);

  // stethoscope (coat) / lanyard + badge (blazer)
  if (o.costume === 'coat') {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(0, -57); ctx.quadraticCurveTo(6, -40, 19, -36); ctx.quadraticCurveTo(31, -40, 36, -57);
    ctx.lineWidth = 4; ctx.strokeStyle = '#2B3270'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(19, -36); ctx.quadraticCurveTo(17, -22, 26, -14); ctx.stroke();
    ctx.restore();
    shapeFill(ctx, pCircle(27, -10, 7), '#C9D3F0', { rim: '#FFFFFF', r: 2, shadow: 'rgba(9,14,60,0.35)', s: 3, light });
    circle(ctx, 27, -10, 3, '#8C98C8');
  } else if (o.costume === 'blazer') {
    ctx.save(); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-2, -57); ctx.lineTo(-14, -30); ctx.lineWidth = 2.5; ctx.strokeStyle = PAL.yellow; ctx.stroke();
    ctx.restore();
    shapeFill(ctx, pRect(-26, -32, 24, 30, 4), '#FFFFFF', { shadow: 'rgba(9,14,60,0.3)', s: 3, light });
    rrect(ctx, -26, -32, 24, 8, [4, 4, 0, 0], PAL.yellow);
    ctx.save(); ctx.translate(-14, -14); ctx.scale(flip, 1);
    ctx.font = '900 7px Montserrat'; ctx.fillStyle = PAL.night; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('MUN', 0, 0); ctx.restore();
  }

  // head features (rotate together)
  ctx.save(); ctx.translate(6, -72); ctx.rotate(o.head || 0); ctx.translate(-6, 72);
  for (const [a, l] of [[-0.55, 20], [-0.1, 26], [0.35, 20]]) {
    ctx.save(); ctx.translate(-6, -104); ctx.rotate(a + (o.tuft || 0));
    shapeFill(ctx, pBlob([[0, 2], [6, -l * 0.5], [0, -l], [-6, -l * 0.5]]), C.tuft, { rim: L.rim, r: 2, light: [light[0], light[1]] });
    ctx.restore();
  }
  const er = ex.eyeR, eyeX = 18, eyeY = -78, look = o.look || [0, 0];
  circle(ctx, eyeX, eyeY, er + 2, 'rgba(9,14,60,0.16)');
  circle(ctx, eyeX, eyeY, er, '#FFFFFF');
  const px = eyeX + look[0] * (er - ex.pupilR - 2), py = eyeY + look[1] * (er - ex.pupilR - 2);
  circle(ctx, px, py, ex.pupilR, PAL.night);
  circle(ctx, px - 2.2, py - 2.6, ex.pupilR * 0.33, '#FFFFFF');
  ctx.save(); ctx.beginPath(); ctx.arc(eyeX, eyeY, er + 0.5, 0, TAU); ctx.clip();
  const top = clamp(Math.max(ex.topLid, o.blink || 0));
  if (top > 0.001) rrect(ctx, eyeX - er - 2, eyeY - er - 2, er * 2 + 4, (er * 2 + 4) * top, 2, C.body);
  if (ex.lowLid > 0.001 && (o.blink || 0) < 0.9) { ctx.fillStyle = C.body; ctx.fill(pEllipse(eyeX, eyeY + er * 2.05 - ex.lowLid * er * 1.25, er * 1.5, er * 1.25)); }
  ctx.restore();
  ctx.save(); ctx.translate(eyeX, eyeY - er - 7 + ex.browY); ctx.rotate(ex.browA); line(ctx, -11, 0, 11, 0, 5, PAL.night); ctx.restore();
  ctx.save(); if (coat) clipOut(ctx, coat); circle(ctx, 2, -62, 4.5, rgba('#ED4BA4', 0.38)); ctx.restore();
  const bo = clamp((o.beak ?? 0) + ex.beak);
  ctx.save(); ctx.translate(41, -69);
  shapeFill(ctx, pPoly([[0, -9], [27, -1 - bo * 3], [0, 3]]), '#FF851D', { rim: '#FFD9A8', r: 2, light });
  ctx.rotate(bo * 0.45);
  ctx.fillStyle = '#D9620A'; ctx.fill(pPoly([[0, 1], [22, 2], [0, 9]]));
  ctx.restore();
  ctx.restore();

  // near wing / sleeve
  ctx.save(); ctx.translate(-8, -48); ctx.rotate(o.wing || 0);
  const r = o.reach || 0;
  const wing = pBlob([[5, -7], [12, 12], [7, 40 + r * 0.9], [-9, 56 + r], [-24, 40 + r * 0.9], [-21, 8], [-9, -9]]);
  const wl = [Math.cos(-(o.wing || 0)) * light[0] - Math.sin(-(o.wing || 0)) * light[1], Math.sin(-(o.wing || 0)) * light[0] + Math.cos(-(o.wing || 0)) * light[1]];
  shapeFill(ctx, wing, cos ? cos.main : C.tail, { rim: L.rim, r: 3, shadow: L.shadow, s: 6, light: wl });
  if (cos) { ctx.save(); ctx.clip(wing); ctx.fillStyle = C.body; ctx.fill(pEllipse(-9, 56 + r, 14, 9)); ctx.restore(); }
  ctx.restore();

  // placard raised above the head (MUN style)
  if (o.placard) {
    const up = clamp(o.placardUp ?? 1);
    ctx.save(); ctx.translate(lerp(40, -34, up), lerp(-40, -178, up)); ctx.rotate(lerp(0.1, -0.1, up));
    line(ctx, 0, 0, 0, lerp(34, 44, up), 4, '#C9D2EE');
    shapeFill(ctx, pRect(-40, -34, 80, 36, 6), '#FFFFFF', { shadow: 'rgba(9,14,60,0.25)', s: 4, light });
    rrect(ctx, -40, -34, 80, 10, [6, 6, 0, 0], o.placard);
    if (o.placardText) { ctx.save(); ctx.scale(flip, 1); ctx.font = '900 19px Montserrat'; if ('letterSpacing' in ctx) ctx.letterSpacing = '1px'; ctx.fillStyle = PAL.night; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.placardText, 0, -11); ctx.restore(); }
    ctx.restore();
  }
  ctx.restore();
}

// ---------------- Peacock: the Lok Sabha Speaker ----------------
function drawPeacock(ctx, o) {
  const s = o.s ?? 1, fan = clamp(o.fan ?? 1);
  const L = { ...LIGHT_DEFAULT, ...(o.light || {}) };
  ctx.save(); ctx.translate(o.x, o.y); ctx.scale(s, s);
  // tail fan
  const n = 19;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const a = -Math.PI / 2 + lerp(-1.25, 1.25, u) * fan + Math.sin((o.t || 0) * 1.6 + i) * 0.015;
    const len = 250 - Math.abs(u - 0.5) * 70;
    ctx.save(); ctx.translate(0, -70); ctx.rotate(a + Math.PI / 2);
    line(ctx, 0, 0, 0, -len + 20, 3, '#1A6B4A');
    shapeFill(ctx, pEllipse(0, -len + 40, 26, 62), '#1F9E68', { rim: '#7CF2BE', r: 3, light: [0, -1] });
    shapeFill(ctx, pEllipse(0, -len + 22, 20, 25), '#FFD244', {});
    ctx.fillStyle = '#22D7DA'; ctx.fill(pEllipse(0, -len + 24, 14, 17));
    ctx.fillStyle = '#0B1A6B'; ctx.fill(pEllipse(0, -len + 26, 8, 10));
    ctx.restore();
  }
  // body + neck
  const body = pEllipse(0, -60, 40, 58, 0);
  shapeFill(ctx, body, '#1E5BD8', { rim: L.rim, r: 4, shadow: L.shadow, s: 12, light: L.dir });
  const neck = pBlob([[-14, -96], [14, -96], [16, -140], [10, -170], [-10, -170], [-16, -140]]);
  shapeFill(ctx, neck, '#2470F0', { rim: L.rim, r: 3, light: L.dir });
  const head = pCircle(0, -178, 24);
  shapeFill(ctx, head, '#2470F0', { rim: L.rim, r: 3, shadow: L.shadow, s: 7, light: L.dir });
  // crest
  for (const a of [-0.35, 0, 0.35]) {
    ctx.save(); ctx.translate(0, -198); ctx.rotate(a);
    line(ctx, 0, 0, 0, -30, 2.5, '#1A3FA0'); circle(ctx, 0, -32, 6, '#22D7DA'); ctx.restore();
  }
  // face
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#FFFFFF'; ctx.fill(pEllipse(side * 10, -182, 7, 8));
    circle(ctx, side * 10 + (o.look?.[0] || 0) * 2, -181, 3.8, PAL.night);
    const bl = clamp(o.blink || 0);
    if (bl > 0.01) rrect(ctx, side * 10 - 8, -191, 16, 18 * bl, 2, '#2470F0');
  }
  shapeFill(ctx, pPoly([[-6, -172], [6, -172], [0, -160]]), '#C9D2EE', {});
  // folded wings
  for (const side of [-1, 1]) shapeFill(ctx, pEllipse(side * 32, -52, 14, 40, side * 0.15), '#173F9E', { rim: L.rim, r: 2, light: L.dir });
  ctx.restore();
}

// ---------------- Emblem: globe + stethoscope + laurel ----------------
function drawEmblem(ctx, x, y, s, t, build = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const g = (a, b) => E.outBack(clamp(inv(a, b, build)), 1.3);
  // laurel wreath: a stem arc per side with leaves alternating along it
  const lw = g(0.25, 0.85);
  const R = 172;
  for (const side of [-1, 1]) {
    const a0 = Math.PI / 2 + side * 0.32, a1 = Math.PI / 2 + side * lerp(0.32, 2.6, lw);
    ctx.beginPath(); ctx.arc(0, 0, R, Math.min(a0, a1), Math.max(a0, a1));
    ctx.lineWidth = 5; ctx.strokeStyle = '#E0A51C'; ctx.lineCap = 'round'; ctx.stroke();
    for (let i = 0; i < 11; i++) {
      const u = i / 10; if (u > lw) continue;
      const a = Math.PI / 2 + side * lerp(0.42, 2.5, u);
      const out = i % 2 ? 1 : -1;
      const lx = Math.cos(a) * (R + out * 14), ly = Math.sin(a) * (R + out * 14);
      ctx.save(); ctx.translate(lx, ly);
      ctx.rotate(a + side * Math.PI / 2 + out * side * 0.5);
      shapeFill(ctx, pEllipse(0, 0, 9, 22), PAL.yellow, { rim: '#FFF3C4', r: 2, shadow: 'rgba(160,90,0,0.35)', s: 4, light: [0.4, -1] });
      ctx.restore();
    }
  }
  // globe
  const gb = g(0, 0.45);
  ctx.save(); ctx.scale(gb, gb);
  const globe = pCircle(0, 0, 120);
  const gg = ctx.createLinearGradient(-120, -120, 120, 120); gg.addColorStop(0, '#33B9D7'); gg.addColorStop(1, '#243CDB');
  ctx.fillStyle = gg; ctx.fill(globe);
  ctx.save(); ctx.clip(globe);
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  for (const ry of [0.32, 0.66]) { ctx.beginPath(); ctx.ellipse(0, 0, 120, 120 * ry, 0, 0, TAU); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-120, 0); ctx.lineTo(120, 0); ctx.stroke();
  const rot = (t * 0.25) % 1;
  for (let k = 0; k < 4; k++) {
    const u = ((k / 4 + rot) % 1) * 2 - 1;
    ctx.beginPath(); ctx.ellipse(0, 0, Math.abs(u) * 120, 120, 0, 0, TAU); ctx.stroke();
  }
  // stylised continents drifting with the rotation
  ctx.fillStyle = 'rgba(61,220,151,0.85)';
  for (const [cx, cy, rx, ry] of [[-30, -40, 38, 26], [40, 10, 30, 44], [-55, 40, 26, 20], [70, -60, 24, 16]]) {
    const xx = ((cx + rot * 240 + 360) % 300) - 150;
    ctx.fill(pBlob([[xx - rx, cy], [xx - rx * 0.3, cy - ry], [xx + rx, cy - ry * 0.5], [xx + rx * 0.7, cy + ry * 0.6], [xx, cy + ry]]));
  }
  ctx.restore();
  crescent(ctx, globe, -0.6 * 7, 0.8 * 7, 'rgba(255,255,255,0.55)'); // rim (light from top-right)
  crescent(ctx, globe, 0.6 * 26, -0.8 * 26, 'rgba(9,14,60,0.3)');    // core shadow
  ctx.restore();
  // stethoscope wrapping the globe
  const st = g(0.45, 1);
  if (st > 0.01) {
    ctx.save(); ctx.globalAlpha *= clamp(st);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const tube = new Path2D();
    tube.moveTo(-46, -186); tube.quadraticCurveTo(-40, -150, 0, -146);
    tube.moveTo(46, -186); tube.quadraticCurveTo(40, -150, 0, -146);
    tube.moveTo(0, -146); tube.bezierCurveTo(150, -150, 168, 60, 80, 128); tube.quadraticCurveTo(30, 166, -36, 160);
    ctx.lineWidth = 15; ctx.strokeStyle = '#1B2160'; ctx.stroke(tube);
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(140,170,247,0.55)'; ctx.translate(2.5, -2.5); ctx.stroke(tube); ctx.translate(-2.5, 2.5);
    // ear tips
    for (const ex of [-46, 46]) shapeFill(ctx, pCircle(ex, -190, 9), '#C9D2EE', { rim: '#FFFFFF', r: 2, light: [0.6, -0.8] });
    // chest piece
    const cp = pCircle(-58, 160, 30);
    shapeFill(ctx, cp, '#D8DEF5', { rim: '#FFFFFF', r: 3, shadow: 'rgba(9,14,60,0.35)', s: 8, light: [0.6, -0.8] });
    ctx.fillStyle = '#8C98C8'; ctx.fill(pCircle(-58, 160, 17));
    ctx.fillStyle = '#AEB8E0'; ctx.fill(pCircle(-58, 160, 11));
    ctx.restore();
  }
  ctx.restore();
}

// ---------------- Committee icons (drawn in a ~120px box centred at 0,0) ----------------
function iconUNSC(ctx, col) { // shield protecting people
  const sh = pBlob([[0, -58], [48, -40], [44, 14], [0, 58], [-44, 14], [-48, -40]]);
  shapeFill(ctx, sh, col, { rim: 'rgba(255,255,255,0.6)', r: 4, shadow: 'rgba(9,14,60,0.3)', s: 10 });
  for (const [x, y, r] of [[-17, -8, 9], [17, -8, 9], [0, -16, 11]]) {
    circle(ctx, x, y, r, '#FFFFFF');
    ctx.fillStyle = '#FFFFFF'; ctx.fill(pEllipse(x, y + r * 2.5, r * 1.4, r * 1.2));
  }
}
function iconUNGA(ctx, col) { // balance scales
  line(ctx, 0, -50, 0, 44, 8, col); rrect(ctx, -30, 40, 60, 12, 6, col);
  line(ctx, -50, -36, 50, -36, 7, col); circle(ctx, 0, -50, 9, col);
  for (const sx of [-1, 1]) {
    line(ctx, sx * 46, -36, sx * 30, 4, 3, col); line(ctx, sx * 46, -36, sx * 62, 4, 3, col);
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(sx * 46, 4, 22, 12, 0, 0, Math.PI); ctx.fill();
  }
}
function iconWHO(ctx, col) { // shield with medical plus, virus outside
  const sh = pBlob([[0, -56], [46, -38], [42, 14], [0, 56], [-42, 14], [-46, -38]]);
  shapeFill(ctx, sh, col, { rim: 'rgba(255,255,255,0.6)', r: 4, shadow: 'rgba(9,14,60,0.3)', s: 10 });
  rrect(ctx, -9, -30, 18, 56, 4, '#FFFFFF'); rrect(ctx, -28, -11, 56, 18, 4, '#FFFFFF');
}
function iconLok(ctx, col) { // peacock feather
  ctx.save(); ctx.rotate(0.35);
  line(ctx, 0, 60, 0, -30, 4, '#1A6B4A');
  shapeFill(ctx, pEllipse(0, -18, 30, 52), col, { rim: '#9DF5CC', r: 3, shadow: 'rgba(9,40,30,0.35)', s: 8 });
  shapeFill(ctx, pEllipse(0, -34, 20, 24), PAL.yellow, {});
  ctx.fillStyle = '#22D7DA'; ctx.fill(pEllipse(0, -32, 14, 17));
  ctx.fillStyle = '#0B1A6B'; ctx.fill(pEllipse(0, -30, 8, 10));
  ctx.restore();
}
function virus(ctx, x, y, r, t, col = PAL.pink) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.6);
  for (let k = 0; k < 10; k++) {
    const a = k / 10 * TAU;
    line(ctx, Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8, Math.cos(a) * r * 1.35, Math.sin(a) * r * 1.35, r * 0.14, col);
    circle(ctx, Math.cos(a) * r * 1.4, Math.sin(a) * r * 1.4, r * 0.18, col);
  }
  shapeFill(ctx, pCircle(0, 0, r), col, { rim: 'rgba(255,220,240,0.8)', r: r * 0.12, shadow: 'rgba(60,0,40,0.35)', s: r * 0.35, light: [0.6, -0.8] });
  ctx.restore();
}
