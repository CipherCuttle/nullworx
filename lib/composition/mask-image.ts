import type { MaskDefinition } from "./types";

/**
 * Browser-side mask sources.
 *
 * Vector masks become an SVG data URL. Text masks are rasterized locally on a
 * canvas that uses the same next/font family as the DOM wordmark. No network
 * request, external service or vendored SVG is involved.
 */

export interface MaskImageFont {
  /** The resolved CSS family expression, for display. */
  stack: string;
  family: string;
  variablePresent: boolean;
  loaded: boolean;
  weight: number;
}

export interface MaskImage {
  url: string;
  /** Pixel or user-unit dimensions of the generated source. */
  width: number;
  height: number;
  source: "svg" | "canvas";
  font?: MaskImageFont;
}

export function maskViewBox(mask: MaskDefinition): string {
  return `0 0 ${mask.coordinates.width} ${mask.coordinates.height}`;
}

export function cssMaskUrl(image: MaskImage): string {
  return `url("${image.url}")`;
}

function pathMarkup(mask: MaskDefinition): string {
  if (mask.geometry.kind !== "svg-path") {
    throw new Error(`Mask ${mask.id} is not an SVG path mask.`);
  }
  const strokeWidth = Number(mask.geometry.strokeWidth.toFixed(2));
  const strokes = mask.geometry.strokes
    .map(
      (d) =>
        `<path d="${d}" fill="none" stroke="#fff" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join("");
  return `<path d="${mask.geometry.paths.join(" ")}" fill="#fff" fill-rule="${mask.geometry.fillRule}"/>${strokes}`;
}

export function maskImageFromSvg(mask: MaskDefinition): MaskImage {
  const { width, height, preserveAspectRatio } = mask.coordinates;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="${preserveAspectRatio}">${pathMarkup(mask)}</svg>`;
  return {
    url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    width,
    height,
    source: "svg",
  };
}

function firstFamily(stack: string): string {
  return stack.split(",")[0]?.trim() || "system-ui";
}

/**
 * Resolve the next/font variable on the document and wait for the wordmark font
 * to be usable by Canvas 2D. Falls back to the declared system stack.
 */
export async function resolvePageFont(mask: MaskDefinition): Promise<MaskImageFont> {
  if (mask.geometry.kind !== "text") {
    throw new Error(`Mask ${mask.id} is not a text mask.`);
  }
  const font = mask.geometry.font;
  if (typeof window === "undefined") {
    return {
      stack: font.fallback,
      family: "system-ui",
      variablePresent: false,
      loaded: false,
      weight: font.weight,
    };
  }

  const raw = getComputedStyle(document.body).getPropertyValue(font.variable).trim();
  // Probe the first family only. next/font emits a synthetic "… Fallback" face
  // whose local source can fail; a probe containing it returns false even when
  // the real webfont is loaded.
  const family = firstFamily(raw || font.fallback);
  const stack = raw ? `${raw}, ${font.fallback}` : font.fallback;
  const probe = `${font.weight} 100px ${family}`;

  try {
    await document.fonts.load(probe, mask.geometry.text);
  } catch {
    // A missing family is not fatal: Canvas falls back to the declared stack.
  }
  try {
    await document.fonts.ready;
  } catch {
    // Safari can reject the ready promise in private contexts; continue.
  }

  let loaded = false;
  try {
    loaded = document.fonts.check(probe, mask.geometry.text);
  } catch {
    loaded = false;
  }

  return {
    stack,
    family,
    variablePresent: Boolean(raw),
    loaded,
    weight: font.weight,
  };
}

/**
 * Rasterize the wordmark at 2x its viewBox. The wordmark is fitted to the same
 * fraction of the box as the DOM renderer, so both backends agree on the
 * horizontal extent even though their edge rendering differs.
 */
export async function createTextMaskImage(mask: MaskDefinition): Promise<MaskImage> {
  if (mask.geometry.kind !== "text") {
    throw new Error(`Mask ${mask.id} is not a text mask.`);
  }
  if (typeof document === "undefined") {
    throw new Error("Text mask rasterization requires a browser document.");
  }

  const scale = 2;
  const width = Math.round(mask.coordinates.width * scale);
  const height = Math.round(mask.coordinates.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) {
    throw new Error("Canvas 2D is unavailable; the text mask cannot be rasterized.");
  }

  const font = await resolvePageFont(mask);
  const geometry = mask.geometry;
  const fontSpec = (size: number) => `${geometry.font.weight} ${size}px ${font.stack}`;

  const baseSize = height;
  context.font = fontSpec(baseSize);
  const measured = context.measureText(geometry.text).width || 1;
  const maxWidth = width * geometry.font.fit;
  // Cap height is approximately 0.72em for the Space Grotesk uppercase wordmark.
  const byWidth = maxWidth / measured;
  const byHeight = (height * 0.84) / (baseSize * 0.72);
  const size = baseSize * Math.min(1, byWidth, byHeight);

  context.font = fontSpec(size);
  context.fillStyle = "#fff";
  context.textAlign = "center";
  // Centre the actual ink box, not the em box. The DOM renderer is centred by
  // its line box; centring the em box on canvas would sit the uppercase
  // wordmark several percent above the DOM text and break the mask alignment.
  context.textBaseline = "alphabetic";
  const ink = context.measureText(geometry.text);
  const ascent = Number.isFinite(ink.actualBoundingBoxAscent)
    ? ink.actualBoundingBoxAscent
    : size * 0.72;
  const descent = Number.isFinite(ink.actualBoundingBoxDescent)
    ? ink.actualBoundingBoxDescent
    : 0;
  const baseline = (height - (ascent + descent)) / 2 + ascent;
  context.fillText(geometry.text, width / 2, baseline);

  return {
    url: canvas.toDataURL("image/png"),
    width,
    height,
    source: "canvas",
    font,
  };
}
