import {
  holoParamsSchema,
  motionParamsSchema,
  paperParamsSchema,
  type HoloParams,
  type MotionParams,
  type PaperParams,
} from "./schemas";
import type { AnyEffectDefinition, EffectDefinition } from "./types";

/** Expansion 02 source commit and tree hash for the byte-identical HoloType copy. */
export const HOLOTYPE_COMMIT = "847b85d8e74a2ca1d1eea9a55de320bbdc587059";
export const HOLOTYPE_SOURCE_SHA256 =
  "b0b4f17307c22c1c5d37defecfd5363095aaa19e67e5b3ff126856b0d8bf7eb9";

export const holotypeEffect = {
  id: "holotype-foil",
  version: "0.1.0",
  title: "HoloType",
  status: "review-pending",
  technology: "dom-css",
  summary:
    "An existing holographic-foil material for live text and inline SVG. Copied byte-for-byte from Expansion 02; owner visual approval is still pending.",
  params: holoParamsSchema,
  defaults: {
    preset: "platinum",
    tone: "dark",
    motion: "auto",
    spectral: 0.4,
    metallic: 0.9,
    grain: 0.27,
    speed: 0.45,
    pointer: 0.7,
    animated: true,
  },
  preview: {
    loader: () => import("@/components/labs/holotype-preview"),
    route: "/lab",
  },
  capabilities: {
    interactive: true,
    resizable: true,
    webgl: false,
    clientOnly: true,
  },
  reducedMotion: "freeze",
  exportTargets: ["react-component"],
  license: {
    spdx: "LicenseRef-Proprietary",
    holder: "UI Forge / Nullworx owner",
    redistribution: "restricted",
    notices: ["docs/PROVENANCE.md"],
  },
  provenance: {
    origin: "ui-forge-expansion-02",
    sourcePath: "experiments/holotype",
    commit: HOLOTYPE_COMMIT,
    sourceSha256: HOLOTYPE_SOURCE_SHA256,
    notes:
      "Imported unchanged from the Expansion 02 working tree. Not owner-approved, not a registry item, and not shown in the existing gallery.",
  },
} satisfies EffectDefinition<HoloParams>;

export const paperMeshEffect = {
  id: "paper-mesh-gradient",
  version: "0.1.0",
  title: "Paper Mesh Gradient",
  status: "experimental",
  technology: "webgl2",
  summary:
    "Upstream Paper Shaders MeshGradient, mounted directly. This adapter owns only presets, validation, reduced-motion speed and the render-pixel ceiling.",
  params: paperParamsSchema,
  defaults: {
    preset: "default",
    speed: 0.35,
    distortion: 0.8,
    swirl: 0.1,
    paused: false,
  },
  preview: {
    loader: () => import("@/components/labs/paper-mesh-preview"),
    route: "/lab",
  },
  capabilities: {
    interactive: true,
    resizable: true,
    webgl: true,
    clientOnly: true,
    maxPixelCount: 1_200_000,
  },
  reducedMotion: "static-frame",
  exportTargets: ["react-component"],
  license: {
    spdx: "Apache-2.0",
    holder: "Paper Design, Inc. (Paper Shaders)",
    redistribution: "allowed",
    notices: ["THIRD_PARTY_NOTICES.md", "third_party/paper-shaders/NOTICE"],
  },
  provenance: {
    origin: "npm",
    sourcePath: "node_modules/@paper-design/shaders-react",
    notes:
      "Direct dependency @paper-design/shaders-react@0.0.82; no vendor source, shader rewrite or renderer fork.",
  },
} satisfies EffectDefinition<PaperParams>;

export const motionBehaviorEffect = {
  id: "motion-signal-behavior",
  version: "0.1.0",
  title: "Motion Signal Behavior",
  status: "experimental",
  technology: "dom-motion",
  summary:
    "A small stateful behavior built with upstream Motion: layout indicator, keyed content transition and explicit reduced-motion fallback.",
  params: motionParamsSchema,
  defaults: {
    mode: "scan",
    intensity: 0.65,
    replay: 0,
  },
  preview: {
    loader: () => import("@/components/labs/motion-signal-preview"),
    route: "/lab",
  },
  capabilities: {
    interactive: true,
    resizable: true,
    webgl: false,
    clientOnly: true,
  },
  reducedMotion: "reduce",
  exportTargets: ["react-component"],
  license: {
    spdx: "MIT",
    holder: "Motion B.V.",
    redistribution: "allowed",
    notices: ["THIRD_PARTY_NOTICES.md", "third_party/motion/LICENSE.md"],
  },
  provenance: {
    origin: "npm",
    sourcePath: "node_modules/motion",
    notes:
      "Direct dependency motion@14.7.1. The adapter uses Motion's public React API; no source is vendored or modified.",
  },
} satisfies EffectDefinition<MotionParams>;

export const EFFECT_DEFINITIONS: readonly AnyEffectDefinition[] = [
  holotypeEffect,
  paperMeshEffect,
  motionBehaviorEffect,
];

export const DEFAULT_EFFECT_ID = holotypeEffect.id;

export function getEffect(id: string): AnyEffectDefinition | undefined {
  return EFFECT_DEFINITIONS.find((effect) => effect.id === id);
}

export function getEffectOrThrow(id: string): AnyEffectDefinition {
  const effect = getEffect(id);
  if (!effect) throw new Error(`Unknown effect id: ${id}`);
  return effect;
}
