# Bird on a Wire — a one-prompt animated explainer

A 64-second, 1080p60 animated explainer, **"Why don't birds get shocked on power lines?"**,
produced end-to-end from a single request. It follows the research → script → assets → voice →
animation → render → QC workflow from the "Kurzgesagt-style in one Claude prompt" post.
Everything here is original: the characters, art, music and sound effects.

## What's different from the post's workflow

| Post assumes | This environment | What was done instead |
|---|---|---|
| GPT Image 2 for layered art | No image model | All art is **vector code** (canvas shapes). Characters are rigged by construction, so there are no cut-out seams, green halos or drift between scenes. The chroma-key/OpenCV step isn't needed. |
| ElevenLabs / Kokoro voice | Kokoro runs locally | **Kokoro v1.0** (`af_heart`), free and local (`tts.py`) |
| faster-whisper word timings | Hugging Face unreachable | Each sentence is synthesized separately, so **sentence start/end times are exact**. All animation cues key off them. |
| Licensed music / SFX | No library | **Score and 30 sound effects synthesized from scratch** in NumPy (`audio.py`) |

## Output

- `bird-on-a-wire.mp4`: final video, 1920×1080, 60 fps, H.264 (CRF 17) + AAC 256k, -14 LUFS
- `qc/`: character model sheets and the two 16-frame QC contact sheets

## Pipeline

```
script.json ──► tts.py ──► build/narration.wav + build/timings.js
                                     │
engine/*.js  (seek(t), READY, END, EV)◄┘
     │
render.mjs ──► Chromium/Playwright, 4 parallel workers ──► PNG frames ──► FFmpeg (libx264 CRF17, yuv420p, 60fps)
     │                                                                        └► build/video.mp4
     └► build/events.json (EV: every animation cue)
                     │
audio.py ◄───────────┘  music + SFX on cue, ducked under narration ──► build/mix.wav
finish.sh  two-pass loudnorm (-14 LUFS, -1.5 dBTP) ► mux ► bird-on-a-wire.mp4 + QC contact sheets
```

### Motion engine (`engine/`)
- `lib.js`: easing, damped springs, seeded noise, blink scheduler, camera with per-layer parallax, glow sprites, spring-pop typography
- `chars.js`: **Pip** (songbird) and **Atlas** (eagle), with expression blending, eyelids, brows, beak, wing rigs and an eagle wing shape-morph (folded ↔ spread)
- `env.js`: night power-line world, water-tank lab, inside-the-wire close-up, "what if" blueprint, sunset pole in perspective
- `scenes.js`: the timeline. Every cue is derived from narration timings, and every cue also emits an `EV` event for the sound mix.
- `main.js`: compositor (circle / scan / diagonal wipes, camera-velocity motion blur) and the public API

Each frame is a pure function of `t`, so frames render in any order across parallel workers.

## Run it

```bash
pip install kokoro-onnx soundfile numpy scipy
./fetch-assets.sh                      # Kokoro model + Montserrat fonts (not committed)

python3 tts.py                         # narration + timings
node snap.mjs build/snaps 2.9 sheet:pip  # spot-check frames / model sheets
node render.mjs --workers 4            # ~4 min on 4 cores
python3 audio.py                       # score + SFX + ducking
./finish.sh                            # loudnorm, mux, contact sheets
```

Requires Node with Playwright + Chromium, FFmpeg, and Python 3.

## Fact-check notes
Sources are listed in `script.json`. Two simplifications are deliberate:
- "7,200 volts" is a typical US distribution phase voltage (12.47 kV system). Lines vary from roughly 4 to 35 kV.
- The "easy path" beat is secondary. The main reason no current flows is that both feet are at almost the same voltage.
