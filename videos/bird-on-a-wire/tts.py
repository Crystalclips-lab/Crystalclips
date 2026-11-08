"""Generate narration with Kokoro (local, free) and write sentence-level timings.

Each script line is synthesized separately so its exact start/end time in the
final narration track is known. That replaces word alignment (faster-whisper
needs a Hugging Face model download, which this environment can't reach):
sentence boundaries are exact rather than estimated.

Outputs:
  build/narration.wav   mono 24 kHz narration track
  build/timings.js      window.TIMINGS = {...} for the motion engine
  build/timings.json    same data for the audio mixer
"""
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parent
BUILD = ROOT / "build"
BUILD.mkdir(exist_ok=True)


def trim(x, sr, thresh_db=-42.0, pad=0.03):
    """Trim leading/trailing silence, keeping a small natural pad."""
    frame = int(sr * 0.01)
    if len(x) < frame:
        return x
    n = len(x) // frame
    rms = np.sqrt(np.mean(x[: n * frame].reshape(n, frame) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms / (np.max(rms) + 1e-12))
    loud = np.where(db > thresh_db)[0]
    if len(loud) == 0:
        return x
    a = max(0, loud[0] * frame - int(pad * sr))
    b = min(len(x), (loud[-1] + 1) * frame + int(pad * sr))
    return x[a:b]


def main():
    script = json.loads((ROOT / "script.json").read_text())
    kokoro = Kokoro(str(ROOT / "models/kokoro-v1.0.onnx"), str(ROOT / "models/voices-v1.0.bin"))
    voice, speed = script["voice"], script["speed"]

    sr = 24000
    parts = [np.zeros(int(script["lead_in"] * sr), dtype=np.float32)]
    t = script["lead_in"]
    lines = []
    for line in script["lines"]:
        samples, sr_ = kokoro.create(line["text"], voice=voice, speed=speed, lang="en-us")
        assert sr_ == sr, sr_
        samples = trim(np.asarray(samples, dtype=np.float32), sr)
        dur = len(samples) / sr
        lines.append({"id": line["id"], "text": line["text"], "start": round(t, 3), "end": round(t + dur, 3)})
        print(f'{line["id"]:>4} {t:6.2f}-{t + dur:6.2f}  {line["text"]}', file=sys.stderr)
        parts.append(samples)
        t += dur
        gap = line["pause"]
        parts.append(np.zeros(int(gap * sr), dtype=np.float32))
        t += gap

    parts.append(np.zeros(int(script["tail"] * sr), dtype=np.float32))
    t += script["tail"]
    audio = np.concatenate(parts)
    peak = np.max(np.abs(audio))
    audio = audio / peak * 0.89
    sf.write(BUILD / "narration.wav", audio, sr, subtype="PCM_16")

    data = {"duration": round(len(audio) / sr, 3), "lines": lines}
    (BUILD / "timings.json").write_text(json.dumps(data, indent=2))
    (BUILD / "timings.js").write_text("window.TIMINGS = " + json.dumps(data) + ";\n")
    words = sum(len(l["text"].split()) for l in script["lines"])
    print(f"duration {data['duration']:.2f}s, {words} words", file=sys.stderr)


if __name__ == "__main__":
    main()
