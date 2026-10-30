#!/usr/bin/env python3
"""Compose actual browser captures; calculate metrics without synthesized pixels."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'evidence/ascii-golden-master-2026-10-30'
SHOTS = OUT / 'screenshots'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FONT_MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'


def metrics(a, b):
    import numpy as np
    x, y = np.asarray(a.convert('RGB')).astype('int16'), np.asarray(b.convert('RGB')).astype('int16')
    assert x.shape == y.shape
    delta = np.abs(x - y)
    return {'width': a.width, 'height': a.height, 'mae': float(delta.mean()), 'maxChannelDifference': int(delta.max()), 'exactPixelsPercent': float(np.all(delta == 0, axis=2).mean() * 100), 'changedPixelsPercent': float(np.any(delta != 0, axis=2).mean() * 100)}


def text(image, xy, value, size=18, color='#edf0ea', mono=False):
    ImageDraw.Draw(image).text(xy, value, fill=color, font=ImageFont.truetype(FONT_MONO if mono else FONT, size))


def paste(image, name, xy, size):
    picture = Image.open(SHOTS / name).convert('RGB')
    picture.thumbnail(size, Image.Resampling.LANCZOS)
    image.paste(picture, xy)


receipt = {'method': 'RGB pixel differences of the full CSS-size browser PNGs. The comparison sheets alone are resized for review; all metrics use the untouched full-resolution captures.', 'pairs': [], 'paused': []}
sheet = Image.new('RGB', (1488, 3210), '#141718')
text(sheet, (24, 20), 'NULLWORX / GOLDEN FLOWER vs CONSOLIDATED', 26)
text(sheet, (24, 60), 'Controlled frames. Same media, time, wave clock, DPR2, canvas size and palette. Scrims/chrome hidden.', 16)
text(sheet, (24, 88), 'GOLDEN CHECKPOINT', 18)
text(sheet, (768, 88), 'CURRENT / EXISTING RENDERER', 18)
for i in range(5):
    a = Image.open(SHOTS / f'after-raw-golden-desktop-{i}.png')
    b = Image.open(SHOTS / f'after-raw-consolidated-desktop-{i}.png')
    m = metrics(a, b)
    pose = json.loads((OUT / 'receipts/captures-after.json').read_text())
    scene = next(c for c in pose['cases'] if c['type'] == 'matched-raw' and c['name'] == 'golden' and c['viewport']['width'] == 1440 and c['index'] == i)
    receipt['pairs'].append({'scene': f'desktop-{i}', 'pose': scene['pose'], **m})
    top = 122 + i * 502
    label = f"video {scene['pose']['videoTime']:.1f}s / wave {scene['pose']['waveClock']:.1f}s"
    if i == 4: label += ' / pointer (0.70, 0.35), settled'
    text(sheet, (24, top), label, 18, mono=True)
    text(sheet, (1000, top), f"MAE {m['mae']:.6f} / exact {m['exactPixelsPercent']:.4f}%", 16)
    paste(sheet, f'after-raw-golden-desktop-{i}.png', (24, top + 32), (720, 450))
    paste(sheet, f'after-raw-consolidated-desktop-{i}.png', (768, top + 32), (720, 450))
top = 2640
text(sheet, (24, top), 'MOBILE / 390 x 844 CSS / DPR2 / 12 px cells / matching decoded frames', 20)
for i in range(2):
    a = Image.open(SHOTS / f'after-raw-golden-mobile-{i}.png')
    b = Image.open(SHOTS / f'after-raw-consolidated-mobile-{i}.png')
    m = metrics(a, b)
    scene = next(c for c in pose['cases'] if c['type'] == 'matched-raw' and c['name'] == 'golden' and c['viewport']['width'] == 390 and c['index'] == i)
    receipt['pairs'].append({'scene': f'mobile-{i}', 'pose': scene['pose'], **m})
    left = 24 + i * 744
    text(sheet, (left, top + 40), f"video {scene['pose']['videoTime']:.1f}s / wave {scene['pose']['waveClock']:.1f}s / MAE {m['mae']:.6f}", 16)
    text(sheet, (left, top + 72), 'GOLDEN', 15)
    text(sheet, (left + 350, top + 72), 'CURRENT', 15)
    paste(sheet, f'after-raw-golden-mobile-{i}.png', (left, top + 103), (215, 465))
    paste(sheet, f'after-raw-consolidated-mobile-{i}.png', (left + 350, top + 103), (215, 465))
sheet.save(SHOTS / 'golden-versus-current-screenshot-sheet.png')

native = Image.new('RGB', (1488, 1500), '#141718')
text(native, (24, 18), 'ACTUAL PRESENTATION / NOT SYNCHRONIZED PIXEL PAIRS', 24)
text(native, (24, 56), 'Different container sizes, responsive pitch, chrome, vignettes and source timestamps. Native captures retain the product framing.', 16)
for i, (label, key) in enumerate([('GOLDEN / full viewport', 'golden'), ('CURRENT / homepage', 'home'), ('CURRENT / ASCII lab', 'lab')]):
    x = 24 + i * 496
    text(native, (x, 94), label, 18)
    paste(native, f'after-{key}-desktop-native.png', (x, 130), (472, 295))
    text(native, (x, 458), '390 x 844 CSS / DPR2', 16)
    paste(native, f'after-{key}-mobile-native.png', (x, 490), (390, 844))
text(native, (24, 1380), 'Review the smaller homepage field for legibility; raw field equality does not approve this framing.', 20)
text(native, (24, 1420), 'Original mobile tray and missing controls: see golden-controls-*.png and the feature table in the audit.', 18)
native.save(SHOTS / 'native-presentation-sheet.png')

for key in ['home', 'lab']:
    a = Image.open(SHOTS / f'{key}-paused-a.png')
    b = Image.open(SHOTS / f'{key}-paused-b.png')
    receipt['paused'].append({'scene': key, **metrics(a, b)})
if (SHOTS / 'final-dpr1-golden.png').exists():
    receipt['pairs'].append({'scene': 'desktop-dpr1', 'pose': {'videoTime': 3.2, 'waveClock': 1}, 'dpr': 1, **metrics(Image.open(SHOTS / 'final-dpr1-golden.png'), Image.open(SHOTS / 'final-dpr1-consolidated.png'))})
if (SHOTS / 'final-device2-golden.png').exists():
    receipt['pairs'].append({'scene': 'desktop-dpr2-native-device-pixels', 'pose': {'videoTime': 3.2, 'waveClock': 1}, 'dpr': 2, 'scale': 'device', **metrics(Image.open(SHOTS / 'final-device2-golden.png'), Image.open(SHOTS / 'final-device2-consolidated.png'))})
(OUT / 'receipts/pixel-comparisons.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt, indent=2))
