import type { CompositionRecipe } from "./types";

/**
 * The four G3-A comparison presets.
 *
 * Each recipe is data, not a renderer branch: it references a mask id and a
 * material id, and its params are validated by that material's existing
 * EffectDefinition schema at runtime.
 */
export const RECIPE_A: CompositionRecipe = {
  id: "a-moth-holotype",
  version: "1.0.0",
  title: "A — Moth × HoloType",
  mask: { id: "nullworx-moth", version: "1.0.0" },
  material: { id: "holotype-foil", version: "0.1.0" },
  params: {
    preset: "platinum",
    tone: "dark",
    motion: "auto",
    spectral: 0.55,
    metallic: 0.92,
    grain: 0.24,
    speed: 0.4,
    pointer: 0.7,
    animated: true,
  },
  playback: { paused: false },
  notes: "Native SVG geometry through the existing HoloGlyph interface.",
};

export const RECIPE_B: CompositionRecipe = {
  id: "b-moth-paper",
  version: "1.0.0",
  title: "B — Moth × Paper MeshGradient",
  mask: { id: "nullworx-moth", version: "1.0.0" },
  material: { id: "paper-mesh-gradient", version: "0.1.0" },
  params: {
    preset: "beach",
    speed: 0.3,
    distortion: 0.75,
    swirl: 0.12,
    paused: false,
  },
  playback: { paused: false },
  notes: "Container-level CSS alpha mask over the unmodified upstream canvas.",
};

export const RECIPE_C: CompositionRecipe = {
  id: "c-wordmark-holotype",
  version: "1.0.0",
  title: "C — Wordmark × HoloType",
  mask: { id: "nullworx-wordmark", version: "1.0.0" },
  material: { id: "holotype-foil", version: "0.1.0" },
  params: {
    preset: "aurora",
    tone: "dark",
    motion: "auto",
    spectral: 0.85,
    metallic: 0.7,
    grain: 0.18,
    speed: 0.55,
    pointer: 0.8,
    animated: true,
  },
  playback: { paused: false },
  notes: "Live DOM text through the existing HoloText interface.",
};

export const RECIPE_D: CompositionRecipe = {
  id: "d-wordmark-paper",
  version: "1.0.0",
  title: "D — Wordmark × Paper MeshGradient",
  mask: { id: "nullworx-wordmark", version: "1.0.0" },
  material: { id: "paper-mesh-gradient", version: "0.1.0" },
  params: {
    preset: "purple",
    speed: 0.32,
    distortion: 0.9,
    swirl: 0.08,
    paused: false,
  },
  playback: { paused: false },
  notes: "Canvas-rasterized wordmark mask over the unmodified upstream canvas.",
};

export const RECIPES: readonly CompositionRecipe[] = [RECIPE_A, RECIPE_B, RECIPE_C, RECIPE_D];

export function getRecipe(id: string): CompositionRecipe | undefined {
  return RECIPES.find((recipe) => recipe.id === id);
}

export function getRecipeOrThrow(id: string): CompositionRecipe {
  const recipe = getRecipe(id);
  if (!recipe) throw new Error(`Unknown recipe id: ${id}`);
  return recipe;
}

export const DEFAULT_RECIPE_ID = RECIPE_A.id;
