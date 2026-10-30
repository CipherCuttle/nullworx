export type AsciiWavesPresetId = "flower";

export interface AsciiWavesPreset {
  id: AsciiWavesPresetId;
  title: string;
  subtitle: string;
  src: string;
  poster: string;
  startTime: number;
  credit: string;
  license: string;
  sourceUrl: string;
  /** Flower is the owner-approved default and the fidelity baseline. */
  loved: boolean;
  experimental: boolean;
}

/**
 * Flower is the only distributable preset. The experimental reels from the
 * local React 01 review are intentionally excluded from the UI Forge package
 * because their Pexels provenance was not independently verified.
 *
 * Copy public/media/flower.mp4 and public/media/motifs/flower-poster.jpg with
 * this component, or pass custom src/fallbackImage URLs.
 */
export const ASCII_WAVES_PRESETS: Record<AsciiWavesPresetId, AsciiWavesPreset> = {
  flower: {
    id: "flower",
    title: "Flower",
    subtitle: "Parrot bloom",
    src: "/media/flower.mp4",
    poster: "/media/motifs/flower-poster.jpg",
    startTime: 2.2,
    credit: "MDN contributors",
    license: "CC0 1.0",
    sourceUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    loved: true,
    experimental: false,
  },
};

export const ASCII_WAVES_PRESET_ORDER: AsciiWavesPresetId[] = ["flower"];

export const DEFAULT_ASCII_WAVES_PRESET: AsciiWavesPresetId = "flower";

export function resolvePreset(id: AsciiWavesPresetId | undefined): AsciiWavesPreset {
  return ASCII_WAVES_PRESETS[id ?? DEFAULT_ASCII_WAVES_PRESET]
    ?? ASCII_WAVES_PRESETS[DEFAULT_ASCII_WAVES_PRESET];
}
