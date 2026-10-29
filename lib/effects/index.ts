import effectManifest from "./manifest";
import { effectManifestSchema, type EffectManifest, type EffectStatus } from "./schema";

const parsed = effectManifestSchema.safeParse(effectManifest);

if (!parsed.success) {
  const detail = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "manifest"}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid Nullworx effect manifest:\n${detail}`);
}

export const effects: readonly EffectManifest[] = parsed.data;
export type { EffectManifest, EffectStatus };

export function getReleasedEffects(): EffectManifest[] {
  return effects.filter((effect) => effect.status === "RELEASED");
}

export function getLabEffects(): EffectManifest[] {
  return effects.filter((effect) => effect.status === "OWNER_REVIEW" || effect.status === "APPROVED");
}

export function getEffectBySlug(slug: string): EffectManifest | undefined {
  return effects.find((effect) => effect.slug === slug);
}

export function getReleasedEffectBySlug(slug: string): EffectManifest | undefined {
  return getReleasedEffects().find((effect) => effect.slug === slug);
}

export function getLabEffectBySlug(slug: string): EffectManifest | undefined {
  return getLabEffects().find((effect) => effect.slug === slug);
}

export function countEffectsByStatus(status: EffectStatus): number {
  return effects.filter((effect) => effect.status === status).length;
}

export function isPubliclyIndexable(effect: EffectManifest): boolean {
  return effect.status === "RELEASED";
}

export function getEffectStatusCounts() {
  return {
    total: effects.length,
    experimental: countEffectsByStatus("EXPERIMENTAL"),
    ownerReview: countEffectsByStatus("OWNER_REVIEW"),
    approved: countEffectsByStatus("APPROVED"),
    released: countEffectsByStatus("RELEASED"),
  };
}
