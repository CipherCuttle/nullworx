import type { ComponentType } from "react";
import type { ZodType } from "zod";

export const EFFECT_STATUSES = [
  "approved",
  "review-pending",
  "experimental",
  "blocked",
] as const;
export type EffectStatus = (typeof EFFECT_STATUSES)[number];

export const RENDER_TECHNOLOGIES = ["dom-css", "webgl2", "dom-motion"] as const;
export type RenderTechnology = (typeof RENDER_TECHNOLOGIES)[number];

export const REDUCED_MOTION_BEHAVIORS = [
  "freeze",
  "static-frame",
  "reduce",
  "none",
] as const;
export type ReducedMotionBehavior = (typeof REDUCED_MOTION_BEHAVIORS)[number];

export const EXPORT_TARGETS = [
  "react-component",
  "png-sequence",
  "webm",
] as const;
export type ExportTarget = (typeof EXPORT_TARGETS)[number];

export interface EffectPreviewModule {
  default: ComponentType;
}

export interface EffectCapabilities {
  interactive: boolean;
  resizable: boolean;
  webgl: boolean;
  clientOnly: boolean;
  /** Render-pixel ceiling honoured by WebGL adapters, when applicable. */
  maxPixelCount?: number;
}

export interface EffectLicense {
  spdx: string;
  holder: string;
  redistribution: "allowed" | "restricted" | "unknown";
  notices: readonly string[];
}

export interface EffectProvenance {
  origin: string;
  sourcePath: string;
  commit?: string;
  sourceSha256?: string;
  notes: string;
}

/**
 * Minimal metadata contract for an effect. It deliberately does not prescribe a
 * renderer or a universal prop interface: the preview loader returns a
 * self-contained component and the adapter owns its own lifecycle.
 */
export interface EffectDefinition<TParams> {
  id: string;
  version: string;
  title: string;
  status: EffectStatus;
  technology: RenderTechnology;
  summary: string;
  /** Runtime validator, not just a TypeScript type. */
  params: ZodType<TParams>;
  defaults: TParams;
  preview: {
    loader: () => Promise<EffectPreviewModule>;
    route: string;
  };
  capabilities: EffectCapabilities;
  reducedMotion: ReducedMotionBehavior;
  exportTargets: readonly ExportTarget[];
  license: EffectLicense;
  provenance: EffectProvenance;
}

export type AnyEffectDefinition = EffectDefinition<unknown>;
