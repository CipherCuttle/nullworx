import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import type {
  CRTMotionMode,
  CRTPreset,
  CRTPresetId,
  CRTSettings,
} from "./presets";

export interface CRTScreenProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "style"> {
  preset?: CRTPresetId | CRTPreset;
  settings?: Partial<CRTSettings>;
  motion?: CRTMotionMode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}
