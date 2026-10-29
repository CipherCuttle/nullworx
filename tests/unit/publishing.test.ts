import { describe, expect, it } from "vitest";
import { effects } from "@/lib/effects";
import { effectManifestSchema, type EffectManifest } from "@/lib/effects/schema";
import { buildReleaseDrafts } from "@/lib/publishing/drafts";

const effect = effects[0]!;
const baseOptions = { siteUrl: "https://nulllworx.site", date: "2026-10-29" };

describe("release draft pipeline", () => {
  it("refuses a public draft for an unreleased effect", () => {
    expect(() => buildReleaseDrafts(effect, baseOptions)).toThrow(/OWNER_REVIEW|RELEASED/);
  });

  it("produces clearly marked internal drafts for review", () => {
    const drafts = buildReleaseDrafts(effect, { ...baseOptions, allowUnreleased: true });
    expect(drafts.releaseNotes).toContain("INTERNAL REVIEW DRAFT — NOT FOR DISTRIBUTION");
    expect(drafts.newsletter).toContain("Not sent");
    expect(drafts.social).toContain("No post was made");
    expect(drafts.pageMetadata).toContain("Canonical: withheld until release");
    expect(drafts.sitemapEntry).toContain("No sitemap entry may be created");
    expect(drafts.manifest).toMatchObject({
      status: "OWNER_REVIEW",
      generatedFor: "internal-review",
      canonicalUrl: null,
      ownerApprovalRecorded: false,
      distributionAuthorised: false,
    });
  });

  it("builds a release draft only after an explicit approval is in the manifest", () => {
    const released = structuredClone(effect) as EffectManifest;
    released.status = "RELEASED";
    released.publication.releasedAt = "2026-10-29";
    released.releaseApproval = {
      approvedBy: "CipherCuttle",
      approvedAt: "2026-10-29",
      scope: "release",
      evidence: "test-owner-approval.pdf",
    };
    const parsed = effectManifestSchema.safeParse([released]);
    expect(parsed.success).toBe(true);

    const drafts = buildReleaseDrafts(released, baseOptions);
    expect(drafts.releaseNotes).toContain("OWNER APPROVAL REQUIRED BEFORE DISTRIBUTION");
    expect(drafts.pageMetadata).toContain("https://nulllworx.site/effects/ascii-waves");
    expect(drafts.sitemapEntry).toContain("https://nulllworx.site/effects/ascii-waves");
    expect(drafts.manifest).toMatchObject({
      generatedFor: "release",
      canonicalUrl: "https://nulllworx.site/effects/ascii-waves",
      ownerApprovalRecorded: true,
      distributionAuthorised: false,
    });
    expect(JSON.stringify(drafts)).not.toContain("automatically sent");
  });

  it("validates the draft date", () => {
    expect(() => buildReleaseDrafts(effect, { ...baseOptions, date: "not-a-date", allowUnreleased: true })).toThrow(/ISO date/);
  });
});
