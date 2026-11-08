# Heritage MUN 2026 — promo video

A 39-second animated promo for **Heritage MUN 2026** (28–29 November 2026, Heritage Institute of
Medical Sciences, NH-2 G.T. Road Bypass, Bhadwar, MohanSarai, Varanasi), in two formats:

- `heritage-mun-2026.mp4`: landscape 16:9, 1920×1080, 60 fps (YouTube, projectors, laptops)
- `heritage-mun-2026-vertical.mp4`: vertical 9:16, 1080×1920, 60 fps (Instagram Reels, WhatsApp status, Shorts)

Both are H.264 + AAC with faststart, loudness-normalised to -14 LUFS.

### Vertical 2K masters
- `heritage-mun-2026-vertical-2k-60fps.mp4`: 1440×2560, 60 fps. **Upload this one to Instagram.**
- `heritage-mun-2026-vertical-2k-120fps.mp4`: 1440×2560, 120 fps. Every frame is unique, not duplicated. Smoothest when played directly on a 120 Hz phone. Instagram and YouTube play back at 60 fps or less, so this is a local-playback master.

Both are rendered natively at 2K: the engine redraws every shape, rim light and glyph at 1.333× supersampling (`?ss=`), not by upscaling pixels. Motion blur follows the real shutter time at each frame rate (`?fps=`). Encoding: x264 High profile, CRF 15, `aq-mode=3` against gradient banding, AAC 320 kbps. Instagram displays Reels at 1080×1920, but starting from a sharper 2K source survives its re-compression better.

## Content (from the Academic Committee's announcement)

| Committee | Agenda |
|---|---|
| UNSC | Sudan: Balancing the Protection of Civilians with State Sovereignty amid the Ongoing Conflict |
| UNGA | Reparations for Historical Injustices: Addressing Questions of Responsibility, Recognition and Restitution |
| WHO | The Next Pandemic: Global Responsibility, Preparedness and Equitable Response. |
| Lok Sabha | A Parliamentary Review of the Anti-Defection Law, UPI and Hindi in India’s Administration |

No registration fees for HIMS students participating as Delegates or Executive Board (EB) members.

## Personalisation
- The campus is modelled on the real HIMS blocks: white multi-storey towers with grid windows, red rooftop signage, a tree-lined forecourt on the NH-2 bypass, and a Varanasi temple skyline on the horizon.
- The hero is a Heritage med student (lab coat + stethoscope) who becomes a delegate holding a "HIMS" placard.
- The emblem is original: a globe held by a stethoscope inside a laurel wreath. It is not the UN emblem or the college crest.
- The Lok Sabha is the green chamber with a peacock Speaker, after the new Lok Sabha chamber's national-bird theme.

## Build

```bash
../bird-on-a-wire/fetch-assets.sh && cp ../bird-on-a-wire/assets/fonts/*.woff assets/fonts/   # fonts + voice model
ln -sfn ../bird-on-a-wire/models models
python3 tts.py                                   # narration (Kokoro, af_heart) + timings
node render.mjs --workers 4                      # landscape frames  -> build/video.mp4
node render.mjs --workers 4 --v 1 --out build/video-v.mp4   # vertical frames
python3 audio.py                                 # score + SFX, ducked under the voice
./finish.sh                                      # loudnorm, mux both formats, contact sheets
# vertical 2K masters
node render.mjs --workers 4 --v 1 --ss 1.3333333333 --fps 60  --crf 15 --out build/video-v-2k60.mp4
node render.mjs --workers 4 --v 1 --ss 1.3333333333 --fps 120 --crf 15 --out build/video-v-2k120.mp4
./finish-2k.sh                                   # mux with the same mix, verify resolution / fps / LUFS / jumps
```

`snap.mjs` renders single frames for review (`V=1 node snap.mjs out 13.4` for vertical).

## Quality notes
- **Rim lights and core shadows** are cut from each shape's own outline (`crescent` / `shapeFill` in `engine/lib.js`), so they always sit exactly on the curve.
- **Colour regions** (head, belly, costume, rim) partition each silhouette, and lower layers are inset 1px under the seams, so no antialiased halo can leak along an edge.
- **Text on flipped characters** is counter-flipped so it never reads mirrored.
- **Text checks:** every text draw records its on-screen box. A check over the whole timeline confirms nothing overflows its panel or the frame once it has settled.
