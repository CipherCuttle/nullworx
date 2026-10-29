#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path("/home/swirky/Documents/deepseek-harness/default-workspace/nullworx-consolidation-01")
W, H = 620, 390
GAP, PAD, LABEL = 16, 18, 34
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
try:
    font = ImageFont.truetype(FONT, 13)
    small = ImageFont.truetype(FONT, 11)
    title_font = ImageFont.truetype(FONT, 18)
except Exception:
    font = small = title_font = ImageFont.load_default()

def tile(path, label, sublabel):
    canvas = Image.new("RGB", (W, H), "#0b0c09")
    try:
        image = Image.open(path).convert("RGB")
        fitted = ImageOps.fit(image, (W, H), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
        canvas.paste(fitted, (0, 0))
    except Exception as error:
        draw = ImageDraw.Draw(canvas)
        draw.text((12, 12), f"missing: {error}", fill="#ff5e38", font=small)
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rectangle((0, H - 58, W, H), fill=(7, 8, 6, 210))
    od.text((10, H - 48), label, fill="#d8ff4a", font=font)
    od.text((10, H - 27), sublabel, fill="#d8d3c3", font=small)
    canvas = Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB")
    return canvas

pairs = [
    ("ASCII Waves / homepage", "source foundation", "consolidated", 
     "/home/swirky/DevHub/experiments/nullworx-site-preview/evidence/screenshots/home-desktop-1440x900.png",
     "evidence/g4/home/live-a.png"),
    ("ASCII Waves / lab field", "source field capture", "consolidated lab",
     "/home/swirky/DevHub/experiments/nullworx-site-preview/evidence/screenshots/ascii-waves-lab-field-1440x900.png",
     "evidence/g4/labs/ascii-waves-stage.png"),
    ("HoloType", "Expansion 02 source", "consolidated lab",
     "/home/swirky/DevHub/experiments/ui-forge-expansion-02/evidence/screenshots/desktop-02-holotype-platinum-noir-1440x900.png",
     "evidence/g4/labs/holotype-a.png"),
    ("CRT Material Lab", "Expansion 02 source", "consolidated lab",
     "/home/swirky/DevHub/experiments/ui-forge-expansion-02/evidence/screenshots/desktop-06-crt-green-noir-1440x900.png",
     "evidence/g4/labs/crt-a.png"),
    ("Pearl Caustics V2", "Proof 02 source", "consolidated lab",
     "/home/swirky/DevHub/experiments/ui-forge-pearl-caustics-proof02/evidence/screenshots/01-pearl-wash-wall-1440.png",
     "evidence/g4/labs/pearl-a.png"),
    ("Material x Mask / B", "G3-A source", "consolidated lab",
     "/home/swirky/Documents/deepseek-harness/default-workspace/nullworx-g3a/evidence/g3a1/gpu-final/screenshots/composition-b-desktop-1440x900.png",
     "evidence/g4/labs/composition-b.png"),
    ("Terminal Rain", "Living Stencils moth composite", "standalone rain material",
     "/home/swirky/DevHub/experiments/living-stencils-proof01/evidence/screenshots/desktop-moth-rain-1440x900.png",
     "evidence/g4/labs/rain-a.png"),
]

rows = []
for title, left_label, right_label, left_path, right_path in pairs:
    left = tile(left_path, left_label, Path(left_path).name)
    right = tile(right_path, right_label, Path(right_path).name)
    rows.append((title, left, right))

sheet = Image.new("RGB", (PAD * 2 + W * 2 + GAP, PAD * 2 + len(rows) * (H + LABEL + GAP) + 40), "#090a08")
draw = ImageDraw.Draw(sheet)
draw.text((PAD, PAD), "Nullworx consolidation 01 / source vs integrated output", fill="#f1eddf", font=title_font)
y = PAD + 38
for title, left, right in rows:
    draw.text((PAD, y), title, fill="#9b988b", font=font)
    y += 22
    sheet.paste(left, (PAD, y))
    sheet.paste(right, (PAD + W + GAP, y))
    y += H + GAP + 6
sheet.save(ROOT / "evidence/g5/comparisons/source-vs-integration.png", optimize=True)

# Before/after homepage sheet.
before = tile("evidence/g5/frames/before-home-reduced-motion-static.png", "BEFORE / reduced motion", "hardcoded LIVE badge, static field")
after = tile("evidence/g5/frames/after-home-reduced-motion-labelled.png", "AFTER / reduced motion", "truthful REDUCED MOTION / STILL")
blocked_before = tile("evidence/g5/frames/before-home-autoplay-blocked-static.png", "BEFORE / autoplay blocked", "hardcoded LIVE badge, static field")
blocked_after = tile("evidence/g5/frames/after-home-blocked-to-live.png", "AFTER / autoplay recovered", "blocked state -> real live playback")
live_after = tile("evidence/g5/frames/after-home-live.png", "AFTER / live", "video timeline + renderer frames advancing")
ba = Image.new("RGB", (PAD * 2 + W * 2 + GAP, PAD * 2 + 3 * (H + GAP) + 60), "#090a08")
bd = ImageDraw.Draw(ba)
bd.text((PAD, PAD), "Homepage before / after", fill="#f1eddf", font=title_font)
y = PAD + 38
for left, right in [(before, after), (blocked_before, blocked_after), (live_after, live_after)]:
    ba.paste(left, (PAD, y))
    ba.paste(right, (PAD + W + GAP, y))
    y += H + GAP
ba.save(ROOT / "evidence/g5/comparisons/homepage-before-after.png", optimize=True)
print("contact sheets written")
