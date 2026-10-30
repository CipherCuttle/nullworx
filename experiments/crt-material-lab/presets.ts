export type CRTPresetId = "green" | "amber" | "broken";
export type CRTMotionMode = "auto" | "full" | "reduced";

export interface CRTSettings {
  /** Scanline density. 0 is off; 1 is the finest pitch. */
  scanlines: number;
  /** Phosphor bloom width. */
  glow: number;
  /** Red/cyan channel separation. */
  chromatic: number;
  /** Tube-edge curvature, vignette and corner radius. */
  curvature: number;
  /** Signal noise. */
  noise: number;
  /** Horizontal tearing and intermittent interference. */
  distortion: number;
  /** Animation intensity. 0 is a static still. */
  animation: number;
}

export interface CRTPreset {
  id: CRTPresetId;
  name: string;
  note: string;
  settings: CRTSettings;
  colors: {
    screen: string;
    screenGlow: string;
    phosphor: string;
    phosphorRgb: string;
    dim: string;
    bezel: string;
    mediaFilter: string;
    fringeA: string;
    fringeB: string;
  };
}

export const CRT_PRESETS: readonly CRTPreset[] = [
  {
    id: "green",
    name: "Green Phosphor",
    note: "P1 terminal green, fine line structure, shallow afterglow.",
    settings: {
      scanlines: 0.76,
      glow: 0.42,
      chromatic: 0.08,
      curvature: 0.5,
      noise: 0.17,
      distortion: 0.04,
      animation: 0.35,
    },
    colors: {
      screen: "#020b06",
      screenGlow: "#0a2e1d",
      phosphor: "#8dffb8",
      phosphorRgb: "141 255 184",
      dim: "#3f7d58",
      bezel: "#080c09",
      mediaFilter:
        "grayscale(1) sepia(0.82) hue-rotate(56deg) saturate(2.6) brightness(0.82) contrast(1.2)",
      fringeA: "72 255 206",
      fringeB: "255 64 106",
    },
  },
  {
    id: "amber",
    name: "Amber Terminal",
    note: "Warm P3 phosphor, darker glass, slower persistence.",
    settings: {
      scanlines: 0.64,
      glow: 0.56,
      chromatic: 0.1,
      curvature: 0.55,
      noise: 0.19,
      distortion: 0.03,
      animation: 0.28,
    },
    colors: {
      screen: "#120801",
      screenGlow: "#2f1505",
      phosphor: "#ffc06f",
      phosphorRgb: "255 192 111",
      dim: "#8b5a28",
      bezel: "#0d0905",
      mediaFilter:
        "grayscale(1) sepia(1) hue-rotate(340deg) saturate(2.9) brightness(0.82) contrast(1.18)",
      fringeA: "255 188 88",
      fringeB: "255 72 92",
    },
  },
  {
    id: "broken",
    name: "Broken Signal",
    note: "RGB split, hard tear bands, intermittent carrier loss.",
    settings: {
      scanlines: 0.38,
      glow: 0.52,
      chromatic: 0.78,
      curvature: 0.32,
      noise: 0.3,
      distortion: 0.86,
      animation: 0.82,
    },
    colors: {
      screen: "#03070b",
      screenGlow: "#0b1d2a",
      phosphor: "#ecfeff",
      phosphorRgb: "236 254 255",
      dim: "#55717b",
      bezel: "#070a0d",
      mediaFilter:
        "saturate(1.28) contrast(1.16) brightness(0.92) hue-rotate(-5deg)",
      fringeA: "45 230 255",
      fringeB: "255 48 104",
    },
  },
];

export const CRT_DEFAULT_PRESET: CRTPresetId = "green";

export function getCRTPreset(
  preset: CRTPresetId | CRTPreset = CRT_DEFAULT_PRESET,
): CRTPreset {
  if (typeof preset !== "string") return preset;
  return CRT_PRESETS.find((item) => item.id === preset) ?? CRT_PRESETS[0];
}

export function resolveCRTSettings(
  preset: CRTPresetId | CRTPreset = CRT_DEFAULT_PRESET,
  overrides: Partial<CRTSettings> = {},
): CRTSettings {
  return { ...getCRTPreset(preset).settings, ...overrides };
}

export function crtStyleVars(
  preset: CRTPresetId | CRTPreset,
  settings: CRTSettings,
): Record<string, string> {
  const resolved = getCRTPreset(preset);
  const speed = Math.max(settings.animation, 0.08);
  const fringeAlpha = clamp(settings.chromatic * 0.58 + 0.03);
  const scanAlpha = settings.scanlines <= 0 ? 0 : 0.07 + settings.scanlines * 0.27;

  return {
    "--crt-screen": resolved.colors.screen,
    "--crt-screen-glow": resolved.colors.screenGlow,
    "--crt-phosphor": resolved.colors.phosphor,
    "--crt-phosphor-rgb": resolved.colors.phosphorRgb,
    "--crt-dim": resolved.colors.dim,
    "--crt-bezel": resolved.colors.bezel,
    "--crt-media-filter": resolved.colors.mediaFilter,
    "--crt-fringe-a": resolved.colors.fringeA,
    "--crt-fringe-b": resolved.colors.fringeB,
    "--crt-pitch": `${(9.2 - settings.scanlines * 6.4).toFixed(2)}px`,
    "--crt-scan-alpha": scanAlpha.toFixed(3),
    "--crt-glow": `${(settings.glow * 18).toFixed(1)}px`,
    "--crt-glow-alpha": (0.12 + settings.glow * 0.42).toFixed(3),
    "--crt-shift": `${(settings.chromatic * 3.4).toFixed(2)}px`,
    "--crt-fringe-alpha": fringeAlpha.toFixed(3),
    "--crt-radius": `${(7 + settings.curvature * 25).toFixed(1)}px`,
    "--crt-vignette": (0.18 + settings.curvature * 0.56).toFixed(3),
    "--crt-noise": (settings.noise * 0.3).toFixed(3),
    "--crt-distort": settings.distortion.toFixed(3),
    "--crt-tear-duration": `${(6.8 / speed).toFixed(2)}s`,
    "--crt-jitter-duration": `${(7.6 / speed).toFixed(2)}s`,
  };
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
