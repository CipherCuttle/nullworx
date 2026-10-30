import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  countEffectsByStatus,
  effects,
  getEffectStatusCounts,
  getLabEffects,
  getReleasedEffectBySlug,
  getReleasedEffects,
  isPubliclyIndexable,
} from "@/lib/effects";
import effectManifest from "@/lib/effects/manifest";
import {
  SOURCE_TREE_HASH_METHOD,
  computeEffectSourceTreeSha256,
} from "@/lib/effects/integrity";
import { effectManifestSchema, type EffectManifest } from "@/lib/effects/schema";

describe("effect registry", () => {
  it("loads one schema-valid candidate", () => {
    expect(effects).toHaveLength(1);
    expect(effects[0]?.id).toBe("nwx-ascii-waves");
    expect(effects[0]?.status).toBe("OWNER_REVIEW");
    expect(effects[0]?.schemaVersion).toBe("1.1.0");
  });

  it("keeps the public catalogue and sitemap empty until release approval", () => {
    expect(getReleasedEffects()).toEqual([]);
    expect(getReleasedEffectBySlug("ascii-waves")).toBeUndefined();
    expect(getLabEffects().map((effect) => effect.slug)).toEqual(["ascii-waves"]);
    expect(isPubliclyIndexable(effects[0]!)).toBe(false);
  });

  it("counts statuses from the manifest rather than hard-coded UI values", () => {
    expect(countEffectsByStatus("RELEASED")).toBe(0);
    expect(countEffectsByStatus("OWNER_REVIEW")).toBe(1);
    expect(getEffectStatusCounts()).toEqual({
      total: 1,
      experimental: 0,
      ownerReview: 1,
      approved: 0,
      released: 0,
    });
  });

  it("rejects RELEASED without an explicit approval record", () => {
    const releasedWithoutApproval = structuredClone(effectManifest[0]!) as EffectManifest;
    releasedWithoutApproval.status = "RELEASED";
    releasedWithoutApproval.publication.releasedAt = "2026-10-29";
    const parsed = effectManifestSchema.safeParse([releasedWithoutApproval]);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path.includes("releaseApproval"))).toBe(true);
    }
  });

  it("rejects approval records on non-released effects", () => {
    const waitingWithApproval = structuredClone(effectManifest[0]!) as EffectManifest;
    waitingWithApproval.releaseApproval = {
      approvedBy: "Owner",
      approvedAt: "2026-10-29",
      scope: "release",
      evidence: "test",
    };
    const parsed = effectManifestSchema.safeParse([waitingWithApproval]);
    expect(parsed.success).toBe(false);
  });

  it("rejects duplicate IDs and slugs", () => {
    const duplicate = structuredClone(effectManifest[0]!) as EffectManifest;
    duplicate.status = "OWNER_REVIEW";
    duplicate.releaseApproval = null;
    duplicate.publication.releasedAt = null;
    const parsed = effectManifestSchema.safeParse([effectManifest[0]!, duplicate]);
    expect(parsed.success).toBe(false);
  });

  it("hashes every declared source file exactly", async () => {
    for (const effect of effects) {
      for (const file of effect.sourceFiles) {
        const absolute = path.resolve(process.cwd(), file.path);
        const actual = createHash("sha256").update(await readFile(absolute)).digest("hex");
        expect(actual, file.path).toBe(file.sha256);
      }
    }
  });

  it("recomputes the documented component tree digest from the copied files", async () => {
    const effect = effects[0]!;
    expect(effect.sourceTreeHashMethod).toBe(SOURCE_TREE_HASH_METHOD);
    expect(await computeEffectSourceTreeSha256(process.cwd(), effect)).toBe(effect.sourceTreeSha256);
    expect(effect.sourceTreeSha256).toBe("0eeaf099c210b601664398519d92d1201506ced1c293cd802e3891958f2200a1");
  });

  it("declares a source component, preview component and review archive that exist", async () => {
    const effect = effects[0]!;
    for (const relative of [
      effect.sourceComponent,
      effect.previewComponent,
      `public${effect.installation.archivePath}`,
    ]) {
      await expect(access(path.resolve(process.cwd(), relative)), relative).resolves.toBeUndefined();
    }
    expect(effect.sourceFiles.some((file) => file.path === effect.sourceComponent)).toBe(true);
  });

  it("declares separate code and media licenses", () => {
    expect(effects[0]?.license.code).toBe("MIT");
    expect(effects[0]?.license.media).toBe("CC0 1.0");
    expect(effects[0]?.releaseApproval).toBeNull();
    expect(effects[0]?.publication.releasedAt).toBeNull();
  });
});
