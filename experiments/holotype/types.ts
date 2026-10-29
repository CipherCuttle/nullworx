import type { CSSProperties, HTMLAttributes } from "react";
import type {
  HoloMotionMode,
  HoloPreset,
  HoloPresetId,
  HoloSettings,
  HoloTone,
  HoloVariant,
} from "./presets";

export type HoloStyle = CSSProperties & Record<`--holo-${string}`, string>;

export interface HoloMaterialProps {
  preset?: HoloPresetId | HoloPreset;
  settings?: Partial<HoloSettings>;
  tone?: HoloTone;
  motion?: HoloMotionMode;
}

export interface HoloTextProps
  extends HoloMaterialProps,
    Omit<HTMLAttributes<HTMLElement>, "children" | "style"> {
  as?: "span" | "h1" | "h2" | "h3" | "p" | "div";
  children: string;
  variant?: HoloVariant;
  className?: string;
  style?: CSSProperties;
}

export interface HoloGlyphProps extends HoloMaterialProps {
  label: string;
  paths: readonly string[];
  strokes?: readonly string[];
  viewBox?: string;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
}
