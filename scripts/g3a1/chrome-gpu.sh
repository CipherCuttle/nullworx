#!/bin/sh
# Launch system Chrome with the real NVIDIA GPU through ANGLE/GL.
# Used via CHROME_PATH so the harness launch code stays untouched.
exec /usr/bin/google-chrome \
  --use-gl=angle \
  --use-angle=gl \
  --ignore-gpu-blocklist \
  --disable-gpu-driver-bug-workarounds \
  "$@"
