#!/usr/bin/env bash
# Download the third-party assets that are not committed:
#   - Kokoro v1.0 TTS model (kokoro-onnx GitHub release, Apache-2.0)
#   - Montserrat (Google Fonts, SIL Open Font License)
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p models assets/fonts
base=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
[ -f models/kokoro-v1.0.onnx ] || curl -sSL -o models/kokoro-v1.0.onnx "$base/kokoro-v1.0.onnx"
[ -f models/voices-v1.0.bin ]  || curl -sSL -o models/voices-v1.0.bin  "$base/voices-v1.0.bin"
g=https://fonts.gstatic.com/s/montserrat/v31
curl -sSL -o assets/fonts/Montserrat-600.woff "$g/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCu173w5aXw.woff"
curl -sSL -o assets/fonts/Montserrat-800.woff "$g/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCvr73w5aXw.woff"
curl -sSL -o assets/fonts/Montserrat-900.woff "$g/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCvC73w5aXw.woff"
echo "assets ready"
