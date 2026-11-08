#!/usr/bin/env bash
# Mux the vertical 2K renders with the loudness-normalised mix (run ./finish.sh first,
# which creates build/mix_norm.wav), then verify each file.
set -euo pipefail
cd "$(dirname "$0")/build"
for fps in 60 120; do
  src="video-v-2k${fps}.mp4"; dst="../heritage-mun-2026-vertical-2k-${fps}fps.mp4"
  [ -f "$src" ] || continue
  ffmpeg -loglevel error -y -i "$src" -i mix_norm.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -movflags +faststart -shortest "$dst"
  echo "== $dst"
  ffprobe -v error -show_entries stream=codec_name,profile,width,height,r_frame_rate,nb_frames,bit_rate -show_entries format=duration,size -of compact "$dst"
  ffmpeg -hide_banner -nostats -i "$dst" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|Peak):"
  echo "abrupt frame jumps:"; ffmpeg -hide_banner -nostats -i "$src" -vf "scale=360:-1,scdet=threshold=12" -f null - 2>&1 | grep -oE "lavfi.scd.time: [0-9.]+" || echo "  none"
done
