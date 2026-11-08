// Original character designs, built from geometric parts so every body part
// is independently animatable (rigged by construction: no cut-out seams).
//
//  PIP   - a small round songbird: teal body, pink head tuft, orange beak.
//  ATLAS - a big front-facing eagle: plum body, white head, morphing wings.
//  Person - a simple diagrammatic human silhouette used in the danger demo.

const PIP_COL = {
  body: '#22D7DA', shade: '#14A3B5', deep: '#0E7F96', belly: '#B5F6F1',
  beak: '#FF851D', beakDark: '#D9620A', tuft: '#ED4BA4', eye: '#09134B', blush: '#ED4BA4',
};

const EXPR = {
  neutral:   { eyeR: 15, pupilR: 7.2, browY: 0,  browA: 0.08,  lowLid: 0,    topLid: 0,    beak: 0 },
  happy:     { eyeR: 15, pupilR: 7.2, browY: -5, browA: -0.1,  lowLid: 0.42, topLid: 0,    beak: 0.25 },
  surprised: { eyeR: 17.5, pupilR: 5, browY: -9, browA: -0.12, lowLid: 0,    topLid: 0,    beak: 0.55 },
  worried:   { eyeR: 15, pupilR: 7,   browY: -3, browA: 0.42,  lowLid: 0,    topLid: 0.22, beak: 0.1 },
  confused:  { eyeR: 15, pupilR: 6.6, browY: -7, browA: -0.32, lowLid: 0,    topLid: 0.1,  beak: 0.05 },
  proud:     { eyeR: 15, pupilR: 7.2, browY: -3, browA: 0.0,   lowLid: 0.3,  topLid: 0.25, beak: 0 },
};
function exprMix(a, b = a, k = 0) {
  const A = EXPR[a], B = EXPR[b], o = {};
  for (const key in A) o[key] = lerp(A[key], B[key], clamp(k));
  return o;
}

// o: x,y (feet), s scale, flip (1 right / -1 left), tilt (body lean, rad),
// head (head turn, rad), sq (squash +, stretch -), blink 0..1, look [dx,dy],
// wing (near-wing angle, rad; negative raises forward), wingFar (far wing),
// legs (leg length factor), expr / expr2 / exprK, perched (toes curl),
// reach (extra wing stretch length, for cartoon stretches), outline (blueprint mode).
function drawPip(ctx, o) {
  const s = o.s ?? 1, flip = o.flip ?? 1, sq = o.sq ?? 0;
  const ex = exprMix(o.expr || 'neutral', o.expr2, o.exprK || 0);
  const beakOpen = clamp((o.beak ?? 0) + ex.beak);
  const legLen = 24 * (o.legs ?? 1);
  const C = o.colors || PIP_COL;
  const bp = o.outline; // blueprint: draw outlines only
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.scale(s * flip, s);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;

  const F = (col) => (bp ? 'rgba(0,0,0,0)' : col);
  const strokeIt = () => { if (bp) { ctx.lineWidth = 3 / s; ctx.strokeStyle = bp; ctx.stroke(); } };

  // legs + toes (not squashed)
  const legCol = bp || C.beak;
  for (const lx of [-10, 9]) {
    line(ctx, lx, -legLen, lx + 1, -2, 5, legCol);
    if (o.perched !== false) {
      ctx.beginPath(); ctx.arc(lx + 4, 3, 7, Math.PI * 1.05, Math.PI * 2.05);
      ctx.lineWidth = 4.5; ctx.strokeStyle = legCol; ctx.lineCap = 'round'; ctx.stroke();
    } else {
      line(ctx, lx + 1, -2, lx + 13, 0, 4.5, legCol); line(ctx, lx + 1, -2, lx - 7, 0, 4.5, legCol);
    }
  }

  // body group (squash/stretch about the hips)
  ctx.translate(0, -legLen);
  ctx.rotate(o.tilt || 0);
  const sy = 1 - sq, sx = 1 + sq * 0.65;
  ctx.scale(sx, sy);

  // far wing (peeks out behind the body)
  if (o.wingFar !== undefined) {
    ctx.save(); ctx.translate(14, -66); ctx.rotate(o.wingFar);
    blob(ctx, [[2, -6], [10, 12], [6, 36], [-8, 48], [-18, 32], [-14, 6], [-6, -8]], F(C.deep)); strokeIt();
    ctx.restore();
  }

  // tail
  poly(ctx, [[-30, -30], [-84, -62], [-90, -46], [-38, -16]], F(C.deep)); strokeIt();
  poly(ctx, [[-30, -34], [-78, -74], [-86, -60], [-36, -22]], F(C.shade)); strokeIt();

  // body egg + belly
  ctx.beginPath(); ctx.ellipse(0, -56, 47, 55, 0.12, 0, TAU);
  ctx.fillStyle = F(C.body); ctx.fill(); strokeIt();
  if (!bp) {
    ctx.save(); ctx.clip();
    ellipse(ctx, 18, -34, 32, 36, 0.25, C.belly);
    ellipse(ctx, -30, -40, 30, 60, 0.1, rgba('#0E7F96', 0.18));
    ctx.restore();
  }

  // head features rotate together (gives a convincing head turn on a round bird)
  ctx.save();
  ctx.translate(6, -72); ctx.rotate(o.head || 0); ctx.translate(-6, 72);

  // tuft
  for (const [a, l] of [[-0.55, 20], [-0.1, 26], [0.35, 20]]) {
    ctx.save(); ctx.translate(-6, -104); ctx.rotate(a + (o.tuft || 0));
    blob(ctx, [[0, 2], [6, -l * 0.5], [0, -l], [-6, -l * 0.5]], F(C.tuft)); strokeIt();
    ctx.restore();
  }

  // eye
  const er = ex.eyeR, eyeX = 21, eyeY = -78;
  const look = o.look || [0, 0];
  if (bp) {
    ctx.beginPath(); ctx.arc(eyeX, eyeY, er, 0, TAU); strokeIt();
    circle(ctx, eyeX + look[0] * 4, eyeY + look[1] * 4, ex.pupilR, bp);
  } else {
    circle(ctx, eyeX, eyeY, er + 3, C.shade);
    circle(ctx, eyeX, eyeY, er, '#FFFFFF');
    const px = eyeX + look[0] * (er - ex.pupilR - 2), py = eyeY + look[1] * (er - ex.pupilR - 2);
    circle(ctx, px, py, ex.pupilR, C.eye);
    circle(ctx, px - 2.2, py - 2.6, ex.pupilR * 0.33, '#FFFFFF');
    // lids (clipped to the eye)
    ctx.save(); ctx.beginPath(); ctx.arc(eyeX, eyeY, er + 0.5, 0, TAU); ctx.clip();
    const top = clamp(Math.max(ex.topLid, o.blink || 0));
    if (top > 0.001) rrect(ctx, eyeX - er - 2, eyeY - er - 2, er * 2 + 4, (er * 2 + 4) * top, 2, C.body);
    if (ex.lowLid > 0.001 && (o.blink || 0) < 0.9) {
      ctx.beginPath(); ctx.ellipse(eyeX, eyeY + er * 2.05 - ex.lowLid * er * 1.25, er * 1.5, er * 1.25, 0, 0, TAU);
      ctx.fillStyle = C.body; ctx.fill();
    }
    ctx.restore();
  }
  // brow
  ctx.save(); ctx.translate(eyeX, eyeY - er - 7 + ex.browY); ctx.rotate(ex.browA);
  line(ctx, -11, 0, 11, 0, 5, bp || C.eye); ctx.restore();

  // blush
  if (!bp) circle(ctx, 16, -56, 7, rgba(C.blush, 0.38));

  // beak (two halves; opens by rotating the lower half)
  ctx.save(); ctx.translate(41, -69);
  poly(ctx, [[0, -9], [27, -1 - beakOpen * 3], [0, 3]], F(C.beak)); strokeIt();
  ctx.rotate(beakOpen * 0.45);
  poly(ctx, [[0, 1], [22, 2], [0, 9]], F(C.beakDark)); strokeIt();
  ctx.restore();
  ctx.restore(); // head

  // near wing (pivot at shoulder). reach lengthens it for cartoon stretches.
  ctx.save(); ctx.translate(-8, -62); ctx.rotate(o.wing || 0);
  const r = o.reach || 0;
  blob(ctx, [[5, -7], [12, 12], [7, 40 + r * 0.9], [-9, 56 + r], [-24, 40 + r * 0.9], [-21, 8], [-9, -9]], F(C.shade));
  strokeIt();
  if (!bp) {
    line(ctx, -4, 14, -6, 38 + r * 0.8, 3, rgba('#0E7F96', 0.55));
    line(ctx, -13, 12, -15, 34 + r * 0.8, 3, rgba('#0E7F96', 0.55));
  }
  ctx.restore();

  ctx.restore();
}
// Wingtip position in world space for a given wing angle/reach (for circuit paths).
function pipWingTip(o) {
  const s = o.s ?? 1, flip = o.flip ?? 1, legLen = 24 * (o.legs ?? 1);
  const a = o.wing || 0, r = o.reach || 0;
  const lx = -9, ly = 56 + r;
  const wx = -8 + lx * Math.cos(a) - ly * Math.sin(a);
  const wy = -62 + lx * Math.sin(a) + ly * Math.cos(a);
  return [o.x + wx * s * flip, o.y + (wy - legLen) * s];
}

// ---------------- ATLAS the eagle (front view) ----------------
const EAGLE_COL = {
  body: '#4A2A63', chest: '#5F3B7E', wing: '#371C4E', covert: '#6E4C91', head: '#F3F0FF',
  headShade: '#C9C3EE', beak: '#FFD244', beakDark: '#E0A51C', eye: '#FFD244', pupil: '#09134B', feet: '#FFD244',
};
// right wing outline: folded vs spread (same point count -> smooth shape morph)
const WING_FOLD = [[40, -175], [66, -168], [80, -150], [86, -125], [88, -100], [86, -86], [86, -72], [82, -62], [80, -52], [74, -48], [68, -46], [62, -56], [57, -80], [52, -110], [46, -135]];
const WING_SPREAD = [[40, -178], [150, -238], [262, -252], [360, -234], [400, -200], [366, -184], [390, -162], [352, -152], [364, -126], [322, -126], [324, -100], [272, -108], [200, -112], [120, -108], [52, -122]];

// o: x,y (feet), s, spread 0..1, flap (rad), blink, look, expr ('neutral'|'happy'|'worried'), lean, sq, beak
function drawAtlas(ctx, o) {
  const s = o.s ?? 1, k = clamp(o.spread ?? 0), C = EAGLE_COL;
  ctx.save();
  ctx.translate(o.x, o.y); ctx.scale(s, s);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;

  const sq = o.sq || 0;
  ctx.translate(0, -26); ctx.rotate(o.lean || 0); ctx.scale(1 + sq * 0.5, 1 - sq);

  // wings (behind body)
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side, 1);
    ctx.translate(40, -150); ctx.rotate((o.flap || 0) * k); ctx.translate(-40, 150);
    const pts = WING_FOLD.map((p, i) => [lerp(p[0], WING_SPREAD[i][0], k), lerp(p[1], WING_SPREAD[i][1], k) + 26]);
    poly(ctx, pts, C.wing);
    // covert band along the top of the wing
    const band = [0, 1, 2, 3].map(i => pts[i]).concat([0, 1, 2, 3].reverse().map(i => [pts[i][0], pts[i][1] + lerp(10, 34, k)]));
    poly(ctx, band, C.covert);
    ctx.restore();
  }

  // white tail fan
  poly(ctx, [[-24, -30], [-32, 6], [0, 12], [32, 6], [24, -30]], C.head);
  // body + chest
  ellipse(ctx, 0, -96, 66, 92, 0, C.body);
  ellipse(ctx, 0, -84, 40, 60, 0, C.chest);
  // talons (in front of the tail, below the body)
  for (const fx of [-24, 24]) {
    line(ctx, fx, -10, fx, 18, 9, C.feet);
    for (const d of [-12, 0, 12]) line(ctx, fx, 18, fx + d, 26, 7, C.feet);
  }
  // chest feather chevrons
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(-18, -100 + i * 22); ctx.lineTo(0, -90 + i * 22); ctx.lineTo(18, -100 + i * 22);
    ctx.lineWidth = 4; ctx.strokeStyle = rgba('#2B1640', 0.45); ctx.lineCap = 'round'; ctx.stroke();
  }
  // head
  ctx.save(); ctx.translate(0, -170); ctx.rotate(o.head || 0); ctx.translate(0, 170);
  ellipse(ctx, 0, -168, 44, 30, 0, C.headShade);
  circle(ctx, 0, -196, 48, C.head);
  const ex = o.expr || 'neutral';
  const look = o.look || [0, 0];
  for (const side of [-1, 1]) {
    const exx = side * 19, eyy = -204;
    circle(ctx, exx, eyy, 10.5, C.eye);
    circle(ctx, exx + look[0] * 3, eyy + look[1] * 3, 5.5, C.pupil);
    circle(ctx, exx + look[0] * 3 - 1.8, eyy + look[1] * 3 - 2, 1.8, '#FFFFFF');
    const bl = clamp(o.blink || 0);
    if (bl > 0.01) { ctx.save(); ctx.beginPath(); ctx.arc(exx, eyy, 11, 0, TAU); ctx.clip(); rrect(ctx, exx - 12, eyy - 12, 24, 24 * bl, 2, C.head); ctx.restore(); }
    // brow: stern by default, softer when happy, raised when worried
    const a = ex === 'happy' ? 0.12 : ex === 'worried' ? 0.45 : -0.25;
    const yo = ex === 'worried' ? -6 : ex === 'happy' ? -5 : 0;
    ctx.save(); ctx.translate(exx, eyy - 15 + yo); ctx.rotate(a * side);
    line(ctx, -12, 0, 12, 0, 6, '#2B1640'); ctx.restore();
  }
  // hooked beak
  const bo = clamp((o.beak || 0) + (ex === 'worried' ? 0.15 : 0));
  poly(ctx, [[-15, -190], [15, -190], [9, -168], [0, -158], [-9, -168]], C.beak);
  poly(ctx, [[-6, -168], [6, -168], [0, -155]], C.beakDark);
  if (bo > 0.02) poly(ctx, [[-9, -172], [9, -172], [0, -172 + bo * 16]], '#2B1640');
  ctx.restore();

  ctx.restore();
}
// world-space wingtip positions [left, right] for circuit / contact highlights
function atlasWingTips(o) {
  const s = o.s ?? 1, k = clamp(o.spread ?? 0);
  const tip = [lerp(WING_FOLD[4][0], WING_SPREAD[4][0], k), lerp(WING_FOLD[4][1], WING_SPREAD[4][1], k) + 26 - 26];
  return [[o.x - tip[0] * s, o.y + tip[1] * s], [o.x + tip[0] * s, o.y + tip[1] * s]];
}

// ---------------- Person (diagram silhouette holding a metal pole) ----------------
function drawPerson(ctx, o) {
  const s = o.s ?? 1, col = o.col || PAL.sky;
  ctx.save(); ctx.translate(o.x, o.y); ctx.scale(s, s);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  // legs
  line(ctx, -14, -80, -18, -4, 22, col); line(ctx, 14, -80, 18, -4, 22, col);
  // body
  rrect(ctx, -32, -170, 64, 100, 26, col);
  // head
  circle(ctx, 0, -200, 27, col);
  // arms raised, holding pole
  const hx = 12 + (o.lift || 0) * 4, hy = -250;
  line(ctx, -22, -155, hx - 6, hy + 16, 16, col);
  line(ctx, 22, -155, hx + 4, hy - 22, 16, col);
  ctx.restore();
}
