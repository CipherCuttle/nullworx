import type { EffectDefinition } from "./types";

export type EffectValidation<T> =
  | { ok: true; data: T }
  | { ok: false; issues: readonly string[] };

/** Validate an untrusted parameter object against an effect's runtime schema. */
export function validateEffectParams<T>(
  definition: EffectDefinition<T>,
  value: unknown,
): EffectValidation<T> {
  const result = definition.params.safeParse(value);
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    issues: result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${path}: ${issue.message}`;
    }),
  };
}
