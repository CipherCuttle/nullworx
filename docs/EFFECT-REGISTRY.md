# Effect registry and release gate

The registry is the product's source of truth. It is not a CMS and it does not infer
status from folders, builds or screenshots.

- Schema: `lib/effects/schema.ts`, version **1.1.0**
- Manifest: `lib/effects/manifest.ts`
- Release filter: `lib/effects/index.ts`
- Integrity helper: `lib/effects/integrity.ts`
- Validator: `scripts/validate-effects.ts`

## Status model

| Status | Public route? | Sitemap? | Meaning |
| --- | --- | --- | --- |
| `EXPERIMENTAL` | No | No | An idea in motion; may change or disappear |
| `OWNER_REVIEW` | No; optional `/lab/[slug]` noindex preview | No | Build exists; owner has not approved the art |
| `APPROVED` | No | No | Art approved; release checks still pending |
| `RELEASED` | Yes, `/effects/[slug]` | Yes | Approval, date, docs, assets and checks complete |

`RELEASED` requires both:

```ts
status: "RELEASED",
publication: { releasedAt: "YYYY-MM-DD", updatedAt: "YYYY-MM-DD" },
releaseApproval: {
  approvedBy: "CipherCuttle",
  approvedAt: "YYYY-MM-DD",
  scope: "release",
  evidence: "path-or-url-to-review-record",
},
```

If either is missing, the schema or build fails. An approval record on a non-released
effect is also rejected.

## Required manifest fields

| Field | Purpose |
| --- | --- |
| `schemaVersion`, `id`, `slug`, `version` | Stable identity and versioning |
| `name`, `subtitle`, `summary`, `description` | Public and internal copy |
| `technicalDescription` | How the effect actually works |
| `categories`, `tags`, `frameworks` | Discovery and compatibility |
| `requirements` | Browser/runtime constraints |
| `sourceComponent`, `previewComponent` | Paths that must exist |
| `sourceFiles[]` | Path, SHA-256 and role for every distributed source/media file |
| `sourceTreeSha256`, `sourceTreeHashMethod` | Reproducible digest and algorithm |
| `provenance` | Repository, upstream HEAD, capture date, source path, notes, exclusions |
| `installation` | Archive path/hash, command, usage, warnings |
| `config[]` | Typed controls (range/select/toggle) and defaults |
| `performance` | Measured numbers and caveats |
| `accessibility` | Summary, notes, reduced-motion behavior |
| `license` | Code and media terms separately |
| `previewMedia` | Poster path, alt text, dimensions |
| `publication` | Release/update dates |
| `releaseApproval` | Explicit owner release record or `null` |
| `relatedSlugs` | Released related effects only |

## Current registry

| ID | Status | Released | Preview | Archive |
| --- | --- | --- | --- | --- |
| `nwx-ascii-waves` (`ascii-waves`) | `OWNER_REVIEW` | Never | `/lab/ascii-waves` (noindex) | Review bundle, not a release |

The review archive is reachable at its public path for owner evaluation, but it is marked
`X-Robots-Tag: noindex`, `/downloads/` is disallowed in `robots.txt`, and the page labels
it as a review artifact. It is not a release claim or a public catalogue entry.

Why it is not released:

- The source React extraction was left at Gate E for the owner.
- No release approval record exists.
- No public effect page, sitemap entry or newsletter campaign has been produced for it.

The homepage and `/effects` show this state rather than a fabricated catalogue.

## Build-time integrity checks

`pnpm validate:effects` fails on:

- schema errors or duplicate IDs/slugs;
- missing `sourceComponent` or `previewComponent`;
- a `sourceComponent` absent from `sourceFiles`;
- any source file missing or whose SHA-256 differs;
- a path that escapes the repository;
- a source-tree digest that does not recompute;
- an archive path outside `public/`, a missing archive, or a hash mismatch;
- unknown related slugs;
- `RELEASED` without approval/date;
- `updatedAt` before `releasedAt`.

Unit tests additionally verify the archive's entries, archive hash, embedded manifest,
component tree and public metadata contract.

## Adding a new effect

1. Build it in its own experiment namespace; do not rewrite an existing experiment.
2. Record the exact source, commit/content hashes, media rights and owner review state.
3. Copy only cleared files into `components/effects/<slug>/` and `public/media/`.
4. Add a manifest entry with `EXPERIMENTAL` or `OWNER_REVIEW`. No public page is created.
5. Add a noindex lab preview only if it is useful to review; use `getLabEffectBySlug`.
6. Add tests for source hashes, reduced motion, fallback and native controls where
   relevant.
7. Obtain explicit owner approval and review evidence.
8. Change to `RELEASED` only after approval; add `releasedAt` and the approval record.
9. Rebuild the archive, update `archiveSha256`, run the full verification and inspect the
   generated public page.
10. Follow `docs/RELEASE-RUNBOOK.md` before publishing externally.

## Adding a downloaded effect

The manifest's `installation.usage` must be copyable and compile against the archive.
`pnpm bundle:effects` uses only files listed in `sourceFiles`; it rejects a mismatched
hash and cannot include hidden local files. Rebuild the bundle whenever a source or
manifest datum changes, then update `archiveSha256` to the new archive digest.

## Related effects

Only `RELEASED` effects may appear in public related lists. `EffectPage` filters
`relatedSlugs` through `getReleasedEffectBySlug`, so a relation to an unreleased effect
cannot leak a public link.

## Do not

- Set `RELEASED` to populate the gallery.
- Use a screenshot as proof of owner approval.
- Add a public effect page for an unreleased slug.
- Include an asset whose rights are unclear.
- Serve a review archive as if it were a product release.
