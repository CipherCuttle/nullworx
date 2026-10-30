import { z } from "zod";
import { MASKS } from "./masks";
import { MATERIALS } from "./materials";
import { recipeSchema, recipeSetSchema } from "./schemas";
import type {
  AnyMaterialDefinition,
  CompatibilityIssue,
  CompatibleRecipe,
  MaskDefinition,
  RecipeSetValidation,
  RecipeValidation,
} from "./types";

export interface CompositionRegistry {
  masks: readonly MaskDefinition[];
  materials: readonly AnyMaterialDefinition[];
}

export const DEFAULT_COMPOSITION_REGISTRY: CompositionRegistry = {
  masks: MASKS,
  materials: MATERIALS,
};

function structuralIssues(error: z.ZodError, prefix = ""): CompatibilityIssue[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return {
      code: "invalid-structure",
      path: prefix ? `${prefix}.${path}` : path,
      message: issue.message,
    };
  });
}

/**
 * The single compatibility rule: the material must advertise the mask kind
 * through a mechanism it actually implements. There is no per-pair override.
 */
export function checkCompatibility(
  mask: MaskDefinition,
  material: AnyMaterialDefinition,
): { ok: true; mechanism: AnyMaterialDefinition["mask"]["mechanism"]; message: string } | { ok: false; issue: CompatibilityIssue } {
  if (!material.mask.kinds.includes(mask.kind)) {
    return {
      ok: false,
      issue: {
        code: "unsupported-mask-kind",
        path: `material.${material.effect.id}.mask.kinds`,
        message: `${material.effect.title} does not advertise the "${mask.kind}" mask kind; it advertises ${material.mask.kinds.join(", ")}.`,
      },
    };
  }
  return {
    ok: true,
    mechanism: material.mask.mechanism,
    message: `${material.effect.title} consumes "${mask.kind}" via ${material.mask.mechanism}; clipping is ${material.mask.clipping}.`,
  };
}

export function validateRecipe(
  input: unknown,
  registry: CompositionRegistry = DEFAULT_COMPOSITION_REGISTRY,
): RecipeValidation {
  const parsed = recipeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, issues: structuralIssues(parsed.error) };
  }

  const recipe = parsed.data;
  const issues: CompatibilityIssue[] = [];

  const mask = registry.masks.find((candidate) => candidate.id === recipe.mask.id);
  if (!mask) {
    issues.push({
      code: "unknown-mask",
      path: "mask.id",
      message: `No mask is registered with id "${recipe.mask.id}".`,
    });
  } else if (mask.version !== recipe.mask.version) {
    issues.push({
      code: "version-mismatch",
      path: "mask.version",
      message: `Mask "${mask.id}" is version ${mask.version}, recipe requested ${recipe.mask.version}.`,
    });
  }

  const material = registry.materials.find((candidate) => candidate.effect.id === recipe.material.id);
  if (!material) {
    issues.push({
      code: "unknown-material",
      path: "material.id",
      message: `No material is registered with id "${recipe.material.id}".`,
    });
  } else if (material.effect.version !== recipe.material.version) {
    issues.push({
      code: "version-mismatch",
      path: "material.version",
      message: `Material "${material.effect.id}" is version ${material.effect.version}, recipe requested ${recipe.material.version}.`,
    });
  }

  let parsedParams: unknown;
  if (mask && material) {
    const compatibility = checkCompatibility(mask, material);
    if (!compatibility.ok) {
      issues.push(compatibility.issue);
    }

    const params = material.effect.params.safeParse(recipe.params);
    if (!params.success) {
      issues.push(
        ...params.error.issues.map((issue) => ({
          code: "invalid-params" as const,
          path: `params.${issue.path.length > 0 ? issue.path.join(".") : "(root)"}`,
          message: issue.message,
        })),
      );
    } else {
      parsedParams = params.data;
    }
  }

  if (issues.length > 0 || !mask || !material) {
    return { ok: false, issues };
  }

  const compatibility = checkCompatibility(mask, material);
  if (!compatibility.ok) {
    return { ok: false, issues: [compatibility.issue] };
  }

  const value: CompatibleRecipe = {
    recipe,
    mask,
    material,
    params: parsedParams,
    compatibility: {
      code: "compatible",
      mechanism: compatibility.mechanism,
      message: compatibility.message,
    },
  };

  return { ok: true, value };
}

/**
 * Validate a set of recipes and reject duplicate ids before any surface mounts.
 */
export function validateRecipeSet(
  input: unknown,
  registry: CompositionRegistry = DEFAULT_COMPOSITION_REGISTRY,
): RecipeSetValidation {
  const parsed = recipeSetSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, issues: structuralIssues(parsed.error) };
  }

  const issues: CompatibilityIssue[] = [];
  const seen = new Set<string>();
  const values: CompatibleRecipe[] = [];

  parsed.data.forEach((recipe, index) => {
    if (seen.has(recipe.id)) {
      issues.push({
        code: "duplicate-recipe-id",
        path: `recipes.${index}.id`,
        message: `Recipe id "${recipe.id}" appears more than once.`,
      });
    }
    seen.add(recipe.id);

    const result = validateRecipe(recipe, registry);
    if (result.ok) {
      values.push(result.value);
    } else {
      issues.push(
        ...result.issues.map((issue) => ({
          ...issue,
          path: `recipes.${index}.${issue.path}`,
        })),
      );
    }
  });

  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return { ok: true, values };
}
