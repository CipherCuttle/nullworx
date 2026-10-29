# Technology and provider research

Research date: 2026-10-29. This is a decision record, not a license opinion. Every
external repository can change after this date; re-check before upgrading or adding a
dependency. Stars were not used as a decision criterion.

## Summary

| Option | Verdict | Why |
| --- | --- | --- |
| Next.js App Router | **ADOPT** (already in use) | React effect, existing UI Forge lineage, server-rendered metadata and API routes |
| React Bits | **REFERENCE** | Useful gallery/docs patterns, but its license restricts redistribution of components; no code copied |
| Astro | **DEFER** | Credible content-first alternative; migration would add a second rendering model without removing React |
| Starlight | **DEFER** | Documentation is too small to justify a docs framework; effect pages come from the manifest |
| Listmonk | **DEFER / REJECT for V0.1** | AGPL, PostgreSQL and SMTP operational burden; recent security advisories; no need to self-host |
| Brevo | **ADOPT as V0.1 adapter target** | Hosted DOI, suppression and unsubscribe; free tier sufficient to start; provider adapter keeps exit path |
| HyperFrames | **DEFER** | Apache-2.0 and active, but a new rendering pipeline for showcase video is out of V0.1 scope |

## Framework and documentation

### Next.js App Router

- License: MIT. In use at `16.4.3`; see `package.json` and the lockfile.
- Benefit: one language/framework for server-rendered content, metadata, API handlers and
  the React effect; native static generation for the public pages.
- Integration cost: already paid; no migration.
- Maintenance risk: normal framework upgrade cadence; pin exact versions and test the
  production output before deployment.
- Alternative: Astro + React islands.
- Verdict: **ADOPT** for V0.1. The smallest coherent architecture is not two frameworks.

### Astro

- Repository: <https://github.com/withastro/astro>
- License: MIT; the repository `LICENSE` also carries notices for code originating from
  SvelteKit and Vite.
- Benefit: excellent content-first static output and a natural islands model.
- Integration cost: high for this codebase. The effect, wrappers, newsletter API and
  metadata would need to move or be wrapped; the existing UI Forge lineage is Next.
- Maintenance risk: two rendering models during migration, plus a new host/build path.
- Security note: the repository’s public advisories list several 2026 issues, including a
  critical AVIF image-optimization RCE. A migration would need to pin a patched release and
  re-test the image path; this was not the deciding factor, but it is real operational work.
- Alternative: keep Next; split a future docs surface to Astro only if measured content
  complexity justifies it.
- Verdict: **DEFER**. No comparative migration evidence justified a rewrite.

### Starlight

- Repository: <https://github.com/withastro/starlight>
- License: MIT.
- Benefit: strong accessible docs shell, search and information architecture.
- Integration cost: a second documentation site, nav duplication and another build/deploy.
- Maintenance risk: low software risk, real content-maintenance overhead.
- Alternative: the reusable manifest-driven effect page and repository Markdown.
- Verdict: **DEFER**. Revisit when there are multiple released effects and long-form API
  guides that no longer fit the product site.

### React Bits

- Repository: <https://github.com/DavidHDev/react-bits>
- License: **MIT with a Commons Clause** (<https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md>).
  The clause permits use in an application but restricts selling, sublicensing or
  redistributing the components themselves. GitHub classifies the license as
  `NOASSERTION`, so SPDX automation is not reliable here.
- Benefit: strong gallery/navigation and copyable-source documentation patterns.
- Integration cost: conceptually low, legally not appropriate for a component library
  whose product is redistributable effects.
- Maintenance risk: irrelevant while treated as a reference.
- Alternative: original interaction and documentation design.
- Verdict: **REFERENCE only**. No React Bits source, effects, branding or site copy is
  included. Their gallery organisation was studied; Nullworx's visual language and
  implementation are original.

## Newsletter infrastructure

### Brevo

- Hosted SaaS, not an open-source dependency. API docs and Node SDK:
  <https://github.com/getbrevo/brevo-node>. DOI endpoint fields include `email`,
  `includeListIds`, `redirectionUrl`, `templateId`, `attributes` and
  `contactPixelTrackingConsent`.
- Benefit: double opt-in, sender-domain authentication workflow, suppression,
  provider-managed unsubscribe, campaign editing and contact attributes without running
  infrastructure. The current free plan states up to 300 emails/day after account
  approval; paid plans exist. Verify current pricing at
  <https://www.brevo.com/pricing/> before launch.
- Integration cost: low-to-medium. Requires account approval, sender authentication
  (SPF/DKIM/DMARC), DPA review, list/template IDs and custom attributes.
- Maintenance risk: provider/vendor lock-in, deliverability and consent operations still
  need an owner. The adapter isolates API usage.
- License/terms: proprietary service; process data under Brevo's
  <https://www.brevo.com/legal/privacypolicy/> and the site's privacy record.
- Alternative: Listmonk + SMTP provider.
- Verdict: **ADOPT for V0.1**, with no live credentials. `NEWSLETTER_PROVIDER=disabled`
  remains the default and the mock is used for all tests.

### Listmonk

- Repository: <https://github.com/knadh/listmonk>. License: **AGPL-3.0**.
- Latest release at review: `v7.0.0-beta.1` (2026-10-20). It is a single Go binary but
  requires PostgreSQL and an SMTP provider; bounce handling and deliverability remain
  operator work.
- Security context: the
  <https://github.com/knadh/listmonk/security/advisories> list includes a critical 2025
  CSRF-to-XSS report, a 2026 high-severity stored XSS report, and 2026 medium
  SQL-injection and list-permission issues. Self-hosting means owning patching and
  exposure.
- Benefit: source control, no per-email vendor, direct data ownership, campaign
  management, double opt-in support.
- Integration cost: high. Server/DB backups, TLS, SMTP reputation, patching, monitoring,
  consent exports, suppression integrity and incident response.
- Maintenance risk: high for one owner at this stage; AGPL network-use obligations also
  require care if the software is modified and exposed.
- Alternative: hosted Brevo; defer self-hosting until volume/cost clearly justifies it.
- Verdict: **DEFER / REJECT for V0.1**. Open source is not a reason to self-host email.
  Real operating cost includes time, not only licensing.

### Cost comparison (planning estimate, not a quote)

| Item | Brevo Free (V0.1) | Self-hosted Listmonk |
| --- | --- | --- |
| Software | Hosted plan; 300 emails/day stated | AGPL software, free |
| Infrastructure | None beyond site | Server + PostgreSQL + backups + monitoring |
| SMTP | Included in provider flow | Separate SMTP provider/account, reputation |
| Confirmation/suppression | Provider-managed | Built/operated, including bounce processing |
| Consent records | Attributes + DOI event history | PostgreSQL records; operator must design retention |
| Maintenance | Account/domain/DPA, template upkeep | Patching, upgrades, DB, TLS, deliverability, incidents |
| V0.1 decision | Use adapter, no live credentials yet | Defer |

The free Brevo tier is enough to validate the funnel without collecting a cent from
subscribers. If the list outgrows it, cost is measurable; self-hosting can be revisited
with real volume data.

## Showcase video

### HyperFrames

- Repository: <https://github.com/heygen-com/hyperframes>. License: **Apache-2.0**.
- Active and designed to render HTML into video. It could later generate deterministic
  effect showcase clips for social/GitHub releases.
- Integration cost: new Node/browser/FFmpeg pipeline, media storage, render supervision
  and visual QA. It is not needed to prove the website or the effect.
- Maintenance risk: young project, high issue volume, fast-moving APIs. Keep it out of
  the runtime dependency graph.
- Verdict: **DEFER**. Do not add it to V0.1. Revisit when there is a released effect and
  a repeatable need for social video.

## Security and dependency notes

- No third-party effect code was copied. The only effect source is the local UI Forge
  integration, with byte hashes and a reproducible tree digest.
- Production dependency licenses were inventoried with the package manager; see
  `evidence/dependencies/`. The only notable transitive cases are LGPL in the optional
  `sharp`/libvips image path and CC-BY-4.0 data in `caniuse-lite`.
- `pnpm audit --prod` reported no known vulnerabilities on the review date. That is a
  point-in-time result, not a guarantee. The installed Next.js release is pinned and the
  lockfile is committed; security patch updates must be reviewed and re-tested.
- Public advisories show that Next.js has had frequent security releases in 2026. That is
  normal framework maintenance, not a reason to migrate casually; it does mean the owner
  must monitor advisory feeds and upgrade through the full verification gate.
- No Listmonk, React Bits, Astro, Starlight or HyperFrames package is installed.
