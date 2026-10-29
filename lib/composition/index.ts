export {
  MASK_ALIGNMENTS,
  MASK_ALPHA_MODES,
  MASK_FITS,
  MASK_KINDS,
  MASK_MECHANISMS,
} from "./types";
export type {
  AnyMaterialDefinition,
  CompatibilityIssue,
  CompatibilityIssueCode,
  CompatibleRecipe,
  CompositionRecipe,
  MaskAlignment,
  MaskAlphaMode,
  MaskCoordinates,
  MaskDefinition,
  MaskFit,
  MaskGeometry,
  MaskKind,
  MaskMechanism,
  MaskReference,
  MaterialDefinition,
  MaterialMaskSupport,
  MaterialReference,
  MaterialSurfaceId,
  RecipeSetValidation,
  RecipeValidation,
  SvgPathMaskGeometry,
  TextMaskFont,
  TextMaskGeometry,
} from "./types";

export { DEFAULT_MASK_ID, MASKS, MOTH_MASK, WORDMARK_MASK, getMask, getMaskOrThrow } from "./masks";
export {
  DEFAULT_MATERIAL_ID,
  HOLOTYPE_MATERIAL,
  MATERIALS,
  PAPER_MATERIAL,
  getMaterial,
  getMaterialOrThrow,
} from "./materials";
export {
  DEFAULT_RECIPE_ID,
  RECIPES,
  RECIPE_A,
  RECIPE_B,
  RECIPE_C,
  RECIPE_D,
  getRecipe,
  getRecipeOrThrow,
} from "./recipes";
export {
  DEFAULT_COMPOSITION_REGISTRY,
  checkCompatibility,
  validateRecipe,
  validateRecipeSet,
} from "./compatibility";
export type { CompositionRegistry } from "./compatibility";
export { maskDefinitionSchema, recipeSchema, recipeSetSchema } from "./schemas";
export { maskViewBox } from "./mask-image";
