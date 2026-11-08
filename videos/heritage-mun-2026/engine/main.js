// Compositor + public API.
//   seek(t)  renders the frame at time t (deterministic)
//   READY    true once fonts/assets are loaded
//   END      timeline duration in seconds
//   EV       timed events (narration lines + animation cues) for the sound mix

const canvas = document.getElementById('c');
const out = canvas.getContext('2d');
const mk = () => { const c = document.createElement('canvas'); c.width = Math.round(W * SS); c.height = Math.round(H * SS); return c; };
const bufA = mk(), bufB = mk(), bufM = mk();
const ctxA = bufA.getContext('2d'), ctxB = bufB.getContext('2d'), ctxM = bufM.getContext('2d');

function sceneById(id) { return SCENES.find(s => s.id === id); }
function activeScene(t) {
  let pick = SCENES[0];
  for (const s of SCENES) if (t >= s.a && t < s.b) pick = s;
  return pick;
}

// Render one scene into a buffer, with camera-velocity motion blur.
function renderScene(scene, t, ctx, buf) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  const info = scene.draw(ctx, t) || {};
  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (info.cam && info.prevCam) {
    const z = info.cam.z, dx = (info.cam.x - info.prevCam.x) * z, dy = (info.cam.y - info.prevCam.y) * z;
    const zr = info.cam.z / info.prevCam.z;
    const mag = Math.hypot(dx, dy), zmag = Math.abs(zr - 1);
    if (mag > 7 || zmag > 0.012) {
      ctxM.setTransform(1, 0, 0, 1, 0, 0); ctxM.clearRect(0, 0, W, H);
      ctxM.drawImage(buf, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const n = 9;
      for (let i = 0; i < n; i++) {
        const k = i / (n - 1) - 0.5; // shutter centred on the frame
        const sc = Math.pow(zr, k * 0.9);
        ctx.setTransform(sc, 0, 0, sc, W / 2 - W / 2 * sc - dx * k * 0.9, H / 2 - H / 2 * sc - dy * k * 0.9);
        ctx.globalAlpha = 1 / (i + 1);
        ctx.drawImage(bufM, 0, 0);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    }
  }
}

function composite(t) {
  out.setTransform(1, 0, 0, 1, 0, 0);
  out.globalAlpha = 1; out.globalCompositeOperation = 'source-over';
  const tr = TRANSITIONS.find(x => x.type !== 'cut' && t >= x.t0 && t < x.t1);
  if (!tr) {
    renderScene(activeScene(t), t, ctxA, bufA);
    out.drawImage(bufA, 0, 0);
    return;
  }
  const p = prog(t, tr.t0, tr.t1);
  renderScene(sceneById(tr.from), t, ctxA, bufA);
  renderScene(sceneById(tr.to), t, ctxB, bufB);
  out.drawImage(bufA, 0, 0);
  if (tr.type === 'circle') {
    const [cx, cy] = tr.at();
    const R = Math.hypot(W, H) * 1.05;
    const a = E.ioC(prog(p, 0, 0.62)) * R, b = E.ioC(prog(p, 0.32, 1)) * R;
    out.beginPath(); out.arc(cx, cy, a, 0, TAU); out.fillStyle = tr.col; out.fill();
    if (b > 0) { out.save(); out.beginPath(); out.arc(cx, cy, b, 0, TAU); out.clip(); out.drawImage(bufB, 0, 0); out.restore(); }
  } else if (tr.type === 'scan') {
    const x = E.ioC(p) * (W + 80) - 40;
    out.save(); out.beginPath(); out.rect(0, 0, x, H); out.clip(); out.drawImage(bufB, 0, 0); out.restore();
    out.fillStyle = rgba('#FFFFFF', 0.9); out.fillRect(x - 3, 0, 6, H);
    glow(out, x, H / 2, 300, PAL.sky, 0.25);
    for (let y = 0; y < H; y += 120) glow(out, x, y + (t * 600) % 120, 40, '#FFFFFF', 0.5);
  } else if (tr.type === 'push') {
    const e = E.ioC(p), v = (E.ioC(Math.min(1, p + 0.02)) - E.ioC(Math.max(0, p - 0.02))) / 0.04; // speed for smear
    const n = 6, smear = v * W / ((tr.t1 - tr.t0) * FPS) * 0.9;
    out.fillStyle = '#05062A'; out.fillRect(0, 0, W, H);
    for (let i = 0; i < n; i++) {
      const k = (i / (n - 1) - 0.5) * smear;
      out.globalAlpha = 1 / (i + 1);
      out.drawImage(bufA, -e * W + k, 0); out.drawImage(bufB, (1 - e) * W + k, 0);
    }
    out.globalAlpha = 1;
  } else if (tr.type === 'diag') {
    const slope = 420;
    const e1 = lerp(W + slope + 40, -slope - 40, E.ioC(prog(p, 0, 0.7)));
    const e2 = lerp(W + slope + 40, -slope - 40, E.ioC(prog(p, 0.3, 1)));
    out.beginPath(); out.moveTo(e1, 0); out.lineTo(W + slope + 400, 0); out.lineTo(W + 400, H); out.lineTo(e1 - slope, H); out.closePath();
    out.fillStyle = tr.col; out.fill();
    out.save(); out.beginPath(); out.moveTo(e2, 0); out.lineTo(W + slope + 400, 0); out.lineTo(W + 400, H); out.lineTo(e2 - slope, H); out.closePath(); out.clip();
    out.drawImage(bufB, 0, 0); out.restore();
  }
}

window.END = TM.duration;
window.EV = EV;
window.READY = false;
window.seek = function (t) {
  t = clamp(t, 0, END);
  composite(t);
  // short fade-in on the very first frames
  if (t < 0.25) { out.setTransform(1, 0, 0, 1, 0, 0); out.fillStyle = rgba('#05061C', 1 - E.outQ(t / 0.25)); out.fillRect(0, 0, W, H); }
};

window.TEXT_BOXES = TEXT_BOXES;
window.seekDebug = function (t) { TEXT_BOXES.length = 0; seek(t); return TEXT_BOXES.slice(); };

Promise.all([600, 800, 900].map(w => document.fonts.load(`${w} 40px Montserrat`))).then(() => {
  seek(0);
  window.READY = true;
});
