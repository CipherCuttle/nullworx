import type { EffectManifest } from "@/lib/effects";

export interface DraftOptions {
  siteUrl: string;
  date: string;
  allowUnreleased?: boolean;
}

export interface ReleaseDrafts {
  releaseNotes: string;
  newsletter: string;
  social: string;
  pageMetadata: string;
  sitemapEntry: string;
  checklist: string;
  manifest: {
    effectId: string;
    slug: string;
    status: EffectManifest["status"];
    generatedFor: "internal-review" | "release";
    generatedAt: string;
    canonicalUrl: string | null;
    ownerApprovalRecorded: boolean;
    distributionAuthorised: false;
  };
}

function assertDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new Error("Draft date must be a real ISO date (YYYY-MM-DD).");
  }
}

export function buildReleaseDrafts(effect: EffectManifest, options: DraftOptions): ReleaseDrafts {
  assertDate(options.date);
  if (effect.status !== "RELEASED" && !options.allowUnreleased) {
    throw new Error(
      `${effect.slug} is ${effect.status}. Public drafts require RELEASED and an explicit owner approval record. Use --review for an internal review draft.`,
    );
  }
  if (effect.status === "RELEASED" && !effect.releaseApproval) {
    throw new Error("Manifest invariant failed: RELEASED effect has no release approval record.");
  }

  const review = effect.status !== "RELEASED";
  const canonicalUrl = review ? null : `${options.siteUrl.replace(/\/$/, "")}/effects/${effect.slug}`;
  const warning = review
    ? "> **INTERNAL REVIEW DRAFT — NOT FOR DISTRIBUTION.** This effect is not released and has no public effect page or sitemap entry. Do not send, post or publish this copy."
    : "> **OWNER APPROVAL REQUIRED BEFORE DISTRIBUTION.** This file is a generated draft, not a published message.";

  const releaseNotes = `${warning}

# ${effect.name} / ${effect.subtitle}

${effect.summary}

## Status

- Manifest status: **${effect.status}**
- Release approval: ${effect.releaseApproval ? `${effect.releaseApproval.approvedBy}, ${effect.releaseApproval.approvedAt}` : "not recorded"}
- Public page: ${canonicalUrl ?? "withheld"}
- Version: ${effect.version}
- License: ${effect.license.code} code / ${effect.license.media} media

## Technical note

${effect.technicalDescription}

## Requirements

${effect.requirements.map((requirement) => `- ${requirement}`).join("\n")}

## Install

\`\`\`sh
${effect.installation.command}
\`\`\`

Download artifact: ${options.siteUrl.replace(/\/$/, "")}${effect.installation.archivePath}

## Provenance

- Source tree SHA-256: \`${effect.sourceTreeSha256}\`
- Upstream HEAD: \`${effect.provenance.upstreamHead}\`
- Source path: \`${effect.provenance.sourcePath}\`

## Media

Flower video and poster are CC0 1.0. Source: MDN sample media. The reviewed usage mutes the video; keep it muted unless the integrator provides a user-initiated audio path.

---

Generated ${options.date} by \`pnpm drafts\`. No external publication action was taken.
`;

  const newsletter = `${warning}

Subject: Nullworx Drop 001 — ${effect.name}

Preview text: ${effect.summary.slice(0, 120)}

---

${effect.name} / ${effect.subtitle}

${effect.summary}

${effect.description[0] ?? effect.summary}

It is ${review ? "still in owner review, so this section is an internal preview" : "now in the public catalogue"}.

[${review ? "Review the internal preview" : "Explore the effect"}](${canonicalUrl ?? options.siteUrl.replace(/\/$/, "")})

Licence: ${effect.license.code} code; ${effect.license.media} media.

You are receiving this because you opted in to Nullworx Drops. Unsubscribe at any time.

---

Generated ${options.date}. Not sent. Requires owner approval, a rendered email, and a separate send decision.
`;

  const social = `${warning}

# Social copy / ${effect.name}

## Short

${effect.name}, ${effect.subtitle}: ${effect.summary}

${review ? "Unreleased owner-review preview." : `${canonicalUrl}`}

## Thread opener

${effect.summary}

A small note on the technique: ${effect.technicalDescription.split(". ").slice(0, 2).join(". ")}.

${review ? "Not released yet. The internal review page is noindexed." : `Read and copy the source: ${canonicalUrl}`}

## Alt text — social preview

Still from the CC0 flower film rendered as a field of ASCII characters by Nullworx. ${effect.previewMedia.alt}

---

No post was made. Approval and scheduling remain owner actions.
`;

  const pageMetadata = `${warning}

# Page metadata draft / ${effect.name}

Title: ${effect.name}, ${effect.subtitle} — Nullworx
Description: ${effect.summary}
Canonical: ${canonicalUrl ?? "withheld until release"}
Status: ${effect.status}
Open Graph type: article
Updated: ${effect.publication.updatedAt}
${review ? "Robots: noindex, nofollow (currently served only at /lab/ascii-waves)" : "Robots: index, follow"}

Keywords for context, not stuffing: ${effect.tags.join(", ")}

Structured data: SoftwareSourceCode + BreadcrumbList on a released public page.
`;

  const sitemapEntry = review
    ? `${warning}

No sitemap entry may be created for /effects/${effect.slug} while status is ${effect.status}.
`
    : `${warning}

URL: ${canonicalUrl}
Last modified: ${effect.publication.updatedAt}
Change frequency: monthly
Priority: 0.8

Apply only after deploying the released page and verifying its 200 response.
`;

  const checklist = `${warning}

# Distribution checklist / ${effect.name}

- [ ] Owner release approval recorded in the manifest
- [ ] Status is RELEASED
- [ ] Source hashes validate
- [ ] Archive SHA-256 validates
- [ ] Licenses and media credits visible on the page
- [ ] Reduced-motion and fallback checks pass
- [ ] Desktop and mobile production smoke tests pass
- [ ] Canonical URL resolves with 200
- [ ] Page is included in the sitemap only after release
- [ ] Open Graph image inspected
- [ ] Search Console / Bing / IndexNow preparation reviewed
- [ ] Newsletter campaign rendered and manually proofread
- [ ] Separate owner send decision recorded
- [ ] No external action taken by this generator

This generator does not call GitHub, email, social networks, DNS or a deployment provider.
`;

  return {
    releaseNotes,
    newsletter,
    social,
    pageMetadata,
    sitemapEntry,
    checklist,
    manifest: {
      effectId: effect.id,
      slug: effect.slug,
      status: effect.status,
      generatedFor: review ? "internal-review" : "release",
      generatedAt: options.date,
      canonicalUrl,
      ownerApprovalRecorded: Boolean(effect.releaseApproval),
      distributionAuthorised: false,
    },
  };
}
