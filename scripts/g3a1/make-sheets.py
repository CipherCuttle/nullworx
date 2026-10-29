#!/usr/bin/env python3
"""Compose the G3-A.1 owner review sheets from captured evidence.

Outputs (evidence/g3a1/review/):
  COMPARISON_SHEET.png   all four compositions, desktop + mobile, technical captions
  EDGE_SHEET.png         mask edges on the dark stage and an evidence-only light surface
  BROWSER_SHEET.png      Chromium / Firefox / WebKit side by side for B and D

Sheets are evidence artefacts, not product output. The technical facts come from
the JSON receipts; subjective judgements are kept out of the image.
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / "evidence" / "g3a1"
GPU = EVIDENCE / "gpu"
CROSS = EVIDENCE / "cross-browser"
OUT = EVIDENCE / "review"
OUT.mkdir(parents=True, exist_ok=True)

PAPER = (247, 245, 239)
INK = (36, 36, 32)
MUTED = (112, 110, 100)
LINE = (214, 209, 198)
DARK = (9, 10, 12)
WHITE = (255, 254, 250)
COPPER = (181, 77, 47)
GOOD = (35, 108, 74)

FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")
FONT_REG = FONT_DIR / "DejaVuSans.ttf"
FONT_BOLD = FONT_DIR / "DejaVuSans-Bold.ttf"
FONT_MONO = FONT_DIR / "DejaVuSansMono.ttf"


def font(size: int, bold: bool = False, mono: bool = False) -> ImageFont.FreeTypeFont:
    path = FONT_MONO if mono else (FONT_BOLD if bold else FONT_REG)
    return ImageFont.truetype(str(path), size)


def load_json(path: Path, fallback=None):
    try:
        return json.loads(path.read_text())
    except Exception:
        return fallback


def text(draw: ImageDraw.ImageDraw, xy, value: str, *, f, fill=INK, anchor=None):
    draw.text(xy, value, font=f, fill=fill, anchor=anchor)


def fit_image(image: Image.Image, width: int) -> Image.Image:
    height = round(image.height * width / image.width)
    return image.resize((width, height), Image.LANCZOS)


def paste_card(base: Image.Image, image: Image.Image, xy, width: int, border=LINE):
    scaled = fit_image(image, width)
    x, y = xy
    card = Image.new("RGB", (scaled.width + 2, scaled.height + 2), border)
    card.paste(scaled.convert("RGB"), (1, 1))
    base.paste(card, (x, y))
    return scaled.height


def wrap(draw, value: str, f, max_width: int) -> list[str]:
    words = value.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textlength(candidate, font=f) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def renderer_string() -> str:
    receipts = load_json(GPU / "receipts.json", {}) or {}
    renderer = receipts.get("renderer") or {}
    return renderer.get("renderer") or "renderer not recorded"


def verify_data():
    return load_json(EVIDENCE / "gpu-baseline" / "verify.json", {}) or {}


def boundary_by_letter():
    data = verify_data()
    out = {}
    for entry in data.get("boundary", []):
        out.setdefault(entry.get("letter"), entry)
    return out


def fmt_pct(value):
    return f"{value * 100:.1f}%" if isinstance(value, (int, float)) else "n/a"


LETTERS = ["a", "b", "c", "d"]
TITLES = {
    "a": ("A — Moth × HoloType", "native SVG geometry · HoloGlyph · no container clip"),
    "b": ("B — Moth × Paper MeshGradient", "unmodified upstream canvas · container CSS alpha mask"),
    "c": ("C — Wordmark × HoloType", "live DOM text · HoloText · native geometry"),
    "d": ("D — Wordmark × Paper MeshGradient", "canvas-rasterized text mask · CSS alpha mask"),
}
KIND = {"a": "svg-path", "b": "svg-path", "c": "text", "d": "text"}


def comparison_sheet():
    pad = 60
    width = 1940
    header_h = 320
    label_h = 150
    left_w = 1300
    right_w = 470
    gap = 50
    row_gap = 50

    rows = []
    for letter in LETTERS:
        desktop = Image.open(GPU / "stills" / f"composition-{letter}-desktop-1440x900@2x.png")
        mobile = Image.open(GPU / "stills" / f"composition-{letter}-mobile-390x844@2x.png")
        desktop_h = round(desktop.height * left_w / desktop.width)
        mobile_h = round(mobile.height * right_w / mobile.width)
        rows.append((letter, desktop, mobile, desktop_h, mobile_h))

    footer_h = 410
    total_h = header_h + sum(label_h + max(desktop_h, mobile_h) + row_gap for _, _, _, desktop_h, mobile_h in rows) + footer_h
    sheet = Image.new("RGB", (width, total_h), PAPER)
    draw = ImageDraw.Draw(sheet)

    # Header
    draw.rectangle([0, 0, width, header_h], fill=DARK)
    text(draw, (pad, 52), "NULLWORX  /  G3-A.1", f=font(30, bold=True), fill=(200, 196, 186))
    text(draw, (pad, 96), "Material × Mask — composition proof", f=font(60, bold=True), fill=WHITE)
    text(draw, (pad, 176), "Technical acceptance capture · production build · all four presets · real GPU", f=font(24), fill=(196, 192, 182))
    text(draw, (pad, 216), renderer_string(), f=font(21, mono=True), fill=(150, 200, 176))
    text(draw, (pad, 252), "Desktop 1440×900 @DPR2  ·  mobile 390×844 @DPR2  ·  paused stage captures", f=font(19, mono=True), fill=(160, 156, 148))
    text(draw, (width - pad, 60), "NOT OWNER-APPROVED", f=font(26, bold=True), fill=(255, 170, 140), anchor="ra")
    text(draw, (width - pad, 98), "evidence artefact · not a product export", f=font(19), fill=(190, 186, 176), anchor="ra")
    text(draw, (width - pad, 134), "visual acceptance is a separate owner decision", f=font(19), fill=(190, 186, 176), anchor="ra")

    boundaries = boundary_by_letter()
    y = header_h + 26
    for letter, desktop, mobile, desktop_h, mobile_h in rows:
        title, subtitle = TITLES[letter]
        draw.line([(pad, y), (width - pad, y)], fill=LINE, width=2)
        text(draw, (pad, y + 24), title, f=font(36, bold=True), fill=INK)
        text(draw, (pad, y + 76), subtitle, f=font(21), fill=MUTED)
        text(draw, (width - pad, y + 28), f"MASK {KIND[letter]}".upper(), f=font(21, bold=True), fill=COPPER, anchor="ra")
        boundary = boundaries.get(letter, {})
        fact = (
            f"inside {fmt_pct(boundary.get('insideCoverage'))} · outside violations {boundary.get('outsideViolations', 'n/a')} · max outside Δ {boundary.get('maxOutside', 'n/a')}/255"
            if boundary
            else "boundary receipt not found"
        )
        text(draw, (width - pad, y + 78), fact, f=font(18, mono=True), fill=MUTED, anchor="ra")
        text(draw, (pad, y + 112), f"desktop {left_w}px  ·  mobile {right_w}px", f=font(17, mono=True), fill=(150, 146, 136))

        top = y + label_h
        paste_card(sheet, desktop, (pad, top), left_w)
        paste_card(sheet, mobile, (pad + left_w + gap, top), right_w)
        text(draw, (pad, top + desktop_h + 12), f"desktop stage · {desktop.width}×{desktop.height}px source", f=font(18, mono=True), fill=MUTED)
        text(draw, (pad + left_w + gap, top + mobile_h + 12), f"mobile stage · {mobile.width}×{mobile.height}px source", f=font(18, mono=True), fill=MUTED)
        y = top + max(desktop_h, mobile_h) + row_gap

    # Footer: method and limits (facts only)
    footer_top = y + 4
    draw.rectangle([0, footer_top, width, total_h], fill=(238, 235, 227))
    draw.line([(pad, footer_top + 34), (width - pad, footer_top + 34)], fill=LINE, width=2)
    text(draw, (pad, footer_top + 58), "HOW TO READ THIS SHEET", f=font(23, bold=True), fill=INK)
    notes = [
        "Still frames are paused-state stage captures. Motion clips are in evidence/g3a1/gpu/motion/ (MP4 + PNG frames + timing.json).",
        "The boundary column compares composited stage pixels with the hidden material surface, sampled against canonical mask alpha.",
        "A material edge that differs from a hard vector edge is native edge treatment, not compositor spill; the tolerance is recorded per preset.",
        "Frame pacing is material-dependent: on the 143 Hz host, Paper B averaged 79 fps (p95 34.6 ms); HoloType A/C averaged 133–137 fps.",
        "This sheet records technical observations only. Visual acceptance is the owner's decision and is not implied by PASS results.",
    ]
    ny = footer_top + 98
    for note in notes:
        for line in wrap(draw, note, font(20), width - pad * 2 - 20):
            text(draw, (pad, ny), line, f=font(20), fill=INK)
            ny += 28
        ny += 8

    sheet.save(OUT / "COMPARISON_SHEET.png")
    return sheet.size


def edge_sheet():
    crops = []
    for letter in LETTERS:
        surface = "holotype" if letter in {"a", "c"} else "paper"
        for tone in ("dark", "light"):
            path = GPU / "edges" / f"{letter}-{surface}-edge-{tone}@2x.png"
            if path.exists():
                crops.append((letter, surface, tone, Image.open(path)))

    cell_w = 420
    label_h = 64
    cols = 4
    rows = 2
    pad = 46
    header_h = 220
    width = pad * 2 + cols * cell_w + (cols - 1) * 24
    sample = crops[0][3]
    cell_h = round(sample.height * cell_w / sample.width)
    height = header_h + rows * (cell_h + label_h) + pad + 80
    sheet = Image.new("RGB", (width, height), PAPER)
    draw = ImageDraw.Draw(sheet)

    draw.rectangle([0, 0, width, header_h], fill=DARK)
    text(draw, (pad, 40), "MASK EDGE INSPECTION", f=font(40, bold=True), fill=WHITE)
    text(draw, (pad, 96), "96×96 CSS px crops at DPR2, upscaled for review · dark stage vs evidence-only light surface", f=font(20), fill=(196, 192, 182))
    text(draw, (pad, 134), "Crops are local evidence; the light surface is an injected screenshot style, not product behaviour.", f=font(19), fill=(255, 170, 140))

    for index, (letter, surface, tone, image) in enumerate(crops):
        col = index % cols
        row = index // cols
        x = pad + col * (cell_w + 24)
        y = header_h + 28 + row * (cell_h + label_h)
        paste_card(sheet, image, (x, y), cell_w)
        text(draw, (x, y + cell_h + 12), f"{letter.upper()} · {surface} · {tone} surface", f=font(20, bold=True), fill=INK)
        text(draw, (x, y + cell_h + 38), "edge crop @2x", f=font(17, mono=True), fill=MUTED)

    sheet.save(OUT / "EDGE_SHEET.png")
    return sheet.size


def browser_sheet():
    engines = ["chromium", "firefox", "webkit"]
    rowspec = [("b", "B — Moth × Paper"), ("d", "D — Wordmark × Paper")]
    cell_w = 620
    header_h = 240
    label_h = 62
    row_gap = 44
    pad = 46
    width = pad * 2 + 3 * cell_w + 2 * 24

    available = []
    for engine in engines:
        shot = CROSS / "screenshots" / engine / f"{engine}-b-desktop-1440x900.png"
        if shot.exists():
            available.append(engine)

    if not available:
        return None

    images = {}
    for engine in available:
        for letter, _ in rowspec:
            path = CROSS / "screenshots" / engine / f"{engine}-{letter}-desktop-1440x900.png"
            if path.exists():
                images[(engine, letter)] = Image.open(path)

    summary = load_json(CROSS / "summary.json", {"engines": []}) or {"engines": []}
    meta = {entry.get("engine"): entry for entry in summary.get("engines", [])}

    row_heights = {}
    for letter, _ in rowspec:
        sample = next((images[(engine, letter)] for engine in available if (engine, letter) in images), None)
        row_heights[letter] = round(sample.height * cell_w / sample.width) if sample else 0

    height = header_h + sum(row_heights[letter] + label_h + row_gap for letter, _ in rowspec) + 90
    sheet = Image.new("RGB", (width, height), PAPER)
    draw = ImageDraw.Draw(sheet)

    draw.rectangle([0, 0, width, header_h], fill=DARK)
    text(draw, (pad, 38), "CROSS-BROWSER — SAME BUILD, SAME PRESETS", f=font(37, bold=True), fill=WHITE)
    text(draw, (pad, 92), "Production build served once. Chromium uses the RTX 4060; Firefox and WebKit use their Playwright builds.", f=font(19), fill=(196, 192, 182))
    text(draw, (pad, 126), "Screenshots are 1440×900 viewport stage crops. Full results in evidence/g3a1/cross-browser/*/results.json.", f=font(18), fill=(196, 192, 182))
    text(draw, (pad, 166), "WebKit here is the Playwright WebKitGTK/WPE build, not Safari on macOS.", f=font(18, bold=True), fill=(255, 170, 140))

    y = header_h + 24
    for letter, title in rowspec:
        text(draw, (pad, y), title, f=font(27, bold=True), fill=INK)
        y += 46
        img_h = row_heights[letter]
        for index, engine in enumerate(available):
            x = pad + index * (cell_w + 24)
            image = images.get((engine, letter))
            if image is None:
                continue
            paste_card(sheet, image, (x, y), cell_w)
            entry = meta.get(engine, {})
            text(draw, (x, y + img_h + 10), f"{engine} · {entry.get('version', 'unknown')}", f=font(20, bold=True), fill=INK)
            verdict = "PASS" if entry.get("failed", 1) == 0 and entry.get("available") else "CHECK"
            text(draw, (x + cell_w, y + img_h + 10), verdict, f=font(19, bold=True), fill=GOOD if verdict == "PASS" else COPPER, anchor="ra")
            webgl = entry.get("webgl") or {}
            text(
                draw,
                (x, y + img_h + 36),
                f"{entry.get('passed', 0)}/{entry.get('passed', 0) + entry.get('failed', 0)} checks · WebGL2 {webgl.get('webgl2')}",
                f=font(16, mono=True),
                fill=MUTED,
            )
        y += img_h + label_h + row_gap

    sheet.save(OUT / "BROWSER_SHEET.png")
    return sheet.size


if __name__ == "__main__":
    print("comparison", comparison_sheet())
    print("edges", edge_sheet())
    browser = browser_sheet()
    print("browser", browser)
