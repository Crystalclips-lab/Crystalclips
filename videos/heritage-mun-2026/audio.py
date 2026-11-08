"""Heritage MUN 2026 — original score + sound design, synthesized from scratch
(no samples, so nothing to license), mixed under the narration with ducking.

Inputs:  build/narration.wav, build/timings.json, build/events.json (from render.mjs)
Output:  build/mix.wav (48 kHz stereo, loudness-normalised later by ffmpeg)
"""
import json
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly

ROOT = Path(__file__).resolve().parent
B = ROOT / "build"
SR = 48000
RNG = np.random.default_rng(7)

timings = json.loads((B / "timings.json").read_text())
events = json.loads((B / "events.json").read_text())
DUR = timings["duration"]
N = int(DUR * SR) + SR
S = {l["id"]: l["start"] for l in timings["lines"]}
EN = {l["id"]: l["end"] for l in timings["lines"]}


def tt(n):
    return np.arange(n) / SR


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, fc, order=2):
    return sosfilt(butter(order, fc, "low", fs=SR, output="sos"), x)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def noise(n):
    return RNG.standard_normal(n)


def place(buf, sig, t0, gain=1.0, pan=0.0):
    """Add a mono signal into a stereo buffer at time t0 with constant-power pan."""
    i = int(t0 * SR)
    if i >= len(buf):
        return
    if i < 0:
        sig, i = sig[-i:], 0
    n = min(len(sig), len(buf) - i)
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:i + n, 0] += sig[:n] * gain * l
    buf[i:i + n, 1] += sig[:n] * gain * r


def automation(points, n=N):
    """Piecewise-linear gain curve from [(time, gain), ...]."""
    ts = np.array([p[0] for p in points]) * SR
    gs = np.array([p[1] for p in points])
    return np.interp(np.arange(n), ts, gs)


# ============================== SOUND EFFECTS ==============================
def env_exp(n, tau):
    return np.exp(-tt(n) / tau)


def sfx_pop(var=0.0):
    n = int(0.12 * SR); t = tt(n)
    f = (520 + 260 * var) * (1 + 0.8 * np.exp(-t / 0.012))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.035)
    s[: int(0.002 * SR)] *= np.linspace(0, 1, int(0.002 * SR))
    return s + 0.15 * hp(noise(n), 3000) * env_exp(n, 0.004)


def sfx_whoosh(dur=0.55, lo=300, hi=3500, bright=1.0):
    n = int(dur * SR); t = tt(n) / dur
    env = np.sin(np.pi * t) ** 2 * (1 - 0.3 * t)
    x = noise(n)
    a = bp(x, lo, hi) * env
    b = bp(x, hi * 0.8, min(hi * 2.5, 16000)) * env * (t ** 2) * bright
    return (a + 0.6 * b) * 0.9


def sfx_thump(f0=110, dur=0.3):
    n = int(dur * SR); t = tt(n)
    f = f0 * (0.5 + 0.5 * np.exp(-t / 0.05))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, dur / 4) + 0.2 * lp(noise(n), 600) * env_exp(n, 0.02)


def sfx_twang():
    n = int(0.9 * SR); t = tt(n)
    f = 170 * (1 + 0.06 * np.exp(-t / 0.15)) * (1 + 0.01 * np.sin(2 * np.pi * 6 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = (np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.2 * np.sin(3.01 * ph)) * env_exp(n, 0.25)
    return s * 0.6


def sfx_buzz(dur):
    n = int(dur * SR); t = tt(n)
    saw = 2 * ((t * 120) % 1) - 1
    s = lp(saw, 1800) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t))
    crack = hp(noise(n), 2500) * (RNG.random(n) < 0.004).astype(float)
    crack = lp(np.abs(crack), 4000) * 6
    env = np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.25)
    return (0.5 * s + 0.6 * crack * noise(n)) * env


def sfx_zap(dur=0.3, big=False):
    n = int(dur * SR); t = tt(n)
    f = 2400 * np.exp(-t / (dur / 2)) + 200
    saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
    gate = (RNG.random(n // 200 + 1) > 0.35).repeat(200)[:n]
    s = (0.5 * saw + 0.7 * hp(noise(n), 1500)) * gate * env_exp(n, dur / 2.5)
    if big:
        s = s + 1.2 * sfx_thump(70, dur)[:n]
    return s * 0.7


def sfx_surge():
    n = int(1.4 * SR); t = tt(n)
    f = 60 + 60 * t
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = sum(np.sin(k * ph) / k for k in range(1, 8))
    env = np.sin(np.pi * np.minimum(1, t / 1.4)) ** 1.5
    return lp(s, 1400) * env * 0.5


def sfx_tweet():
    out = np.zeros(int(0.7 * SR))
    for k, (st, f0, f1) in enumerate([(0.0, 2600, 4200), (0.16, 3000, 4600), (0.36, 2400, 3800)]):
        n = int(0.11 * SR); t = tt(n)
        f = f0 + (f1 - f0) * np.sin(np.pi * t / 0.11)
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.11) ** 2
        i = int(st * SR); out[i:i + n] += s
    return out * 0.5


def sfx_boing():
    n = int(0.45 * SR); t = tt(n)
    f = 330 * (1 + 0.35 * np.sin(2 * np.pi * 9 * t) * np.exp(-t / 0.15))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.14) * 0.6


def sfx_click():
    n = int(0.12 * SR); t = tt(n)
    s = np.zeros(n)
    for st in (0.0, 0.06):
        i = int(st * SR); m = int(0.02 * SR)
        s[i:i + m] += (np.sin(2 * np.pi * 1800 * tt(m)) + 0.5 * hp(noise(m), 2000)) * env_exp(m, 0.004)
    return s * 0.7


def sfx_water(dur):
    n = int(dur * SR); t = tt(n)
    x = bp(noise(n), 200, 1200) * (0.6 + 0.4 * np.sin(2 * np.pi * 3.3 * t + np.sin(2 * np.pi * 0.7 * t)))
    bub = np.zeros(n)
    for st in RNG.uniform(0, max(dur - 0.1, 0.01), int(dur * 9)):
        m = int(0.05 * SR); i = int(st * SR)
        fb = RNG.uniform(500, 1100)
        bub[i:i + m] += np.sin(2 * np.pi * np.cumsum(fb * (1 + 1.5 * tt(m) / 0.05)) / SR) * env_exp(m, 0.012)
    env = np.minimum(1, t / 0.2) * np.minimum(1, (dur - t) / 0.4)
    return (0.6 * x + 0.35 * bub[:n]) * env


def sfx_sparkle():
    n = int(0.9 * SR); out = np.zeros(n)
    for k in range(7):
        st = k * 0.07 + RNG.uniform(0, 0.03); f = RNG.choice([2349, 2794, 3136, 3520, 4186, 4699])
        m = int(0.45 * SR); i = int(st * SR)
        out[i:i + m] += (np.sin(2 * np.pi * f * tt(m)) + 0.3 * np.sin(2 * np.pi * f * 2.01 * tt(m))) * env_exp(m, 0.12)
    return out * 0.3


def sfx_riser(dur):
    n = int(dur * SR); t = tt(n) / dur
    f = 200 + 1400 * t ** 2
    s = 0.5 * np.sin(2 * np.pi * np.cumsum(f) / SR) + bp(noise(n), 800, 6000) * t
    return s * t ** 1.5 * 0.7


def sfx_scan(dur):
    n = int(dur * SR); t = tt(n)
    f = 900 + 1800 * t / dur
    s = 0.35 * np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 24 * t)))
    return lp(s, 6000) * np.sin(np.pi * t / dur) ** 0.5


def sfx_squish():
    n = int(0.2 * SR); t = tt(n)
    f = 320 * np.exp(-t / 0.1) + 120
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * lp(noise(n), 900)) * env_exp(n, 0.06) * 0.6


def sfx_stretch(dur):
    n = int(dur * SR); t = tt(n) / dur
    f = 260 + 700 * t ** 1.3
    s = np.sin(2 * np.pi * np.cumsum(f * (1 + 0.012 * np.sin(2 * np.pi * 7 * tt(n)))) / SR)
    return s * np.sin(np.pi * np.minimum(1, t * 1.05)) ** 0.6 * 0.45


def sfx_flaps(dur, rate=12, lo=200, hi=1800):
    n = int(dur * SR); out = np.zeros(n)
    m = int(0.06 * SR)
    for k in range(int(dur * rate)):
        i = int(k / rate * SR)
        out[i:i + m] += bp(noise(m), lo, hi) * np.sin(np.pi * tt(m) / 0.06) ** 2
    return out[:n] * 0.6


def sfx_alert():
    out = np.zeros(int(0.6 * SR))
    for k, f in enumerate([880, 660, 880]):
        m = int(0.14 * SR); i = int(k * 0.17 * SR)
        out[i:i + m] += np.sin(2 * np.pi * f * tt(m)) * np.sin(np.pi * tt(m) / 0.14)
    return out * 0.35


def sfx_mech(dur):
    n = int(dur * SR); t = tt(n)
    f = 80 + 70 * t / dur
    saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
    rat = np.zeros(n)
    for k in range(int(dur * 18)):
        i = int(k / 18 * SR); m = int(0.012 * SR)
        rat[i:i + m] += hp(noise(m), 1500) * env_exp(m, 0.003)
    env = np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.08)
    return (0.35 * lp(saw, 900) + 0.5 * rat) * env


def sfx_hop():
    n = int(0.15 * SR); t = tt(n)
    f = 300 + 900 * t / 0.15
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.15) * 0.4


def sfx_chime():
    n = int(3.0 * SR); t = tt(n); s = np.zeros(n)
    for f, a in [(587.33, 1), (739.99, 0.7), (880, 0.6), (1174.66, 0.4), (1479.98, 0.25)]:
        s += a * (np.sin(2 * np.pi * f * t) + 0.2 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.3)) * np.exp(-t / 1.1)
    return s * 0.18


def sfx_impact():
    return sfx_thump(65, 0.7) * 1.0 + 0.25 * lp(noise(int(0.7 * SR)), 300) * env_exp(int(0.7 * SR), 0.08)


def sfx_tick():
    n = int(0.15 * SR)
    return (hp(noise(n), 3000) * env_exp(n, 0.01) + 0.4 * sfx_zap(0.15)[:n])


def sfx_murmur(dur):
    n = int(dur * SR); t = tt(n)
    x = bp(noise(n), 250, 1800) * (0.55 + 0.45 * np.abs(np.sin(2 * np.pi * 1.7 * t) * np.sin(2 * np.pi * 0.63 * t + 1)))
    env = np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.6)
    return x * env * 0.5


def sfx_shield(dur):
    n = int(dur * SR); t = tt(n)
    s = sum(np.sin(2 * np.pi * f * t) / k for k, f in enumerate([220, 330, 440, 660], 1)) * (0.6 + 0.4 * np.sin(2 * np.pi * 5 * t))
    env = np.minimum(1, t / 0.3) * np.minimum(1, (dur - t) / 0.6)
    return lp(s, 2000) * env * 0.35


def sfx_gavel():
    out = np.zeros(int(0.6 * SR))
    for st in (0.0, 0.22):
        m = int(0.18 * SR); i = int(st * SR); t = tt(m)
        knock = (np.sin(2 * np.pi * 820 * t) * 0.6 + np.sin(2 * np.pi * 1340 * t) * 0.3) * np.exp(-t / 0.03) + bp(noise(m), 300, 3000) * np.exp(-t / 0.008)
        out[i:i + m] += knock
    return out * 0.8


def sfx_stamp():
    return sfx_thump(80, 0.45) * 1.1 + 0.5 * bp(noise(int(0.45 * SR)), 200, 2500) * env_exp(int(0.45 * SR), 0.03)


def sfx_cheer():
    n = int(1.8 * SR); t = tt(n)
    x = bp(noise(n), 500, 3500) * (0.7 + 0.3 * np.sin(2 * np.pi * 9 * t + np.sin(2 * np.pi * 2 * t)))
    env = np.minimum(1, t / 0.12) * np.exp(-np.maximum(0, t - 0.3) / 0.6)
    whistles = np.zeros(n)
    for k in range(3):
        st = 0.1 + k * 0.25; m = int(0.3 * SR); i = int(st * SR)
        f = 1800 + 900 * np.sin(np.pi * tt(m) / 0.3)
        whistles[i:i + m] += np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt(m) / 0.3) * 0.25
    return (x * env + whistles) * 0.6


SFX = {
    "swoosh":    (lambda e: sfx_whoosh(0.4, 500, 5000, 1.3), 0.45),
    "murmur":    (lambda e: sfx_murmur(e.get("dur", 2)), 0.22),
    "shield":    (lambda e: sfx_shield(e.get("dur", 2)), 0.22),
    "gavel":     (lambda e: sfx_gavel(), 0.45),
    "stamp":     (lambda e: sfx_stamp(), 0.65),
    "cheer":     (lambda e: sfx_cheer(), 0.35),
    "pop":       (lambda e: sfx_pop(RNG.uniform(-0.6, 0.8)), 0.42),
    "whoosh":    (lambda e: sfx_whoosh(0.55), 0.45),
    "whip":      (lambda e: sfx_whoosh(0.32, 600, 5000, 1.4), 0.5),
    "wipe":      (lambda e: sfx_whoosh(0.7, 250, 3000), 0.4),
    "bigwhoosh": (lambda e: sfx_whoosh(0.9, 120, 1600, 0.6), 0.85),
    "land":      (lambda e: sfx_thump(140, 0.18), 0.5),
    "twang":     (lambda e: sfx_twang(), 0.32),
    "surge":     (lambda e: sfx_surge(), 0.32),
    "tweet":     (lambda e: sfx_tweet(), 0.35),
    "zap":       (lambda e: sfx_zap(0.3), 0.4),
    "bigzap":    (lambda e: sfx_zap(0.8, True), 0.6),
    "buzz":      (lambda e: sfx_buzz(e.get("dur", 1.5)), 0.22),
    "impact":    (lambda e: sfx_impact(), 0.55),
    "boing":     (lambda e: sfx_boing(), 0.3),
    "click":     (lambda e: sfx_click(), 0.45),
    "water":     (lambda e: sfx_water(e.get("dur", 2)), 0.32),
    "sparkle":   (lambda e: sfx_sparkle(), 0.4),
    "riser":     (lambda e: sfx_riser(e.get("dur", 1)), 0.35),
    "scan":      (lambda e: sfx_scan(e.get("dur", 0.8)), 0.3),
    "squish":    (lambda e: sfx_squish(), 0.4),
    "stretch":   (lambda e: sfx_stretch(e.get("dur", 1)), 0.3),
    "tick":      (lambda e: sfx_tick(), 0.4),
    "flutter":   (lambda e: sfx_flaps(e.get("dur", 1), 13, 300, 2500), 0.35),
    "flaps":     (lambda e: sfx_flaps(e.get("dur", 0.5), 4, 120, 900), 0.7),
    "thump":     (lambda e: sfx_thump(90, 0.35), 0.6),
    "wing":      (lambda e: sfx_whoosh(0.4, 200, 2000, 0.5), 0.45),
    "alert":     (lambda e: sfx_alert(), 0.4),
    "mech":      (lambda e: sfx_mech(e.get("dur", 0.6)), 0.4),
    "hop":       (lambda e: sfx_hop(), 0.4),
    "chime":     (lambda e: sfx_chime(), 0.6),
}


def build_sfx():
    buf = np.zeros((N, 2))
    for e in events:
        if e["type"] == "line":
            continue
        fn, g = SFX[e["type"]]
        pan = float(np.clip(RNG.normal(0, 0.25), -0.6, 0.6))
        place(buf, fn(e), e["t"], g * e.get("gain", 1.0), pan)
    return buf


# ================================ MUSIC ================================
BPM = 104
BEAT = 60 / BPM
BAR = 4 * BEAT
CHORDS = {  # voicings in MIDI
    "Bm7": [47, 54, 57, 62, 66], "Gmaj7": [43, 50, 54, 59, 62], "Dadd9": [38, 50, 54, 57, 64],
    "Asus": [45, 52, 57, 59, 64], "D": [38, 50, 54, 57, 62, 66],
}
PROG = ["Bm7", "Gmaj7", "Dadd9", "Asus"]


def chord_at_bar(k):
    if k * BAR >= EN["L11"] - 1.0:
        return "D"
    return PROG[k % 4]


def pad_note(f, n, seed):
    t = tt(n)
    s = np.zeros(n)
    for det in (-0.004, 0.0, 0.0045):
        ff = f * (1 + det)
        for h in range(1, 7):
            s += np.sin(2 * np.pi * ff * h * t + seed * h) / (h ** 1.6)
    return s / 3


def music_layers():
    n_bars = int(DUR / BAR) + 2
    pad = np.zeros(N); bass = np.zeros(N); pluck = np.zeros(N); kick = np.zeros(N); shk = np.zeros(N); drone = np.zeros(N)
    for k in range(n_bars):
        t0 = k * BAR
        ch = CHORDS[chord_at_bar(k)]
        final = chord_at_bar(k) == "D"
        rel = 4.0 if final else 0.9
        n = int((BAR + rel) * SR)
        t = tt(n)
        env = np.minimum(1, t / 0.5) * np.where(t < BAR, 1, np.exp(-(t - BAR) / (rel / 3)))
        s = sum(pad_note(mtof(m), n, i * 0.7 + k) for i, m in enumerate(ch[1:]))
        i0 = int(t0 * SR); m = min(n, N - i0)
        if m <= 0:
            break
        pad[i0:i0 + m] += (s * env)[:m]
        # bass on beats 1 and 3
        for b in (0, 2):
            bn = int(1.2 * SR); bt = tt(bn)
            fb = mtof(ch[0] - 12 if ch[0] > 40 else ch[0])
            bs = (np.sin(2 * np.pi * fb * bt) + 0.25 * np.sin(4 * np.pi * fb * bt)) * np.minimum(1, bt / 0.01) * np.exp(-bt / 0.6)
            place_mono(bass, bs, t0 + b * BEAT)
        # kick on 1 and 3
        for b in (0, 2):
            place_mono(kick, sfx_thump(95, 0.28), t0 + b * BEAT)
        # shaker on 8ths
        for e8 in range(8):
            sn = int(0.06 * SR)
            place_mono(shk, hp(noise(sn), 6000) * env_exp(sn, 0.015) * (1.0 if e8 % 2 else 0.6), t0 + e8 * BEAT / 2)
        # pluck arpeggio on 8ths, chord tones an octave up
        pat = [0, 2, 4, 3, 1, 3, 2, 4]
        for e8 in range(8):
            note = ch[1 + pat[e8] % (len(ch) - 1)] + 12
            pn = int(0.7 * SR); pt = tt(pn); f = mtof(note)
            ps = (np.sin(2 * np.pi * f * pt) + 0.35 * np.sin(4 * np.pi * f * pt) * np.exp(-pt / 0.05) + 0.15 * np.sin(6 * np.pi * f * pt) * np.exp(-pt / 0.03))
            ps *= np.minimum(1, pt / 0.003) * np.exp(-pt / 0.22) * (1.0 if e8 % 2 == 0 else 0.7)
            place_mono(pluck, ps, t0 + e8 * BEAT / 2)
        # tension drone (used in the what-if section)
        dn = int((BAR + 0.5) * SR); dt_ = tt(dn)
        ds = (np.sin(2 * np.pi * mtof(35) * dt_) + 0.5 * np.sin(2 * np.pi * mtof(42) * dt_ * 1.002)) * (0.7 + 0.3 * np.sin(2 * np.pi * 3 * dt_))
        place_mono(drone, ds * np.minimum(1, dt_ / 0.3) * np.minimum(1, (BAR + 0.5 - dt_) / 0.5), t0)
    pad = lp(pad, 2200)
    return dict(pad=pad, bass=bass, pluck=lp(pluck, 5000), kick=kick, shk=shk, drone=lp(drone, 500))


def place_mono(buf, sig, t0):
    i = int(t0 * SR)
    if i >= len(buf):
        return
    n = min(len(sig), len(buf) - i)
    buf[i:i + n] += sig[:n]


def build_music():
    L = music_layers()
    a_title, a_ov, a_com = S["L3"] - 0.7, S["L4"] - 0.3, S["L5"] - 0.5
    a_free, a_end, a_card, end = S["L9"] - 0.45, S["L10"] - 0.35, EN["L11"] + 0.3, DUR
    g = {
        "pad":   automation([(0, 0), (0.5, 0.75), (a_title, 0.75), (a_title + 0.3, 1.0), (end - 1.5, 0.9), (end, 0)]),
        "bass":  automation([(0, 0), (a_title, 0), (a_title + 0.2, 0.75), (a_card, 0.75), (a_card + 1.0, 0.3), (end, 0)]),
        "pluck": automation([(0, 0.35), (a_ov, 0.45), (a_com, 0.6), (a_free, 0.6), (a_free + 0.3, 0.8), (a_card, 0.6), (end - 0.5, 0.2), (end, 0)]),
        "kick":  automation([(0, 0), (a_ov - 0.05, 0), (a_ov, 0.5), (a_card - 0.2, 0.55), (a_card, 0), (end, 0)]),
        "shk":   automation([(0, 0), (S["L2"], 0), (S["L2"] + 0.5, 0.15), (a_ov, 0.28), (a_card, 0.28), (a_card + 0.5, 0), (end, 0)]),
        "drone": automation([(0, 0), (end, 0)]),
    }
    mix = sum(L[k] * g[k] * w for k, w in [("pad", 0.11), ("bass", 0.3), ("pluck", 0.22), ("kick", 0.42), ("shk", 0.12), ("drone", 0.0)])
    d = int(0.012 * SR)
    return np.stack([mix, np.concatenate([np.zeros(d), mix[:-d]])], axis=1)


def main():
    nar, sr = sf.read(B / "narration.wav")
    if sr != SR:
        nar = resample_poly(nar, SR, sr)
    nar = np.pad(nar, (0, max(0, N - len(nar))))[:N]
    # ducking envelope from the narration
    env = np.abs(nar)
    env = lp(env, 12)
    env = env / (np.max(env) + 1e-9)
    env = np.clip(env * 4, 0, 1)
    # smooth release (~350 ms) so music doesn't pump between words
    rel = np.exp(-1 / (0.35 * SR))
    sm = np.empty_like(env); acc = 0.0
    for i in range(0, len(env), 64):
        v = env[i:i + 64].max()
        acc = max(v, acc * rel ** 64)
        sm[i:i + 64] = acc
    duck = 1 - 0.65 * sm

    music = build_music() * duck[:, None] * 0.42
    sfx = build_sfx()
    voice = np.stack([nar, nar], axis=1) * 0.92
    mix = voice + music + sfx * 0.8
    mix = np.tanh(mix * 1.1) / 1.1  # soft limiter
    mix = mix[: int(DUR * SR)]
    sf.write(B / "mix.wav", mix.astype(np.float32), SR, subtype="FLOAT")
    sf.write(B / "music_only.wav", (music[: int(DUR * SR)]).astype(np.float32), SR, subtype="FLOAT")
    print(f"mix: {len(mix) / SR:.2f}s, peak {np.max(np.abs(mix)):.2f}, events {sum(1 for e in events if e['type'] != 'line')}")


if __name__ == "__main__":
    main()
