import type { MaskDefinition } from "./types";

/**
 * Mask A — an original moth silhouette.
 *
 * Authored for G3-A from primitive geometry (body, head, antennae, forewings,
 * hindwings, two eyespots). It is not traced from the licensed Living Stencils
 * moth and no third-party artwork or photograph is embedded.
 *
 * ViewBox 0 0 400 260, centred on x = 200. The wings and body touch but do not
 * overlap, and the eyespot subpaths sit fully inside the forewings, so the
 * evenodd fill produces clean holes instead of accidental boolean artifacts.
 */
const MOTH_PATHS = [
  // head
  "M200 34 A10 10 0 1 1 200 54 A10 10 0 1 1 200 34 Z",
  // body
  "M200 54 C190 66 186 84 186 104 L186 178 C186 198 192 212 200 222 C208 212 214 198 214 178 L214 104 C214 84 210 66 200 54 Z",
  // left forewing
  "M186 98 C158 72 116 48 72 38 C46 32 24 46 26 70 C28 96 60 114 102 124 C134 131 166 120 186 110 Z",
  // right forewing
  "M214 98 C242 72 284 48 328 38 C354 32 376 46 374 70 C372 96 340 114 298 124 C266 131 234 120 214 110 Z",
  // left hindwing
  "M186 136 C158 144 130 162 116 184 C104 204 118 222 142 220 C168 218 184 196 186 164 Z",
  // right hindwing
  "M214 136 C242 144 270 162 284 184 C296 204 282 222 258 220 C232 218 216 196 214 164 Z",
  // left eyespot (hole)
  "M100 66 A12 12 0 1 1 100 90 A12 12 0 1 1 100 66 Z",
  // right eyespot (hole)
  "M300 66 A12 12 0 1 1 300 90 A12 12 0 1 1 300 66 Z",
];

const MOTH_STROKES = [
  // left antenna
  "M194 34 C180 22 164 16 150 12",
  // right antenna
  "M206 34 C220 22 236 16 250 12",
];

export const MOTH_MASK: MaskDefinition = {
  id: "nullworx-moth",
  version: "1.0.0",
  title: "Moth silhouette",
  kind: "svg-path",
  geometry: {
    kind: "svg-path",
    paths: MOTH_PATHS,
    strokes: MOTH_STROKES,
    strokeWidth: 3.5,
    fillRule: "evenodd",
  },
  coordinates: { width: 400, height: 260, preserveAspectRatio: "xMidYMid meet" },
  aspectRatio: 400 / 260,
  fit: "contain",
  align: "center",
  alpha: "binary",
  unsupportedBehavior:
    "The recipe is rejected before render. No substitute shape, crop or placeholder material is drawn.",
  notes: [
    "Original geometry authored for G3-A; no licensed or traced source.",
    "White shapes on transparency, consumed as binary alpha.",
    "Two eyespot subpaths are holes under the evenodd fill rule.",
  ],
  license: {
    spdx: "LicenseRef-Proprietary",
    holder: "Nullworx owner",
    redistribution: "restricted",
    notices: ["docs/G3A_COMPOSITION.md"],
  },
  provenance: {
    origin: "authored for nullworx G3-A",
    sourcePath: "lib/composition/masks.ts",
    sourceSha256: undefined,
    notes:
      "Primitive moth silhouette created for this proof. Not derived from the Living Stencils moth or any photograph.",
  },
};

/**
 * Mask B — the live wordmark.
 *
 * The same text, font weight, tracking and fit ratio are used by the native DOM
 * renderer (HoloText) and the canvas rasterizer (Paper surface). The browser
 * resolves the next/font Geist family, so there is no runtime font download and
 * no proprietary rasterization service.
 */
export const WORDMARK_MASK: MaskDefinition = {
  id: "nullworx-wordmark",
  version: "1.0.0",
  title: "NULLWORX wordmark",
  kind: "text",
  geometry: {
    kind: "text",
    text: "NULLWORX",
    font: {
      cssFamily: "var(--font-geist-sans), system-ui, sans-serif",
      variable: "--font-geist-sans",
      fallback: "system-ui, sans-serif",
      weight: 600,
      fit: 0.9,
      note:
        "Resolved in-browser from the next/font Geist variable. DOM text and the canvas mask share the same family, weight and fit. The resolved family is reported in the lab capability panel.",
    },
  },
  coordinates: { width: 1200, height: 240, preserveAspectRatio: "xMidYMid meet" },
  aspectRatio: 1200 / 240,
  fit: "contain",
  align: "center",
  alpha: "binary",
  unsupportedBehavior:
    "The recipe is rejected before render. If the canvas rasterizer is unavailable, the lab shows an explicit mask error instead of drawing unclipped material.",
  notes: [
    "Fixed wordmark for this proof; no user-supplied SVG or HTML.",
    "The wordmark box is fitted to 90% of the mask width for both backends.",
    "Glyph shapes follow the browser-resolved Geist font; no external service is used.",
  ],
  license: {
    spdx: "LicenseRef-Proprietary",
    holder: "Nullworx owner",
    redistribution: "restricted",
    notices: ["docs/G3A_COMPOSITION.md"],
  },
  provenance: {
    origin: "authored for nullworx G3-A",
    sourcePath: "lib/composition/masks.ts",
    notes:
      "Live text rendered with the existing Nullworx Geist font variable. No font file is vendored by this proof.",
  },
};

export const MASKS: readonly MaskDefinition[] = [MOTH_MASK, WORDMARK_MASK];

export function getMask(id: string): MaskDefinition | undefined {
  return MASKS.find((mask) => mask.id === id);
}

export function getMaskOrThrow(id: string): MaskDefinition {
  const mask = getMask(id);
  if (!mask) throw new Error(`Unknown mask id: ${id}`);
  return mask;
}

export const DEFAULT_MASK_ID = MOTH_MASK.id;
