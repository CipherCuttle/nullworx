export type HoloPresetId = "platinum" | "aurora" | "carbon";
export type HoloTone = "dark" | "light";
export type HoloMotionMode = "auto" | "full" | "reduced";
export type HoloVariant = "display" | "title" | "accent" | "button";

export interface HoloSettings {
  /** Light direction in degrees. */
  angle: number;
  /** Narrow-band spectral reflection. 0 is silver, 1 is pronounced. */
  spectral: number;
  /** Contrast and mirror-like character of the metal body. */
  metallic: number;
  /** Microtexture / brushed grain. */
  grain: number;
  /** Sweep rate. 0 freezes the sweep without losing the material. */
  speed: number;
  /** Pointer-driven hotspot and tilt. 0 disables both. */
  pointer: number;
  /** Explicit owner-facing static state. */
  animated: boolean;
}

export interface HoloPreset {
  id: HoloPresetId;
  name: string;
  note: string;
  settings: HoloSettings;
}

export const HOLO_PRESETS: readonly HoloPreset[] = [
  {
    id: "platinum",
    name: "Platinum Foil",
    note: "Cool silver body, one restrained spectral crease.",
    settings: {
      angle: 118,
      spectral: 0.4,
      metallic: 0.9,
      grain: 0.27,
      speed: 0.45,
      pointer: 0.7,
      animated: true,
    },
  },
  {
    id: "aurora",
    name: "Aurora Foil",
    note: "Broader diffraction, brighter split, softer metal.",
    settings: {
      angle: 148,
      spectral: 0.92,
      metallic: 0.7,
      grain: 0.2,
      speed: 0.7,
      pointer: 0.9,
      animated: true,
    },
  },
  {
    id: "carbon",
    name: "Carbon Hologram",
    note: "Darker body, coarser microtexture, colder glint.",
    settings: {
      angle: 96,
      spectral: 0.54,
      metallic: 0.62,
      grain: 0.58,
      speed: 0.3,
      pointer: 0.5,
      animated: true,
    },
  },
];

export const HOLO_DEFAULT_PRESET: HoloPresetId = "platinum";

export function getHoloPreset(
  preset: HoloPresetId | HoloPreset = HOLO_DEFAULT_PRESET,
): HoloPreset {
  if (typeof preset !== "string") return preset;
  return HOLO_PRESETS.find((item) => item.id === preset) ?? HOLO_PRESETS[0];
}

export function resolveHoloSettings(
  preset: HoloPresetId | HoloPreset = HOLO_DEFAULT_PRESET,
  overrides: Partial<HoloSettings> = {},
): HoloSettings {
  return { ...getHoloPreset(preset).settings, ...overrides };
}

export function holoStyleVars(settings: HoloSettings): Record<string, string> {
  const speed = Math.max(0, settings.speed);
  return {
    "--holo-angle": `${settings.angle}deg`,
    "--holo-spectral": String(clamp(settings.spectral)),
    "--holo-metal": String(clamp(settings.metallic)),
    "--holo-grain": String(clamp(settings.grain)),
    "--holo-speed": `${Math.max(2, 6.5 / Math.max(speed, 0.08)).toFixed(2)}s`,
    "--holo-pointer": String(clamp(settings.pointer)),
    "--holo-mx": "50%",
    "--holo-my": "46%",
    "--holo-rx": "0deg",
    "--holo-ry": "0deg",
  };
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
