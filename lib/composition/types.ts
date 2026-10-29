import type { ZodType } from "zod";
import type {
  EffectDefinition,
  EffectLicense,
  EffectProvenance,
  EffectStatus,
  RenderTechnology,
} from "@/lib/labs/effects";

/**
 * G3-A composition contracts.
 *
 * These describe *what* a mask or material can do. They deliberately do not
 * describe how a renderer draws it: surfaces consume the definitions through a
 * narrow adapter, and no contract carries shader source, DOM nodes or React
 * components.
 */

export const MASK_KINDS = ["svg-path", "text"] as const;
export type MaskKind = (typeof MASK_KINDS)[number];

export const MASK_FITS = ["contain"] as const;
export type MaskFit = (typeof MASK_FITS)[number];

export const MASK_ALIGNMENTS = ["center"] as const;
export type MaskAlignment = (typeof MASK_ALIGNMENTS)[number];

/**
 * How the mask's coverage is defined. Both G3-A masks are binary alpha: white
 * shapes on transparency. Luminance masks are intentionally not implemented.
 */
export const MASK_ALPHA_MODES = ["binary"] as const;
export type MaskAlphaMode = (typeof MASK_ALPHA_MODES)[number];

export const MASK_MECHANISMS = ["native-geometry", "css-mask"] as const;
export type MaskMechanism = (typeof MASK_MECHANISMS)[number];

export interface MaskCoordinates {
  /** User-unit width of the viewBox. The viewBox origin is always 0 0. */
  width: number;
  height: number;
  /** Explicit SVG preserveAspectRatio value. */
  preserveAspectRatio: "xMidYMid meet";
}

export interface SvgPathMaskGeometry {
  kind: "svg-path";
  paths: readonly string[];
  strokes: readonly string[];
  strokeWidth: number;
  fillRule: "evenodd" | "nonzero";
}

export interface TextMaskFont {
  /** CSS expression used by DOM renderers (for example a next/font variable). */
  cssFamily: string;
  /** CSS custom property resolved at runtime for canvas rasterization. */
  variable: string;
  fallback: string;
  weight: number;
  /** Fraction of the mask width the wordmark may occupy. */
  fit: number;
  note: string;
}

export interface TextMaskGeometry {
  kind: "text";
  text: string;
  font: TextMaskFont;
}

export type MaskGeometry = SvgPathMaskGeometry | TextMaskGeometry;

export interface MaskDefinition {
  id: string;
  version: string;
  title: string;
  kind: MaskKind;
  geometry: MaskGeometry;
  coordinates: MaskCoordinates;
  /** width / height, derived and checked at validation time. */
  aspectRatio: number;
  fit: MaskFit;
  align: MaskAlignment;
  alpha: MaskAlphaMode;
  /** Visible behavior when a material cannot consume this mask kind. */
  unsupportedBehavior: string;
  notes: readonly string[];
  license: EffectLicense;
  provenance: EffectProvenance;
}

export type MaterialSurfaceId = "holotype" | "paper";

export interface MaterialMaskSupport {
  /** Mask kinds this material can consume through its public API. */
  kinds: readonly MaskKind[];
  mechanism: MaskMechanism;
  /** What the mask clips: the whole material, or the material's own geometry. */
  clipping: "material-content" | "native-geometry";
  note: string;
}

/**
 * A material reuses the existing EffectDefinition for status, technology,
 * parameter schema/defaults, capabilities, license and provenance. Only the
 * mask capability and the surface seam are new.
 */
export interface MaterialDefinition<TParams> {
  effect: EffectDefinition<TParams>;
  surface: MaterialSurfaceId;
  mask: MaterialMaskSupport;
  /** Honest description of what can be taken out of this proof. */
  exportCapability: string;
  /** Known limitations shown in the lab rather than hidden. */
  knownGaps: readonly string[];
}

export type AnyMaterialDefinition = MaterialDefinition<unknown>;

export interface MaskReference {
  id: string;
  version: string;
}

export interface MaterialReference {
  id: string;
  version: string;
}

export interface CompositionRecipe {
  id: string;
  version: string;
  title: string;
  mask: MaskReference;
  material: MaterialReference;
  /** Validated against the material's EffectDefinition.params schema. */
  params: Record<string, unknown>;
  playback: { paused: boolean };
  notes?: string;
}

export type CompatibilityIssueCode =
  | "invalid-structure"
  | "unknown-mask"
  | "unknown-material"
  | "duplicate-recipe-id"
  | "version-mismatch"
  | "unsupported-mask-kind"
  | "invalid-params";

export interface CompatibilityIssue {
  code: CompatibilityIssueCode;
  path: string;
  message: string;
}

export interface CompatibleRecipe {
  recipe: CompositionRecipe;
  mask: MaskDefinition;
  material: AnyMaterialDefinition;
  /** Parsed by the material's own runtime schema. */
  params: unknown;
  compatibility: {
    code: "compatible";
    mechanism: MaskMechanism;
    message: string;
  };
}

export type RecipeValidation =
  | { ok: true; value: CompatibleRecipe }
  | { ok: false; issues: readonly CompatibilityIssue[] };

export type RecipeSetValidation =
  | { ok: true; values: readonly CompatibleRecipe[] }
  | { ok: false; issues: readonly CompatibilityIssue[] };

export interface MaterialDefinitionInput<TParams> {
  effect: EffectDefinition<TParams>;
  surface: MaterialSurfaceId;
  mask: MaterialMaskSupport;
  exportCapability: string;
  knownGaps: readonly string[];
}

/** Metadata helpers shared by the lab and the contract checks. */
export function materialEffectId(material: AnyMaterialDefinition): string {
  return material.effect.id;
}

export function materialStatus(material: AnyMaterialDefinition): EffectStatus {
  return material.effect.status;
}

export function materialTechnology(material: AnyMaterialDefinition): RenderTechnology {
  return material.effect.technology;
}

export function materialParamSchema(material: AnyMaterialDefinition): ZodType<unknown> {
  return material.effect.params;
}
