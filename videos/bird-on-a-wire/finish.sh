#!/usr/bin/env bash
# Loudness-normalise the mix (two-pass EBU R128 to -14 LUFS), mux with the
# rendered video, and build the two QC contact sheets.
set -euo pipefail
cd "$(dirname "$0")/build"

# --- two-pass loudnorm ---
json=$(ffmpeg -hide_banner -nostats -i mix.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$json" | python3 -c "import sys,json; print(json.load(sys.stdin)['$1'])"; }
ffmpeg -loglevel error -y -i mix.wav -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true,aresample=48000" -c:a pcm_s24le mix_norm.wav

# --- mux ---
ffmpeg -loglevel error -y -i video.mp4 -i mix_norm.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -movflags +faststart -shortest ../bird-on-a-wire.mp4

# --- contact sheets: 16 frames each, first and second half ---
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 ../bird-on-a-wire.mp4)
half=$(python3 -c "print($dur/2)")
ffmpeg -loglevel error -y -ss 0.5 -t "$half" -i video.mp4 -vf "fps=16/$half,scale=480:-1,tile=4x4:padding=6:color=0x05061C" -frames:v 1 ../qc/contact-sheet-1.png
ffmpeg -loglevel error -y -ss "$half" -i video.mp4 -vf "fps=16/$half,scale=480:-1,tile=4x4:padding=6:color=0x05061C" -frames:v 1 ../qc/contact-sheet-2.png

echo "final: $(ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,sample_rate -show_entries format=duration -of compact ../bird-on-a-wire.mp4 | tr '\n' ' ')"
ffmpeg -hide_banner -nostats -i ../bird-on-a-wire.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|Peak):"
