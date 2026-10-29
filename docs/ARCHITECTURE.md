# Architecture decision record — Nullworx V0.1

Status: accepted for the V0.1 foundation
Date: 2026-10-29
Owner: CipherCuttle
Branch: `feat/nullworx-v0-1-foundation`

## Context

Nullworx needs a public foundation that can carry preserved UI Forge effects without
pretending they are already released. The important constraints are:

- the effect is React/WebGL and already reviewed in a Next.js/React context;
- public pages need server-rendered copy, metadata, canonicals and a truthful prelaunch
  catalogue;
- the newsletter must not collect addresses by default and must keep two consent
  categories separate;
- release status is a product decision, not a build artifact;
- the original experiments must remain untouched;
- V0.1 must not add accounts, checkout, memberships, a CRM or automated marketing.

## Decisions

### ADR-001 — Use the Next.js App Router, not Astro, for V0.1

**Decision:** keep a single Next.js 16 application with static/SSG public pages, React
client islands for effects and API route handlers for newsletter/measurement.

**Reasons:** the reviewed effect is a React component using hooks and WebGL; UI Forge is a
Next application; the newsletter needs server-side secrets and a narrow HTTP surface.
Astro would add a second rendering model and an integration layer without reducing the
amount of React already required. Public content is small and fully prerenderable in
Next, so Astro's strongest advantage (a content-first static site with minimal JS) does
not outweigh the migration cost.

**Consequences:** we deliberately own Next-specific metadata, caching and hosting
choices. If the docs/content surface grows substantially, revisit Astro as a content
layer while keeping the effect package framework-agnostic.

**Alternative considered:** Astro + React islands. Rejected for V0.1 only; not rejected
on technical merit. See `docs/RESEARCH.md`.

### ADR-002 — A typed manifest is the only release authority

**Decision:** `lib/effects/manifest.ts` is a versioned, schema-validated array. Public
effect routes use `getReleasedEffects()`; sitemap generation uses the same function. A
`RELEASED` record requires a separate `releaseApproval` object and release date.

**Reasons:** a page compiling, a screenshot looking good or a branch merging is not owner
approval. Encoding the gate in data prevents accidental catalogue expansion and makes
the public surface deterministic.

**Consequences:** adding an effect is a manifest change plus a build, not a folder copy
alone. Only `RELEASED` effects are in the sitemap. The lab route is a separate, noindex
surface.

### ADR-003 — Isolate rendering at the effect boundary

**Decision:** the public/home preview wrapper uses `next/dynamic` with `ssr: false`,
loads after an `IntersectionObserver` trigger and lets the preserved effect own video,
WebGL, pointer, visibility and reduced-motion lifecycle. The reviewed effect source is
not edited.

**Reasons:** the server-rendered page must not depend on WebGL, and navigation must not
pay for a canvas that is offscreen. Preserving the source keeps provenance meaningful.

**Consequences:** the preview has a poster and loading state. There are two wrappers:
`components/effects/ascii-waves-canvas.tsx` (site integration) and
`components/effects/effect-lab-preview.tsx` (controls/documentation). The actual effect
source remains `components/effects/ascii-waves/`.

### ADR-004 — Provider adapter, Brevo first, mock for tests

**Decision:** define a narrow `NewsletterProvider` interface. Implement a local mock and
a Brevo adapter. Select the provider with `NEWSLETTER_PROVIDER`; default `disabled`.

**Reasons:** Brevo owns double opt-in, sender authentication, delivery, suppression and
unsubscribe for a low/zero starting cost. Self-hosting Listmonk would require a
PostgreSQL database, SMTP operations, deliverability work and security maintenance. The
mock allows full browser and unit tests without credentials or email delivery.

**Consequences:** the app does not send marketing email itself. The provider is the
source of delivery truth. Real collection has explicit configuration gates: server-only
credentials, a 32+ character IP-hash secret, and a canonical confirmation redirect.

### ADR-005 — First-party, cookieless event logging, no analytics vendor

**Decision:** accept only seven allowlisted event names with path, effect slug or coarse
location. Write one structured line to application logs. No cookie, local identifier,
raw email, user-agent, referrer or IP is sent.

**Reasons:** useful product signals without a consent-management burden or a third-party
tracking payload. It is also easy to disable.

**Consequences:** this is not a dashboard or a complete traffic measurement system. Host
access logs are separate and outside the application. A future durable sink would need a
privacy review and retention policy.

### ADR-006 — Deterministic drafts, manual distribution

**Decision:** `lib/publishing/drafts.ts` generates release notes, newsletter copy, social
copy, metadata, sitemap instructions and a checklist. It writes files only and marks
`distributionAuthorised: false`.

**Reasons:** content preparation should not be coupled to external accounts, and the
owner must make the publish/send decision.

**Consequences:** GitHub releases, campaigns, social posts and deployments remain manual.
No agent or webhook publishes because a manifest changed.

## Boundaries

V0.1 intentionally excludes:

- checkout, memberships, premium gating or billing;
- a customer database or CRM;
- referral programmes;
- automated mass marketing;
- a visual effect editor;
- new effect families;
- redesign of the original experiments;
- merge, deployment, real subscriber collection or live email.

## Failure modes and mitigations

| Failure | Mitigation |
| --- | --- |
| WebGL unavailable/blocks | Poster fallback, console-free error path, visible text outside canvas |
| Reduced motion | effect freezes; pointer eddy disabled |
| Newsletter disabled | API returns 503 and no address is stored |
| Brevo partial failure | generic 502, no provider payload or email in logs |
| Duplicate signup | generic acceptance; idempotency key; no subscriber-state disclosure |
| Release mistake | schema requires approval + date; sitemap/renderer share filter |
| Source drift | file hashes and tree digest fail validation |
| Secret leak | server-only variables, scan script, no client prefix for provider keys |
| Domain mistake | canonical origin centralised; confirm ownership before deploy |

## Rollback

See `docs/ROLLBACK.md`. There are no database migrations; rollback is a branch/revision
and environment rollback. Reverting a release means removing the approval, setting the
effect back to `OWNER_REVIEW`, rebuilding and redeploying.
