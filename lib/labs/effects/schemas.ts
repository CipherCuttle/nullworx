import { z } from "zod";

export const HOLO_PRESET_IDS = ["platinum", "aurora", "carbon"] as const;
export const HOLO_TONES = ["dark", "light"] as const;
export const HOLO_MOTION_MODES = ["auto", "full", "reduced"] as const;

export const holoParamsSchema = z.object({
  preset: z.enum(HOLO_PRESET_IDS),
  tone: z.enum(HOLO_TONES),
  motion: z.enum(HOLO_MOTION_MODES),
  spectral: z.number().min(0).max(1),
  metallic: z.number().min(0).max(1),
  grain: z.number().min(0).max(1),
  speed: z.number().min(0).max(1.6),
  pointer: z.number().min(0).max(1),
  animated: z.boolean(),
});
export type HoloParams = z.infer<typeof holoParamsSchema>;

export const PAPER_PRESET_IDS = ["default", "purple", "beach", "ink"] as const;

export const paperParamsSchema = z.object({
  preset: z.enum(PAPER_PRESET_IDS),
  /** 0 freezes the shader. */
  speed: z.number().min(0).max(2),
  distortion: z.number().min(0).max(2),
  swirl: z.number().min(0).max(1.5),
  paused: z.boolean(),
});
export type PaperParams = z.infer<typeof paperParamsSchema>;

export const MOTION_MODES = ["scan", "hold", "release"] as const;

export const motionParamsSchema = z.object({
  mode: z.enum(MOTION_MODES),
  intensity: z.number().min(0).max(1),
  /** Increment to replay the entry transition without remounting the preview. */
  replay: z.number().int().min(0).max(1000),
});
export type MotionParams = z.infer<typeof motionParamsSchema>;
