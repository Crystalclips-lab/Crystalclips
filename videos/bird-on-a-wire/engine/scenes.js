// Timeline: scenes, camera paths, character performance and transitions.
// All cue times derive from the narration timings (TIMINGS) so motion stays
// locked to the voiceover. EV collects every timed event for the sound mix.

const TM = window.TIMINGS;
const LN = Object.fromEntries(TM.lines.map(l => [l.id, l]));
const S = id => LN[id].start, En = id => LN[id].end;
const EV = [];
const ev = (t, type, extra = {}) => EV.push({ t: +t.toFixed(3), type, ...extra });
TM.lines.forEach(l => ev(l.start, 'line', { id: l.id, end: l.end, text: l.text }));

// ---------------------------------------------------------------------------
// SCENE 1: DUSK — hook, danger demo, the question
// ---------------------------------------------------------------------------
const PIP_X = 1150;
const LAND = 1.45;
const HOOK = {
  whip1: S('L3') - 0.05, whip2: S('L4') - 0.08, q: S('L4') + 0.55,
  touch: S('L3') + 0.72, zapL: S('L3') + 0.85, kill: S('L3') + 2.3,
  volts: S('L1') + 1.35, notice: S('L2') + 0.35,
};
ev(0.05, 'whoosh', { gain: 0.5 }); ev(0.1, 'flutter', { dur: LAND - 0.1 }); ev(LAND, 'land'); ev(LAND + 0.02, 'twang');
ev(HOOK.volts - 0.05, 'surge'); ev(HOOK.volts, 'pop');
ev(HOOK.notice + 0.25, 'tweet');
ev(HOOK.whip1, 'whip'); ev(HOOK.touch, 'zap'); ev(HOOK.zapL, 'buzz', { dur: S('L4') - HOOK.zapL - 0.3 });
ev(S('L3') + 1.05, 'pop', { gain: 0.6 }); ev(HOOK.kill, 'impact'); ev(HOOK.kill + 0.02, 'pop');
ev(HOOK.whip2, 'whip'); ev(HOOK.q, 'pop'); ev(HOOK.q + 0.05, 'boing', { gain: 0.5 });

function hookCam(t) {
  return camPath(t, [
    { t: 0, x: 1060, y: 560, z: 1.0 },
    { t: LAND, x: 1100, y: 560, z: 1.08, ease: E.ioQ },
    { t: HOOK.whip1, x: PIP_X + 10, y: 540, z: 1.5, ease: E.ioSine },
    { t: HOOK.whip1 + 0.42, x: 1660, y: 780, z: 1.22, ease: E.ioQuint },
    { t: HOOK.whip2, x: 1690, y: 770, z: 1.34, ease: E.ioSine },
    { t: HOOK.whip2 + 0.4, x: PIP_X + 10, y: 520, z: 1.65, ease: E.ioQuint },
    { t: S('L5') + 0.4, x: PIP_X + 10, y: 500, z: 1.85, ease: E.ioSine },
  ]);
}

function hookPip(t) {
  const o = { x: PIP_X, y: 0, s: 1, flip: 1, blink: blinkAt(t, 3), expr: 'neutral', perched: true };
  if (t < LAND) {
    // flight path (quadratic bezier) with flapping
    const u = E.outQ(prog(t, 0, LAND));
    const p0 = [-180, 230], p1 = [560, 80], p2 = [PIP_X, wireY(1, PIP_X)];
    o.x = (1 - u) ** 2 * p0[0] + 2 * (1 - u) * u * p1[0] + u * u * p2[0];
    o.y = (1 - u) ** 2 * p0[1] + 2 * (1 - u) * u * p1[1] + u * u * p2[1];
    const flap = Math.sin(t * TAU * 7);
    o.wing = 2.35 + flap * 0.75; o.wingFar = 2.2 + flap * 0.7;
    o.tilt = lerp(-0.35, 0.05, u); o.perched = false;
    o.legs = lerp(0.5, 1.35, prog(t, LAND - 0.3, LAND));
    if (t > LAND - 0.22) { o.wing = lerp(o.wing, 2.9, prog(t, LAND - 0.22, LAND - 0.05)); o.sq = -0.12; }
    o.expr = 'happy';
    return o;
  }
  const dt = t - LAND;
  const bounce = wireBounce(t);
  o.y = wireY(1, PIP_X, bounce, PIP_X);
  o.sq = 0.26 * Math.exp(-6 * dt) * Math.cos(TAU * 2.6 * dt) + 0.015 * Math.sin(t * 2.6);
  o.wing = lerp(2.9, 0, E.outBack(prog(dt, 0, 0.5))) + Math.exp(-5 * dt) * Math.sin(dt * 20) * 0.2;
  o.head = noise1(t * 0.6, 4) * 0.08;
  o.look = [0.3 + noise1(t * 0.5, 2) * 0.3, noise1(t * 0.4, 8) * 0.3];
  // "doesn't even notice": turn to camera, smug & happy, tiny wing shrug
  const n = prog(t, HOOK.notice - 0.2, HOOK.notice + 0.15);
  if (n > 0) {
    o.look = [lerp(o.look[0], -0.15, n), lerp(o.look[1], 0.25, n)];
    o.head = lerp(o.head, -0.12, E.ioQ(n));
    o.expr2 = 'happy'; o.exprK = n;
    o.wing += -0.5 * pulse(t, HOOK.notice + 0.2, HOOK.notice + 0.9, 0.2);
    o.tuft = 0.15 * Math.sin(t * 8) * pulse(t, HOOK.notice, HOOK.notice + 1.2, 0.2);
  }
  // the question: confused head tilt
  const q = prog(t, HOOK.whip2 + 0.2, HOOK.whip2 + 0.6);
  if (q > 0) {
    o.expr = 'confused'; o.expr2 = undefined; o.exprK = 0;
    o.head = lerp(o.head, 0.24, E.outBack(q));
    o.look = [0.4, -0.6];
    const shrug = E.outBack(prog(t, HOOK.q, HOOK.q + 0.35)) * (1 - prog(t, S('L5') - 0.2, S('L5') + 0.4));
    o.wing = -1.25 * shrug; o.reach = 22 * shrug;
  }
  o.blink = blinkAt(t, 3, [HOOK.notice + 0.05]);
  return o;
}
function wireBounce(t) {
  const dt = t - LAND;
  if (dt <= 0) return 0;
  return 26 * Math.exp(-2.4 * dt) * Math.cos(TAU * 2.1 * dt) * (1 - Math.exp(-40 * dt));
}

const PERSON = { x: 1740, y: 1000, s: 1.25 };
function rodGeom(t) {
  // rod pivots in the hands, rising to touch wire B
  const hands = [PERSON.x + 14 * PERSON.s, PERSON.y - 250 * PERSON.s];
  const tipX = PERSON.x + 90;
  const tipY = wireY(1, tipX);
  const k = E.outBack(prog(t, HOOK.whip1 + 0.25, HOOK.touch), 1.2);
  const ang0 = Math.atan2(tipY - hands[1], tipX - hands[0]);
  const ang = lerp(ang0 + 0.9, ang0, k);
  const len = Math.hypot(tipX - hands[0], tipY - hands[1]);
  return { hands, tip: [hands[0] + Math.cos(ang) * len, hands[1] + Math.sin(ang) * len] };
}

function drawHook(ctx, t) {
  const cam = hookCam(t), sh = drift(t, 5);
  const camD = { ...cam, x: cam.x + sh[0], y: cam.y + sh[1] };
  const pip = hookPip(t);
  const energy = 0.55 + 0.6 * pulse(t, HOOK.volts - 0.1, HOOK.volts + 1.6, 0.3);
  const shakeAmt = 10 * Math.exp(-8 * Math.max(0, t - HOOK.kill)) * (t > HOOK.kill ? 1 : 0);
  const shake = [Math.sin(t * 90) * shakeAmt, Math.cos(t * 77) * shakeAmt];
  drawDuskWorld(ctx, camD, t, {
    energy, bounce: [0, wireBounce(t), 0], bounceX: PIP_X, shake,
    actors: (c) => {
      // --- danger demo: person with metal rod ---
      if (t > HOOK.whip1 - 0.2 && t < HOOK.whip2 + 0.6) {
        const r = rodGeom(t);
        const live = t > HOOK.touch;
        const hot = live ? 0.55 + 0.45 * Math.sin(t * 40) : 0;
        drawPerson(c, { ...PERSON, col: live ? mixColor('#8CAAF7', '#C9A3FF', 0.4 * hot) : '#8CAAF7' });
        line(c, r.hands[0] - 30, r.hands[1] + 36, r.tip[0], r.tip[1], 9, '#C9D3FF');
        if (live) {
          // current path: wire -> rod -> body -> ground
          const path = [r.tip, r.hands, [PERSON.x, PERSON.y - 150 * PERSON.s], [PERSON.x - 16, PERSON.y - 4], [PERSON.x + 16, PERSON.y - 4]];
          drawCurrentPath(c, path.slice(0, 4), t, PAL.pink, 1, 700, 5);
          drawCurrentPath(c, [path[2], path[4]], t, PAL.pink, 1, 700, 5);
          glow(c, r.tip[0], r.tip[1], 90, PAL.pink, 0.6 + 0.4 * Math.sin(t * 50));
          for (let k = 0; k < 3; k++) {
            const ph = ((t - HOOK.touch) * 1.4 + k / 3) % 1;
            c.beginPath(); c.ellipse(PERSON.x, PERSON.y + 4, 40 + ph * 260, 10 + ph * 50, 0, 0, TAU);
            c.lineWidth = 5; c.strokeStyle = rgba(PAL.pink, (1 - ph) * 0.8); c.stroke();
          }
          // ground symbol
          const gt = t - (S('L3') + 1.05);
          if (gt > 0) {
            const s = spring(gt, 2.5, 0.5);
            c.save(); c.translate(PERSON.x + 120, PERSON.y + 30); c.scale(s, s);
            for (let k = 0; k < 3; k++) line(c, -34 + k * 11, k * 13, 34 - k * 11, k * 13, 7, PAL.yellow);
            line(c, 0, -28, 0, 0, 7, PAL.yellow); c.restore();
          }
        }
        if (t > HOOK.kill) {
          const s = spring(t - HOOK.kill, 2.4, 0.4);
          c.save(); c.translate(PERSON.x - 190, PERSON.y - 420); c.scale(s, s);
          poly(c, [[0, -70], [78, 62], [-78, 62]], PAL.yellow);
          poly(c, [[0, -52], [62, 52], [-62, 52]], PAL.pink);
          c.font = '900 84px Montserrat'; c.fillStyle = PAL.white; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', 0, 18);
          c.restore();
        }
      }
      drawPip(c, pip);
      // music-note whistle (doesn't even notice)
      if (t > HOOK.notice + 0.2 && t < HOOK.notice + 2) {
        for (let k = 0; k < 3; k++) {
          const lt = t - HOOK.notice - 0.25 - k * 0.22;
          if (lt < 0 || lt > 1.1) continue;
          const a = Math.sin(Math.PI * clamp(lt / 1.1));
          const nx = PIP_X + 70 + lt * 70 + k * 18, ny = pip.y - 150 - lt * 90;
          c.save(); c.globalAlpha = a;
          ellipse(c, nx, ny, 11, 8, -0.4, PAL.yellow); line(c, nx + 9, ny - 2, nx + 9, ny - 36, 4, PAL.yellow);
          line(c, nx + 9, ny - 36, nx + 22, ny - 30, 4, PAL.yellow); c.restore();
        }
      }
      // "?" over Pip
      if (t > HOOK.q) {
        const s = spring(t - HOOK.q, 2.2, 0.38);
        c.save(); c.translate(PIP_X + 10, pip.y - 225 + Math.sin(t * 3) * 6); c.scale(s, s); c.rotate(0.12 * Math.sin(t * 2.5));
        c.font = '900 120px Montserrat'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = PAL.ink; c.fillText('?', 4, 8); c.fillStyle = PAL.yellow; c.fillText('?', 0, 0);
        c.restore();
      }
      // volts label
      const vt = t - HOOK.volts;
      if (vt > 0 && t < HOOK.whip1 + 0.3) {
        label(c, '7,200 VOLTS', PIP_X + 300, wireY(1, PIP_X + 300) - 70, vt, { size: 32, bg: PAL.yellow, out: HOOK.whip1 - 0.35 - HOOK.volts, tip: [PIP_X + 300, wireY(1, PIP_X + 300) - 6] });
      }
    },
  });
  // danger flash tint
  const fl = pulse(t, HOOK.kill - 0.02, HOOK.kill + 0.5, 0.06);
  if (fl > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = rgba(PAL.pink, 0.28 * fl); ctx.fillRect(0, 0, W, H); }
  return { cam, prevCam: hookCam(t - 1 / FPS) };
}

// glowing path with marching pulses (used for every circuit)
function drawCurrentPath(ctx, pts, t, col, a = 1, speed = 900, width = 8) {
  ctx.save();
  ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.globalAlpha = a;
  ctx.lineWidth = width * 3; ctx.strokeStyle = rgba(col, 0.25); ctx.stroke();
  ctx.lineWidth = width; ctx.strokeStyle = col; ctx.stroke();
  ctx.setLineDash([18, 34]); ctx.lineDashOffset = -t * speed; ctx.lineWidth = width * 0.6; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// SCENE 2: LAB — pressure analogy
// ---------------------------------------------------------------------------
const LAB = {
  t0: S('L5') - 0.6, title: S('L5') + 0.25, labels: S('L6') + 2.0, points: S('L6') + 3.5,
  valve: S('L6') + 4.35, eq: S('L7') - 0.25,
};
ev(LAB.title, 'pop'); ev(LAB.labels, 'pop'); ev(LAB.labels + 0.15, 'pop'); ev(LAB.points, 'sparkle');
ev(LAB.valve, 'click'); ev(LAB.valve + 0.15, 'water', { dur: LAB.eq - LAB.valve });

function labState(t) {
  const f = E.ioQ(prog(t, LAB.valve + 0.15, LAB.eq));
  const L = lerp(370, 225, f), R = lerp(80, 225, f);
  const flow = pulse(t, LAB.valve + 0.1, LAB.eq + 0.35, 0.3) * (1 - f * 0.85);
  // integrate flow position analytically-ish: proportional to elapsed flow time
  const flowPos = Math.max(0, t - LAB.valve) * 0.9;
  return {
    levelL: L, levelR: R, gaugeL: spring(t - LAB.t0 - 0.6, 1.5, 0.4) * L / 420, gaugeR: spring(t - LAB.t0 - 0.75, 1.5, 0.4) * R / 420,
    labelT: t - LAB.labels, flow, flowPos, pipeFull: true,
    valve: E.outBack(prog(t, LAB.valve, LAB.valve + 0.4)),
    points: pulse(t, LAB.points, LAB.valve + 0.2, 0.15),
  };
}
function labCam(t) {
  return camPath(t, [
    { t: LAB.t0, x: 1150, y: 500, z: 1.4 },
    { t: S('L5') + 1.2, x: 980, y: 560, z: 1.02, ease: E.ioC },
    { t: LAB.valve, x: 960, y: 590, z: 1.0, ease: E.ioSine },
    { t: S('L7'), x: 960, y: 640, z: 1.12, ease: E.ioSine },
  ]);
}
function drawLabScene(ctx, t) {
  const cam = labCam(t), d = drift(t, 4, 3);
  const st = labState(t);
  st.actors = (c) => {
    // Pip presents the experiment
    const pt = t - LAB.t0;
    const point = pulse(t, S('L5') + 0.2, S('L6') + 1.5, 0.3);
    const happy = prog(t, LAB.valve + 0.4, LAB.valve + 0.8);
    drawPip(c, {
      x: 1640, y: 960, s: 1.25, flip: -1, blink: blinkAt(t, 9), perched: false,
      wing: -1.7 * E.outBack(point) + Math.sin(t * 5) * 0.08 * point - 0.6 * pulse(t, LAB.points, LAB.points + 1, 0.2),
      reach: 34 * point,
      head: noise1(t * 0.7, 3) * 0.06 + (t > LAB.points ? 0.1 : 0),
      look: t < S('L6') ? [-0.2, 0.25] : [0.9, 0.2],
      sq: 0.02 * Math.sin(t * 3) - 0.08 * pulse(t, LAB.valve + 0.4, LAB.valve + 0.8, 0.15),
      expr: 'neutral', expr2: 'happy', exprK: Math.max(happy, 0.4 * point),
    });
    if (st.labelT > -1) {
      // "DIFFERENCE" bracket between the two gauges
    }
  };
  drawLab(ctx, { ...cam, x: cam.x + d[0], y: cam.y + d[1] }, t, st);
  // title
  applyCam(ctx, { x: W / 2, y: H / 2, z: 1 }, 0);
  const tt = t - LAB.title;
  if (tt > 0) popText(ctx, 'VOLTAGE  ≈  PRESSURE', W / 2, 96, tt, { size: 70, out: LAB.labels - 0.5 - LAB.title, color: PAL.white });
  return { cam };
}

// ---------------------------------------------------------------------------
// SCENE 3: MACRO — same voltage at both feet, the easy path
// ---------------------------------------------------------------------------
const MAC = {
  t0: S('L7'), cut: S('L7') + 0.42, grip: S('L7') + 0.55, m1: S('L7') + 2.45, m2: S('L7') + 2.75,
  diff: S('L8') + 0.08, noflow: S('L8') + 0.8, out: S('L9') - 0.3, easy: S('L9') + 0.4, hard: S('L9') + 2.2, hardLbl: S('L9') + 2.75,
  exit: S('L10') - 0.4,
};
ev(MAC.t0 - 0.05, 'riser', { dur: 0.45 }); ev(MAC.cut, 'impact', { gain: 0.5 }); ev(MAC.grip, 'squish');
ev(MAC.m1, 'pop'); ev(MAC.m2, 'pop'); ev(MAC.diff, 'pop'); ev(MAC.noflow, 'pop', { gain: 0.7 });
ev(MAC.out, 'whoosh', { gain: 0.35 }); ev(MAC.easy, 'sparkle'); ev(MAC.hard, 'pop', { gain: 0.5 }); ev(MAC.hardLbl, 'pop');
ev(MAC.exit, 'whip');

function macroCam(t) {
  if (t < MAC.cut) {
    // crash zoom on Pip's feet in the dusk world
    return camPath(t, [
      { t: MAC.t0, x: PIP_X, y: 520, z: 1.7 },
      { t: MAC.cut, x: PIP_X, y: wireY(1, PIP_X) - 6, z: 6.5, ease: E.inExpo },
    ]);
  }
  return camPath(t, [
    { t: MAC.cut, x: 960, y: 560, z: 1.45 },
    { t: MAC.cut + 0.7, x: 960, y: 540, z: 1.0, ease: E.outExpo },
    { t: MAC.out, x: 960, y: 520, z: 1.04, ease: E.ioSine },
    { t: MAC.easy + 0.9, x: 760, y: 600, z: 1.22, ease: E.ioC },
    { t: MAC.exit, x: 720, y: 560, z: 1.3, ease: E.ioSine },
    { t: MAC.exit + 0.45, x: 960, y: 540, z: 0.55, ease: E.inExpo },
  ]);
}
function drawMacroScene(ctx, t) {
  const cam = macroCam(t), d = drift(t, 4, 5);
  if (t < MAC.cut) {
    const pip = { x: PIP_X, y: wireY(1, PIP_X), s: 1, blink: blinkAt(t, 3), expr: 'neutral', look: [0.2, 0.7], head: -0.1, perched: true };
    drawDuskWorld(ctx, cam, t, { energy: 0.8, actors: c => drawPip(c, pip) });
    return { cam, prevCam: macroCam(t - 1 / FPS) };
  }
  const flowSpeed = 1 + 0.7 * prog(t, MAC.easy - 0.2, MAC.easy + 0.6);
  drawMacro(ctx, { ...cam, x: cam.x + d[0], y: cam.y + d[1] }, t, {
    cut: 1, flow: 1, speed: flowSpeed, legPath: prog(t, MAC.hard, MAC.hard + 0.6),
    actors: (c) => {
      // toes grip squash
      const g = Math.exp(-7 * Math.max(0, t - MAC.grip)) * Math.sin(Math.max(0, t - MAC.grip) * 24) * (t > MAC.grip ? 1 : 0);
      if (g) for (const fx of MACRO.feet) ellipse(c, fx, MACRO.wireY - MACRO.wireR - 6, 50 + g * 12, 22 - g * 6, 0, rgba('#FF9A3D', 0.6));
      // voltmeters over each foot
      const mOut = (t > MAC.out) ? E.inBack(prog(t, MAC.out, MAC.out + 0.3)) : 0;
      if (mOut < 0.995) {
        c.save(); c.globalAlpha = 1 - mOut;
        drawMeter(c, MACRO.feet[0] - 210, 400, t - MAC.m1, 0.82 * spring(t - MAC.m1 - 0.1, 1.6, 0.35), '7,200 V');
        drawMeter(c, MACRO.feet[1] + 210, 400, t - MAC.m2, 0.82 * spring(t - MAC.m2 - 0.1, 1.6, 0.35), '7,200 V');
        // difference readout between them
        if (t > MAC.diff) {
          drawMeter(c, 960, 250, t - MAC.diff, 0, '0 V', { col: PAL.pink, bg: PAL.yellow });
          label(c, 'DIFFERENCE', 960, 118, t - MAC.diff - 0.05, { size: 26, bg: PAL.night, fg: PAL.yellow });
          // dashed links from each meter to the difference readout
          c.setLineDash([12, 10]); c.lineWidth = 5; c.strokeStyle = rgba(PAL.yellow, clamp((t - MAC.diff) * 3));
          c.beginPath(); c.moveTo(MACRO.feet[0] - 90, 330); c.lineTo(840, 250); c.moveTo(1080, 250); c.lineTo(MACRO.feet[1] + 90, 330); c.stroke(); c.setLineDash([]);
        }
        if (t > MAC.noflow) label(c, 'NO DIFFERENCE  =  NO FLOW', 960, 548, t - MAC.noflow, { size: 40, bg: PAL.night, fg: PAL.white, px: 34, py: 18 });
        c.restore();
      }
      if (t > MAC.easy) label(c, 'EASY PATH: METAL', 1240, MACRO.wireY, t - MAC.easy, { size: 30, bg: PAL.teal, fg: PAL.night });
      if (t > MAC.hardLbl) label(c, 'HARD PATH: BIRD', MACRO.feet[0] + 210, 360, t - MAC.hardLbl, { size: 30, bg: PAL.pink, fg: PAL.white, tip: [MACRO.feet[0] + 14, 380] });
    },
  });
  return { cam, prevCam: macroCam(t - 1 / FPS) };
}

// ---------------------------------------------------------------------------
// SCENE 4: WHAT-IF BLUEPRINT — completing a circuit
// ---------------------------------------------------------------------------
const BP = {
  t0: S('L10') - 0.0, scan0: S('L10') + 0.25, scan1: S('L10') + 1.05,
  reach0: S('L10') + 0.9, touch: S('L10') + 2.0, ghost: S('L10') + 2.45, ghostOut: S('L10') + 4.2,
  circuit: S('L10') + 4.3, circLbl: S('L10') + 5.1, zap: S('L11') + 0.2, exit: S('L12') - 0.45,
};
const BP_COL = '#9DB4FF';
const BP_REACH = (() => {
  const a = 2.75, base = { x: PIP_X, y: wireY(1, PIP_X), s: 1, flip: 1, wing: a, sq: 0 };
  let r = 80;
  for (let i = 0; i < 4; i++) {
    const tip = pipWingTip({ ...base, reach: r });
    r += (tip[1] - wireY(0, tip[0])) / Math.cos(a) * -1;
  }
  return r;
})();
ev(BP.t0, 'whoosh', { gain: 0.5 }); ev(BP.scan0, 'scan', { dur: BP.scan1 - BP.scan0 }); ev(BP.reach0, 'stretch', { dur: BP.touch - BP.reach0 });
ev(BP.touch, 'tick'); ev(BP.ghost, 'pop'); ev(BP.ghost + 0.6, 'sparkle', { gain: 0.6 }); ev(BP.circuit, 'riser', { dur: BP.zap - BP.circuit });
ev(BP.circLbl, 'pop'); ev(BP.zap, 'bigzap'); ev(BP.zap, 'impact');

function bpCam(t) {
  return camPath(t, [
    { t: BP.t0, x: 860, y: 470, z: 1.6 },
    { t: BP.t0 + 0.55, x: 800, y: 470, z: 1.06, ease: E.outExpo },
    { t: BP.circuit, x: 860, y: 460, z: 1.12, ease: E.ioSine },
    { t: BP.zap, x: 1060, y: 420, z: 1.5, ease: E.ioC },
    { t: BP.exit + 0.6, x: 1080, y: 420, z: 1.62, ease: E.ioSine },
  ]);
}
function bpPip(t, outline) {
  const reach = E.ioC(prog(t, BP.reach0, BP.touch));
  const o = {
    x: PIP_X, y: wireY(1, PIP_X), s: 1, flip: 1, blink: blinkAt(t, 3), perched: true, outline,
    wing: 2.75 * E.outBack(reach, 1.1), reach: BP_REACH * reach, sq: -0.04 * reach,
    head: -0.18 * reach, look: [0.1, -0.9 * reach], expr: 'neutral', expr2: 'surprised', exprK: prog(t, BP.touch, BP.touch + 0.2),
  };
  return o;
}
function drawBlueprintScene(ctx, t, mode) {
  const cam = bpCam(t), d = drift(t, 3, 9);
  const camD = { ...cam, x: cam.x + d[0], y: cam.y + d[1] };
  if (mode === 'real') {
    drawDuskWorld(ctx, camD, t, { energy: 0.6, actors: c => drawPip(c, bpPip(t)) });
    return { cam };
  }
  const zapT = t - BP.zap;
  const shake = zapT > 0 ? [Math.sin(t * 80) * 12 * Math.exp(-6 * zapT), Math.cos(t * 70) * 12 * Math.exp(-6 * zapT)] : [0, 0];
  drawBlueprintBG(ctx, camD, t);
  applyCam(ctx, camD, 1, shake);
  const wireCols = [t > BP.touch ? PAL.yellow : BP_COL, BP_COL, BP_COL];
  drawPoleSide(ctx, DUSK.poleX, t, { blueprint: BP_COL });
  drawWires(ctx, t, { blueprint: BP_COL, wireCol: wireCols, energy: 0 });
  // grounded hardware highlight
  const gh = pulse(t, BP.ghost, BP.ghostOut + 0.3, 0.2);
  if (gh > 0) {
    line(ctx, DUSK.poleX - 24, 525, DUSK.poleX - 24, DUSK.ground, 7, rgba(PAL.yellow, gh));
    line(ctx, DUSK.poleX + 110, 525, DUSK.poleX, 595, 7, rgba(PAL.yellow, gh));
    glow(ctx, DUSK.poleX + 60, 560, 90, PAL.yellow, 0.4 * gh);
    label(ctx, 'GROUNDED', DUSK.poleX - 30, 640, t - BP.ghost - 0.15, { size: 26, bg: PAL.yellow, out: BP.ghostOut - BP.ghost - 0.15 });
  }
  // ghost alternative: a bird by the pole touching grounded metal
  if (t > BP.ghost && t < BP.ghostOut + 0.4) {
    const a = pulse(t, BP.ghost, BP.ghostOut + 0.4, 0.25);
    ctx.save(); ctx.setLineDash([8, 7]);
    drawPip(ctx, { x: 482, y: wireY(1, 482), s: 0.9, flip: -1, outline: rgba(PAL.yellow, a), wing: -0.7, reach: 86, expr: 'surprised' });
    ctx.restore();
    label(ctx, 'OR', 600, wireY(1, 600) - 190, t - BP.ghost, { size: 30, bg: PAL.white, out: BP.ghostOut - BP.ghost });
  }
  const pip = bpPip(t, BP_COL);
  const tip = pipWingTip(pip);
  // circuit path: upper wire -> wing -> body -> feet -> Pip's wire
  if (t > BP.circuit) {
    const a = clamp((t - BP.circuit) * 2.5);
    const path = [[tip[0], wireY(0, tip[0])], tip, [PIP_X - 8, pip.y - 85], [PIP_X - 4, pip.y - 30], [PIP_X, pip.y]];
    const col = t > BP.zap ? PAL.orange : PAL.pink;
    drawCurrentPath(ctx, path, t, col, a, t > BP.zap ? 1600 : 600, t > BP.zap ? 11 : 7);
    if (t > BP.zap) for (const p of path) glow(ctx, p[0], p[1], 70, PAL.orange, 0.6 + 0.4 * Math.sin(t * 30));
  }
  if (t > BP.zap) {
    const hot = 0.6 + 0.4 * Math.sin(t * 36);
    ctx.save(); drawPip(ctx, { ...pip, outline: mixColor('#FF9AD0', PAL.yellow, hot) }); ctx.restore();
    glow(ctx, PIP_X, pip.y - 80, 220, PAL.pink, 0.35 * hot);
  } else drawPip(ctx, pip);
  if (t > BP.touch) {
    const tt = t - BP.touch;
    glow(ctx, tip[0], wireY(0, tip[0]), 60 + 30 * Math.exp(-6 * tt), PAL.yellow, 0.9);
    circle(ctx, tip[0], wireY(0, tip[0]), 6, PAL.white);
  }
  if (t > BP.circLbl) label(ctx, 'CIRCUIT COMPLETE', PIP_X + 300, pip.y - 250, t - BP.circLbl, { size: 32, bg: PAL.pink, fg: PAL.white });
  // header tag that marks this as hypothetical
  applyCam(ctx, { x: W / 2, y: H / 2, z: 1 }, 0);
  label(ctx, 'WHAT IF…', 170, 80, t - BP.scan1, { size: 30, bg: PAL.white, fg: PAL.violet });
  // flash on the zap
  const fl = t > BP.zap ? Math.exp(-7 * (t - BP.zap)) * clamp((t - BP.zap) / 0.03) : 0;
  if (fl > 0.01) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = rgba('#FFE3F3', 0.7 * fl); ctx.fillRect(0, 0, W, H); }
  return { cam };
}

// ---------------------------------------------------------------------------
// SCENE 5: SUNSET — big birds, bird-safe poles, the ending
// ---------------------------------------------------------------------------
const SUNC = {
  t0: S('L12') - 0.45, safe: S('L12') + 1.15, shadow: S('L12') + 1.85, land: S('L13') + 0.05,
  spread: S('L13') + 0.75, dim: S('L13') + 1.85, bridge: S('L13') + 3.2, worry: S('L14') + 0.3,
  fold: S('L15') - 0.1, perch: S('L15') + 0.25, hop: S('L15') + 0.85, arm: S('L15') + 1.45, armLbl: S('L15') + 2.1,
  covers: S('L15') + 3.05, coversLbl: S('L15') + 3.45, spread2: S('L15') + 4.2, outro: S('L16') - 0.3,
  title: En('L17') + 0.3, fade: TM.duration - 1.0,
};
ev(SUNC.t0, 'whoosh', { gain: 0.6 }); ev(SUNC.safe, 'pop'); ev(SUNC.safe + 0.05, 'sparkle', { gain: 0.6 });
ev(SUNC.shadow, 'bigwhoosh'); ev(SUNC.land - 0.5, 'flaps', { dur: 0.5 }); ev(SUNC.land, 'thump');
ev(SUNC.spread, 'wing'); ev(SUNC.dim, 'pop'); ev(SUNC.bridge, 'zap', { gain: 0.45 }); ev(SUNC.worry, 'alert');
ev(SUNC.fold, 'wing', { gain: 0.6 }); ev(SUNC.perch, 'mech', { dur: 0.6 }); ev(SUNC.hop, 'hop'); ev(SUNC.hop + 0.45, 'thump', { gain: 0.6 });
ev(SUNC.arm, 'mech', { dur: 0.9 }); ev(SUNC.armLbl, 'pop'); ev(SUNC.covers, 'pop'); ev(SUNC.covers + 0.12, 'pop');
ev(SUNC.coversLbl, 'pop', { gain: 0.7 }); ev(SUNC.spread2, 'wing', { gain: 0.6 }); ev(S('L16') + 0.6, 'sparkle', { gain: 0.5 });
ev(SUNC.title, 'chime');

function sunHalf(t) { return lerp(380, 600, spring(t - SUNC.arm, 1.3, 0.55)); }
function sunCam(t) {
  return camPath(t, [
    { t: SUNC.t0, x: 1300, y: 470, z: 1.6 },
    { t: SUNC.safe, x: 1290, y: 470, z: 1.5, ease: E.ioSine },
    { t: SUNC.shadow + 0.2, x: 1240, y: 460, z: 1.45, ease: E.ioSine },
    { t: SUNC.land + 0.4, x: 960, y: 430, z: 1.0, ease: E.ioC },
    { t: SUNC.worry, x: 960, y: 420, z: 1.05, ease: E.ioSine },
    { t: SUNC.fold, x: 960, y: 380, z: 1.22, ease: E.ioSine },
    { t: SUNC.arm, x: 960, y: 400, z: 0.95, ease: E.ioC },
    { t: SUNC.outro, x: 960, y: 420, z: 0.92, ease: E.ioSine },
    { t: TM.duration, x: 980, y: 330, z: 0.84, ease: E.ioSine },
  ]);
}
function sunPip(t, half) {
  const p = sunsetWirePoint(half, 1, 0.06);
  const surprised = pulse(t, SUNC.shadow + 0.1, SUNC.land + 1.2, 0.15);
  const worried = pulse(t, SUNC.worry, SUNC.arm + 0.4, 0.3);
  const ride = pulse(t, SUNC.arm, SUNC.arm + 1.2, 0.15);
  const happyEnd = prog(t, S('L17'), S('L17') + 0.4);
  let expr = 'happy', expr2 = 'surprised', k = Math.max(surprised, ride);
  if (worried > 0.01 && ride < 0.01) { expr = 'happy'; expr2 = 'worried'; k = worried; }
  return {
    x: p[0], y: p[1] + 2, s: 0.72, flip: -1, blink: blinkAt(t, 13, [S('L17') + 0.7]), perched: true,
    expr, expr2, exprK: k * (1 - happyEnd),
    look: t > SUNC.outro ? [lerp(0.6, -0.3, prog(t, SUNC.outro, SUNC.outro + 0.5)), 0.3] : surprised > 0.1 ? [0.5, -0.9] : [0.6, 0.1],
    head: surprised > 0.1 ? -0.2 * surprised : noise1(t * 0.6, 5) * 0.07,
    sq: 0.02 * Math.sin(t * 2.6) + 0.12 * Math.exp(-6 * Math.max(0, t - SUNC.land)) * Math.sin(Math.max(0, t - SUNC.land) * 18) * (t > SUNC.land ? 1 : 0),
    wing: t > SUNC.safe && t < SUNC.shadow ? -0.8 * pulse(t, SUNC.safe, SUNC.shadow, 0.2) : 0,
  };
}
function sunEagle(t) {
  const o = { x: 960, y: 412, s: 1.02, spread: 0.25, flap: 0, blink: blinkAt(t, 17), expr: 'neutral', look: [0, 0.2] };
  if (t < SUNC.land) {
    const u = prog(t, SUNC.shadow + 0.35, SUNC.land);
    o.y = lerp(-420, 412, E.outC(u)); o.x = lerp(1240, 960, E.outQ(u));
    o.spread = 1; o.flap = -0.35 + Math.sin(t * TAU * 3.2) * 0.45;
    o.sq = -0.06;
    return o;
  }
  const dt = t - SUNC.land;
  o.sq = 0.16 * Math.exp(-5 * dt) * Math.cos(dt * 16);
  o.spread = lerp(1, 0.2, E.outQ(prog(dt, 0, 0.35)));
  // stretch wings: reach the wires on both sides
  const sp = E.outBack(prog(t, SUNC.spread, SUNC.spread + 0.7), 1.4);
  const fold = E.ioC(prog(t, SUNC.fold, SUNC.fold + 0.45));
  o.spread = lerp(o.spread, 1, sp * (1 - fold)); if (fold > 0) o.spread = lerp(1, 0.15, fold);
  o.flap = 0.62 * sp * (1 - fold);
  o.expr = t > SUNC.worry && t < SUNC.fold + 0.6 ? 'worried' : t > SUNC.hop ? 'happy' : 'neutral';
  o.look = t > SUNC.worry && t < SUNC.fold ? [0.8 * Math.sin(t * 2.2), 0.4] : [0, 0.25];
  o.head = noise1(t * 0.5, 2) * 0.05;
  // hop up to the perch
  const perchTop = 470 - 52 - 190;
  if (t > SUNC.hop - 0.25) {
    const crouch = pulse(t, SUNC.hop - 0.25, SUNC.hop + 0.05, 0.1);
    const u = prog(t, SUNC.hop, SUNC.hop + 0.45);
    o.y = lerp(412, perchTop, E.outQ(u)) - Math.sin(Math.PI * u) * 70;
    o.sq = 0.18 * crouch - 0.1 * Math.sin(Math.PI * u) + (t > SUNC.hop + 0.45 ? 0.14 * Math.exp(-6 * (t - SUNC.hop - 0.45)) * Math.cos((t - SUNC.hop - 0.45) * 18) : 0);
    o.spread = Math.max(o.spread, 0.7 * Math.sin(Math.PI * u));
    o.flap = -0.3 * Math.sin(Math.PI * u);
  }
  // spread again on the perch: wings now clear of the wires
  const sp2 = E.outBack(prog(t, SUNC.spread2, SUNC.spread2 + 0.6), 1.3) * (1 - E.ioC(prog(t, S('L17') + 0.4, S('L17') + 1.2)));
  if (t > SUNC.spread2) { o.spread = lerp(o.spread, 1, sp2); o.flap = lerp(o.flap, 0.2, sp2); }
  return o;
}
function eagleTips(o) {
  // wingtip positions including the shoulder rotation (flap)
  const s = o.s ?? 1, k = clamp(o.spread);
  const tipL = [lerp(WING_FOLD[4][0], WING_SPREAD[4][0], k), lerp(WING_FOLD[4][1], WING_SPREAD[4][1], k) + 26];
  const sx = 40, sy = -150, a = (o.flap || 0) * k;
  const rx = tipL[0] - sx, ry = tipL[1] - sy;
  const px = sx + rx * Math.cos(a) - ry * Math.sin(a), py = sy + rx * Math.sin(a) + ry * Math.cos(a);
  return [[o.x - px * s, o.y + (py - 26) * s], [o.x + px * s, o.y + (py - 26) * s]];
}

function drawSunsetScene(ctx, t) {
  const cam = sunCam(t), d = drift(t, 4, 11);
  const camD = { ...cam, x: cam.x + d[0], y: cam.y + d[1] };
  const half = sunHalf(t);
  const dusk = E.ioSine(prog(t, SUNC.outro, TM.duration)) * 0.75;
  const eagle = sunEagle(t);
  const tips = eagleTips(eagle);
  const contact = pulse(t, SUNC.bridge, SUNC.fold + 0.2, 0.15);
  drawSunset(ctx, camD, t, {
    armHalf: half, covers: prog(t, SUNC.covers, SUNC.covers + 0.6) > 0 ? (t - SUNC.covers) : 0,
    perch: prog(t, SUNC.perch, SUNC.perch + 0.5), dusk, sunY: lerp(640, 840, E.ioSine(prog(t, SUNC.outro - 4, TM.duration))),
    wireGlow: [contact * (0.5 + 0.5 * Math.sin(t * 20)), contact * (0.5 + 0.5 * Math.sin(t * 20 + 1))],
    actors: (c, wireTops) => {
      // energy pulses travelling down the wires near the ending (electricity, harmless)
      const en = pulse(t, S('L16'), TM.duration, 0.6);
      if (en > 0) for (let i = 0; i < 2; i++) for (let k = 0; k < 5; k++) {
        const f = ((t * 0.18 + k / 5 + i * 0.1) % 1);
        const p = sunsetWirePoint(half, i, f);
        glow(c, p[0], p[1], 26 * (1 - f * 0.8), PAL.teal, 0.6 * en);
      }
      drawPip(c, sunPip(t, half));
      if (t > SUNC.shadow + 0.3) drawAtlas(c, eagle);
      // contact danger markers at the wingtips
      if (contact > 0.01) {
        for (const tp of tips) {
          const r = 34 + 10 * Math.sin(t * 10);
          c.beginPath(); c.arc(tp[0], tp[1], r, 0, TAU); c.lineWidth = 6; c.strokeStyle = rgba(PAL.pink, contact); c.stroke();
          glow(c, tp[0], tp[1], 90, PAL.pink, 0.55 * contact);
        }
      }
      if (t > SUNC.worry && t < SUNC.fold + 0.4) {
        for (const tp of tips) {
          const s = spring(t - SUNC.worry, 2.4, 0.4) * (1 - E.inBack(prog(t, SUNC.fold, SUNC.fold + 0.3)));
          c.save(); c.translate(tp[0], tp[1] - 110); c.scale(s, s);
          poly(c, [[0, -44], [50, 40], [-50, 40]], PAL.yellow); poly(c, [[0, -30], [38, 32], [-38, 32]], PAL.pink);
          c.font = '900 50px Montserrat'; c.fillStyle = '#FFF'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', 0, 12);
          c.restore();
        }
      }
      // wingspan dimension line
      if (t > SUNC.dim && t < SUNC.worry + 0.6) {
        const s = clamp((t - SUNC.dim) * 3) * (1 - prog(t, SUNC.worry, SUNC.worry + 0.3));
        const y = 150, xl = tips[0][0], xr = tips[1][0], m = 960;
        c.save(); c.globalAlpha = s;
        line(c, lerp(m, xl, E.outC(s)), y, lerp(m, xr, E.outC(s)), y, 5, PAL.white);
        for (const x of [xl, xr]) { line(c, x, y - 22, x, y + 22, 5, PAL.white); c.setLineDash([6, 8]); line(c, x, y + 22, x, tips[0][1] - 20, 3, rgba('#FFFFFF', 0.6)); c.setLineDash([]); }
        c.restore();
        label(c, '≈ 2 METERS', m, y, t - SUNC.dim - 0.1, { size: 34, bg: PAL.yellow, out: SUNC.worry - SUNC.dim - 0.1 });
      }
      // wider spacing dimension
      if (t > SUNC.armLbl && t < SUNC.outro + 0.3) {
        const y = 560, xl = wireTops[0][0], xr = wireTops[1][0];
        const a = clamp((t - SUNC.armLbl) * 3) * (1 - prog(t, SUNC.outro, SUNC.outro + 0.3));
        c.save(); c.globalAlpha = a;
        line(c, xl + 20, y, xr - 20, y, 5, PAL.white);
        poly(c, [[xl, y], [xl + 26, y - 14], [xl + 26, y + 14]], PAL.white); poly(c, [[xr, y], [xr - 26, y - 14], [xr - 26, y + 14]], PAL.white);
        c.restore();
        label(c, 'WIDER SPACING', 960, y + 60, t - SUNC.armLbl, { size: 30, bg: PAL.white, fg: PAL.violet, out: SUNC.outro - SUNC.armLbl });
      }
      if (t > SUNC.coversLbl) label(c, 'INSULATING COVERS', wireTops[0][0] + 40, 330, t - SUNC.coversLbl, { size: 28, bg: PAL.orange, fg: PAL.white, tip: [wireTops[0][0], 410], out: SUNC.outro - SUNC.coversLbl });
      if (t > SUNC.safe && t < SUNC.shadow + 0.5) {
        const pp = sunsetWirePoint(half, 1, 0.06);
        label(c, '✓ SAFE', pp[0] + 10, pp[1] - 150, t - SUNC.safe, { size: 30, bg: PAL.yellow, out: SUNC.shadow - SUNC.safe - 0.1 });
      }
    },
  });
  // eagle shadow sweeping past the camera (object wipe)
  const sw = prog(t, SUNC.shadow, SUNC.shadow + 0.6);
  if (sw > 0 && sw < 1) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.save(); ctx.filter = 'brightness(0.18) saturate(0.5) blur(6px)';
    drawAtlas(ctx, { x: lerp(2600, -700, E.ioQ(sw)), y: lerp(-200, 1500, E.ioQ(sw)), s: 3.4, spread: 1, flap: Math.sin(sw * 9) * 0.4, alpha: 0.9 });
    ctx.restore();
  }
  // end title + fade
  applyCam(ctx, { x: W / 2, y: H / 2, z: 1 }, 0);
  if (t > SUNC.title) {
    popText(ctx, "WHY BIRDS DON'T", 110, 130, t - SUNC.title, { size: 60, color: PAL.white, align: 'left' });
    popText(ctx, 'GET SHOCKED', 110, 212, t - SUNC.title - 0.18, { size: 84, color: PAL.yellow, align: 'left' });
  }
  const fade = prog(t, SUNC.fade, TM.duration - 0.05);
  if (fade > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = rgba('#05061C', E.inQ(fade)); ctx.fillRect(0, 0, W, H); }
  return { cam, prevCam: sunCam(t - 1 / FPS) };
}

// ---------------------------------------------------------------------------
// Scene table + transitions
// ---------------------------------------------------------------------------
const SCENES = [
  { id: 'hook', a: 0, b: S('L5') + 0.2, draw: drawHook },
  { id: 'lab', a: LAB.t0, b: S('L7') + 0.05, draw: drawLabScene },
  { id: 'macro', a: S('L7'), b: S('L10') + 0.05, draw: drawMacroScene },
  { id: 'bp-real', a: S('L10') + 0.05, b: BP.scan1 + 0.05, draw: (c, t) => drawBlueprintScene(c, t, 'real') },
  { id: 'bp', a: BP.scan0, b: S('L12') + 0.25, draw: (c, t) => drawBlueprintScene(c, t, 'bp') },
  { id: 'sunset', a: SUNC.t0, b: TM.duration + 1, draw: drawSunsetScene },
];
const TRANSITIONS = [
  { from: 'hook', to: 'lab', t0: S('L5') - 0.6, t1: S('L5') + 0.15, type: 'circle', col: PAL.royal, at: () => {
    const c = hookCam(S('L5') - 0.6); return [W / 2 + (PIP_X + 10 - c.x) * c.z, H / 2 + (wireY(1, PIP_X) - 225 - c.y) * c.z];
  } },
  { from: 'lab', to: 'macro', t0: S('L7') - 0.0, t1: S('L7') + 0.0, type: 'cut' },
  { from: 'macro', to: 'bp-real', t0: S('L10') + 0.05, t1: S('L10') + 0.05, type: 'cut' },
  { from: 'bp-real', to: 'bp', t0: BP.scan0, t1: BP.scan1, type: 'scan' },
  { from: 'bp', to: 'sunset', t0: SUNC.t0, t1: SUNC.t0 + 0.55, type: 'diag', col: PAL.orange },
];
ev(TRANSITIONS[0].t0, 'wipe');
ev(TRANSITIONS[4].t0, 'wipe');
EV.sort((a, b) => a.t - b.t);
