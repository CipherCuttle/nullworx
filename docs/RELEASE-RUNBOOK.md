# Release runbook — turning an owner-review effect into a released effect

This runbook is for the owner. Do not execute it to “populate” the gallery. The current
candidate is not approved.

## 0. Preconditions

- [ ] Owner has reviewed the live effect on desktop and mobile, with reduced motion, and
      approved the art in writing.
- [ ] A durable approval record exists (issue URL, signed review note, or a file under a
      reviewed path). It is not merely a chat message that will be lost.
- [ ] Source provenance, media rights and licenses are verified.
- [ ] The effect is not encumbered by an experimental asset with unclear rights.
- [ ] Domain ownership and the canonical host are confirmed.
- [ ] Newsletter collection is either intentionally disabled or fully provisioned; do not
      accidentally enable it as part of an effect release.

If any box is open, the effect stays `OWNER_REVIEW` or `APPROVED`. Do not set `RELEASED`.

## 1. Record approval in the manifest

Edit `lib/effects/manifest.ts`:

```ts
status: "RELEASED",
publication: {
  releasedAt: "2026-10-30",     // real date
  updatedAt: "2026-10-30",
},
releaseApproval: {
  approvedBy: "CipherCuttle",
  approvedAt: "2026-10-30",
  scope: "release",
  evidence: "https://…/approval-record", // or a reviewed repository path
},
```

Keep `summary`, `technicalDescription`, hashes, requirements, accessibility and
performance caveats current. Do not alter the reviewed effect source to satisfy a
documentation desire; changes to source require a new hash and a new visual review.

## 2. Rebuild the archive

If the source or manifest has changed:

```sh
pnpm bundle:effects
sha256sum public/downloads/ascii-waves-0.1.0.zip
```

Update `installation.archiveSha256` to the new digest. The bundle is deterministic. Do not
ship local review screenshots, credentials, `.env` or caches in it.

## 3. Verify the gate

```sh
pnpm lint
pnpm typecheck
pnpm validate:effects
pnpm test
pnpm check:secrets
pnpm build
pnpm test:e2e
pnpm verify:seo
```

Required observations:

- `getReleasedEffects()` contains the effect only after approval;
- `/effects/<slug>` returns 200 and is server-rendered;
- `/lab/<slug>` may continue to exist for owner review, but the public page is the new
  canonical destination;
- `sitemap.xml` contains the effect URL only now;
- noindex is absent from the public page and present on lab/status pages;
- source hashes, archive hash and tree digest pass;
- reduced-motion and WebGL smoke pass.

## 4. Inspect the public page

- [ ] Live preview loads after intersection, not globally.
- [ ] Copyable install command and usage compile against the archive.
- [ ] Code/source links resolve.
- [ ] Framework requirements and reduced-motion behavior are visible.
- [ ] Related effects only link to other released effects.
- [ ] Newsletter form preserves the two unchecked choices.
- [ ] Support link appears only if a verified Buy Me a Coffee URL is configured.
- [ ] License and provenance show the right terms.
- [ ] Mobile layout does not overflow.
- [ ] Screenshot the new public page for evidence; do not call it approval of the design
      without owner review.

## 5. Prepare distribution drafts

```sh
pnpm drafts -- --slug=<slug> --date=YYYY-MM-DD
```

Review every generated file in `drafts/YYYY-MM-DD/<slug>/`. The generator does not send or
publish. Check:

- [ ] canonical URL is correct;
- [ ] social copy and alt text are accurate;
- [ ] newsletter subject/preheader/body have no fake claims;
- [ ] no subscriber counts, revenue, testimonials or fabricated quotes;
- [ ] sitemap entry is correct;
- [ ] GitHub release notes and license are correct.

## 6. External actions (separate owner approval)

This is outside V0.1. Only after an explicit owner instruction:

1. Deploy the verified build to the chosen host with server-only env vars.
2. Confirm the live canonical, HTTPS, redirects and 404 behavior.
3. Create the GitHub release manually.
4. Submit `sitemap.xml` to Search Console/Bing, and optionally IndexNow.
5. Render the Brevo campaign, proofread, test a seed inbox, and only then send.
6. Post social copy manually if desired.

Do not merge to `main` merely because local tests pass. Do not create paid features,
checkout or membership gates as part of this release.

## 7. Post-release verification

- [ ] Public page 200 at the canonical URL.
- [ ] Sitemap contains it.
- [ ] `robots` does not block it.
- [ ] Open Graph/social debugger sees the card and canonical.
- [ ] No release email sent without owner approval.
- [ ] Check server logs for generic provider errors, no PII.
- [ ] Record observed indexation only if and when Search Console/Bing show it.

If anything is wrong, follow `docs/ROLLBACK.md` immediately.

## Ownership

The generator, tests and screenshots cannot approve art. The owner remains accountable for
visual quality, rights, subscriber consent and external distribution.
