import { holotypeEffect, paperMeshEffect } from "@/lib/labs/effects";
import type { HoloParams, PaperParams } from "@/lib/labs/effects/schemas";
import type { AnyMaterialDefinition, MaterialDefinition } from "./types";

/**
 * Material A — the existing HoloType effect.
 *
 * Both supported masks map onto HoloType's own public interfaces: HoloGlyph for
 * vector paths and HoloText for live text. There is no CSS mask and no renderer
 * fork. HoloType stays REVIEW_PENDING and is only mounted on experimental lab
 * routes.
 */
export const HOLOTYPE_MATERIAL = {
  effect: holotypeEffect,
  surface: "holotype",
  mask: {
    kinds: ["svg-path", "text"],
    mechanism: "native-geometry",
    clipping: "native-geometry",
    note: "HoloGlyph draws path geometry directly; HoloText draws live DOM text. The mask is the material's own shape, so no container clip is applied.",
  },
  exportCapability:
    "React source-level reuse only (react-component). No PNG sequence, video or shader export is implemented in G3-A.",
  knownGaps: [
    "REVIEW_PENDING: not admitted to the gallery or the distribution registry.",
    "No licence file exists in the HoloType source tree; redistribution is restricted.",
    "The depth/edge treatment is part of the material and extends a few pixels beyond the nominal glyph alpha.",
  ],
} satisfies MaterialDefinition<HoloParams>;

/**
 * Material B — the upstream Paper Shaders MeshGradient.
 *
 * The published React component is mounted unchanged. The mask is applied by a
 * single container-level CSS alpha mask built from the MaskDefinition. No
 * shader source, uniform or renderer is modified.
 */
export const PAPER_MATERIAL = {
  effect: paperMeshEffect,
  surface: "paper",
  mask: {
    kinds: ["svg-path", "text"],
    mechanism: "css-mask",
    clipping: "material-content",
    note: "The upstream canvas is mounted unchanged inside a container with a CSS alpha mask. The mask clips the material's rendered content; no shader source is edited.",
  },
  exportCapability:
    "React source-level reuse only (react-component). The mask is a browser-generated data URL; no PNG or video export is implemented in G3-A.",
  knownGaps: [
    "WebGL2 is required; unsupported browsers get an explicit fallback instead of a material.",
    "Text masks are rasterized at 2x the mask viewBox; this proof does not export vector text.",
    "The shader is stopped with speed 0 under reduced motion or pause; this is a static frame, not a separate render path.",
  ],
} satisfies MaterialDefinition<PaperParams>;

export const MATERIALS: readonly AnyMaterialDefinition[] = [HOLOTYPE_MATERIAL, PAPER_MATERIAL];

export function getMaterial(id: string): AnyMaterialDefinition | undefined {
  return MATERIALS.find((material) => material.effect.id === id);
}

export function getMaterialOrThrow(id: string): AnyMaterialDefinition {
  const material = getMaterial(id);
  if (!material) throw new Error(`Unknown material id: ${id}`);
  return material;
}

export const DEFAULT_MATERIAL_ID = HOLOTYPE_MATERIAL.effect.id;
