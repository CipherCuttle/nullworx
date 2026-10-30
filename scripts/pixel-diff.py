#!/usr/bin/env python3
"""Compare two PNGs without modifying them. Prints one JSON object."""
import json
import sys
from PIL import Image, ImageChops, ImageStat

if len(sys.argv) != 3:
    print("usage: pixel-diff.py A.png B.png", file=sys.stderr)
    raise SystemExit(2)

a = Image.open(sys.argv[1]).convert("RGB")
b = Image.open(sys.argv[2]).convert("RGB")
if a.size != b.size:
    print(json.dumps({"error": "size-mismatch", "a": a.size, "b": b.size}))
    raise SystemExit(3)

diff = ImageChops.difference(a, b)
gray = diff.convert("L")
hist = gray.histogram()
total = sum(hist)
changed = sum(hist[5:])
mean_abs = sum(i * hist[i] for i in range(256)) / max(1, total)
bbox = diff.getbbox()
stat = ImageStat.Stat(diff)
print(json.dumps({
    "width": a.size[0],
    "height": a.size[1],
    "meanAbs": round(mean_abs, 4),
    "channelMean": [round(v, 4) for v in stat.mean],
    "diffPixels": changed,
    "diffPercent": round(100 * changed / max(1, total), 4),
    "bbox": list(bbox) if bbox else None,
}))
