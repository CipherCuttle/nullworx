# Nullworx

An experimental library of procedural visual effects for developers and creative coders.

**Status: V0.1 foundation / prelaunch.** One effect is complete enough for owner review.
No effect has been approved or released. The public catalogue is intentionally empty, the
effect detail route exists but has no released entries, and the newsletter is disabled
unless the owner configures a provider. Nothing on this branch is deployed or indexed.

- Canonical origin supplied for the build: `https://nulllworx.site` (three `l`s; confirm
  ownership before any deployment).
- Source experiments: preserved, read-only inputs under `~/DevHub/experiments/`.
- Current candidate: **ASCII Waves / Flower field** — `OWNER_REVIEW`.
- Framework: Next.js 16 App Router, React 19, TypeScript, CSS Modules.
- Newsletter: provider interface with a local mock; Brevo adapter prepared; no credentials.

> The UI Forge experiments are historical source material. This repository is a separate
> product and does not rewrite, clean or normalize those originals.

## What is here

| Area | State |
| --- | --- |
| Original homepage, catalogue gate, about, privacy, licenses | Implemented |
| Typed and versioned effect manifest with release gate | Implemented |
| ASCII Waves WebGL 2 lab preview with live controls | Implemented, `OWNER_REVIEW` |
| Reusable public effect page template | Implemented; no `RELEASED` entries yet |
| Configurable Drops signup with separate premium consent | Implemented |
| Brevo adapter and in-memory mock provider | Implemented; live collection disabled |
| Cookieless, first-party event logging | Implemented |
| Metadata, canonicals, sitemap, robots, `llms.txt`, JSON-LD | Implemented |
| Deterministic local release-draft generator | Implemented |
| Unit, build, crawlability and Playwright smoke tests | Implemented |
| Real subscriber collection, real email sends, deployment | **Not performed** |

There are no testimonials, subscriber counts, download counts, ratings, offers or
premium checkout. There is also no account system and no payment processing.

## Quick start

Requirements: Node.js `>=22.12.0`, pnpm `12.15.0`, and Google Chrome for Playwright
(the suite uses the installed `chrome` channel).

```sh
git clone https://github.com/CipherCuttle/nullworx.git
cd nullworx
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local   # optional for the default disabled newsletter mode
pnpm dev
```

Open <http://127.0.0.1:3000>. The newsletter form will return the "not open yet" state
until a provider mode is configured; that is intentional.

### Useful commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Local development server |
| `pnpm build` | Validate the manifest, then build the production app |
| `pnpm start` | Serve the production build on `127.0.0.1:3000` |
| `pnpm lint` | ESLint over the app |
| `pnpm typecheck` | TypeScript without emit |
| `pnpm test` | Vitest unit and integrity suite |
| `pnpm validate:effects` | Schema, hashes, archive, component and release-gate checks |
| `pnpm check:secrets` | Scan source and built client assets for credential patterns |
| `pnpm test:e2e` | Playwright production smoke and screenshot suite |
| `pnpm verify` | Lint + typecheck + validate + unit tests + production build + secret scan |
| `pnpm bundle:effects` | Rebuild the deterministic review archive (reviewed inputs only) |
| `pnpm drafts -- --review --slug=ascii-waves` | Generate internal release drafts |
| `pnpm provenance` | Fingerprint and compare the preserved source experiments |
| `pnpm verify:seo` | Check a running production server on port 3300 and write the SEO report |

`pnpm test:e2e` starts its own production server on `127.0.0.1:3300` with the mock
newsletter provider. It does not contact Brevo.

## Routes

Public, indexable unless noted:

| Route | Description |
| --- | --- |
| `/` | Product statement, live field, current release state, Drops |
| `/effects` | Release-gated catalogue; currently prelaunch |
| `/effects/[slug]` | Public effect page; generated only for `RELEASED` effects |
| `/drops` | Drops signup and consent explanation |
| `/about` | Origin, principles and release policy |
| `/privacy` | Data, consent, analytics and retention record |
| `/licenses` | Code, media, font and dependency terms |
| `/sitemap.xml` | Released routes plus the fixed public pages |
| `/robots.txt` | Search/retrieval allowed, model-training crawlers blocked by default |
| `/llms.txt` | Optional navigation aid; explicitly not a ranking mechanism |

Noindexed or non-public:

| Route | Why |
| --- | --- |
| `/lab/ascii-waves` | Owner-review preview; `noindex, nofollow`, excluded from sitemap |
| `/drops/confirmed` | Status page; noindex |
| `/drops/unsubscribed` | Status page; noindex |
| `/api/*` | JSON endpoints; disallowed in robots and noindexed |

The `/effects/[slug]` route uses `dynamicParams = false` and generates params from
`getReleasedEffects()`. A request for an unreleased slug returns the designed 404.

## Architecture

```text
app/                      Next.js App Router routes and API handlers
  effects/[slug]/         Public effect template (RELEASED only)
  lab/[slug]/             Unreviewed owner preview (noindex)
components/
  effects/                Preserved ASCII Waves source + page/preview shells
  newsletter/             Drops form
  site/                   Header, footer, support link
lib/
  effects/                Schema, camera-ready manifest, release filtering, integrity
  newsletter/             Provider interface, Brevo adapter, mock, service, limiter
  publishing/             Deterministic release-draft builder
  analytics/              Allowlisted event schema and client sender
emails/                   Prepared Brevo copy; never sent by this repository
scripts/                  Validation, SEO report, provenance, drafts, bundles, secrets
tests/unit/               Registry, SEO, newsletter, archive, analytics, publishing
tests/e2e/                Production build smoke, crawlability, screenshots
docs/                     Runbooks and decision records
evidence/                 Generated verification evidence (not source)
```

Why Next.js: UI Forge and the reviewed effect are already React/Next; a small effect
library does not need a second islands framework. Astro remains a credible future option
if the content surface grows enough to justify a migration. See
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/RESEARCH.md`](docs/RESEARCH.md).

The effect is isolated behind a client dynamic import and an `IntersectionObserver`.
The gallery and server-rendered pages do not eagerly execute WebGL. The source effect
lives in `components/effects/ascii-waves/` and is kept byte-identical to the reviewed
integration copy; the site wrapper lives outside that directory.

## Release gate

The typed manifest is [`lib/effects/manifest.ts`](lib/effects/manifest.ts); the schema is
[`lib/effects/schema.ts`](lib/effects/schema.ts). Statuses are:

`EXPERIMENTAL` → `OWNER_REVIEW` → `APPROVED` → `RELEASED`.

Only `RELEASED` allows a public `/effects/[slug]` page or a sitemap entry. A `RELEASED`
entry must also carry an explicit `releaseApproval` record with an approver, date, scope
and evidence, plus a release date. The current candidate is intentionally **not**
`APPROVED` or `RELEASED`: its source trail records Gate E (React extraction graduation)
as owner-only and still open.

Do not edit the manifest to `RELEASED` to make the site look populated. Use the runbook in
[`docs/RELEASE-RUNBOOK.md`](docs/RELEASE-RUNBOOK.md).

Each manifest entry carries file hashes, a reproducible non-media component-tree digest,
source repository/HEAD, license, performance caveats, accessibility behavior, preview
media, installation data and provenance notes. Invalid values fail `pnpm build`.

## Nullworx Drops

The UI asks for one address and shows two unchecked, independent choices:

1. **Nullworx Drops** (required for this list): free effects, experiments, code notes and
   occasional bonus assets.
2. **Premium marketing** (optional and off by default): future premium pack announcements,
   launch offers and promotions.

Nothing is sent without confirmation. The default provider mode is `disabled`: no address
is stored or transmitted. The local `mock` mode exists only for automated tests and manual
local inspection and is blocked in production unless `NEWSLETTER_ALLOW_MOCK=1` is
explicitly set. The real adapter uses Brevo's double opt-in endpoint and Brevo-managed
unsubscribe; the application does not send campaigns.

Never set real credentials in client-visible variables. See
[`docs/NEWSLETTER.md`](docs/NEWSLETTER.md) for provider setup, consent records, mock-flow
evidence, retention and launch gates.

## SEO and discoverability

Public content is server-rendered; each indexable page gets a unique title, description,
canonical, Open Graph and X card. `/sitemap.xml` is generated from fixed public routes plus
`RELEASED` effects. `/robots.txt` allows search/retrieval (including `OAI-SearchBot`) while
disallowing model-training bots (`GPTBot`, `Google-Extended`, `CCBot`, etc.) by default.
`llms.txt` is a plain navigation file, not a ranking claim.

See [`docs/SEO.md`](docs/SEO.md) for the verification report and the Search Console, Bing
Webmaster Tools and IndexNow runbook. Do not claim indexing until it is observed in those
tools.

## Publishing workflow

`pnpm drafts` is deterministic and local. It never calls GitHub, a mail provider, a social
network, DNS or a deployment platform. It writes release-notes, newsletter, social, page
metadata, sitemap-entry and checklist drafts under `drafts/`. Every draft is marked
internal and `distributionAuthorised: false`. Owner approval and a separate send/publish
decision remain manual.

## Environment

Copy `.env.example` to `.env.local` and change only what is needed. The public build works
with no variables. The important groups are:

- `NEXT_PUBLIC_SITE_URL` — canonical HTTPS origin, default `https://nulllworx.site`.
- `NEWSLETTER_PROVIDER` — `disabled` (default), `mock`, or `brevo`.
- `NEWSLETTER_IP_HASH_SECRET` — required for real production collection; HMAC salt for
  in-memory rate-limit keys. Raw IPs are not stored.
- `BREVO_*` — server-only provider credentials and list/template IDs.
- `NEWSLETTER_CONFIRM_REDIRECT_URL` — must be the canonical `/drops/confirmed` URL.
- `NEXT_PUBLIC_SUPPORT_URL` — optional, must be a real Buy Me a Coffee creator URL. No
  link is rendered when it is missing or invalid.
- `NEXT_PUBLIC_ANALYTICS` — set `off` to disable the client event sender.

The example file contains placeholders only. No real keys, tokens or subscriber data are
in this repository.

## Verification and evidence

Current evidence lives in `evidence/`:

- `logs/` — build, validation, dependency, screenshot and test logs.
- `provenance/` — before/after fingerprints of the preserved experiments.
- `dependencies/` — audit, license inventory and summary.
- `tests/playwright-results.json` — machine-readable Playwright result.
- `screenshots/` — desktop/mobile, gallery, lab preview, reduced motion, Drops signup.
- `seo/` — generated SEO and crawlability report.
- `drafts/` — deterministic internal review drafts.

Evidence is not proof of visual approval. Screenshots show the current build; they do not
close the owner's Gate E. The source experiment itself records the original A/B/C still
comparisons as exact; Nullworx records byte-identical effect source hashes and a
reproducible component-tree digest, not a fresh approval.

## Deployment and rollback

This branch is not deployed. Before deployment the owner must confirm the domain, choose a
host, configure secrets server-side, add a privacy mailbox, complete the Brevo DPA/domain
authentication, and approve the visual release. The site must be built and tested locally
against the production output first.

No database, migration or destructive state is involved. Rollback is therefore a branch
and deployment rollback, not data surgery. See [`docs/ROLLBACK.md`](docs/ROLLBACK.md).

## License and provenance

Site and effect code: MIT, copyright 2026 CipherCuttle. Flower video/poster: CC0 1.0 (MDN
sample media). Fonts: SIL OFL 1.1 via Fontsource. Third-party package licenses are
inventoried in `evidence/dependencies/`. The original experiments are not re-licensed by
this repository; see [`docs/SOURCE-PROVENANCE.md`](docs/SOURCE-PROVENANCE.md) and the
`/licenses` route.

## Documentation map

- [`docs/SETUP.md`](docs/SETUP.md) — local setup, env and troubleshooting
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — decision record and boundaries
- [`docs/RESEARCH.md`](docs/RESEARCH.md) — technology/provider comparison
- [`docs/SOURCE-PROVENANCE.md`](docs/SOURCE-PROVENANCE.md) — experiment inventory and hashes
- [`docs/EFFECT-REGISTRY.md`](docs/EFFECT-REGISTRY.md) — manifest and release statuses
- [`docs/SEO.md`](docs/SEO.md) — crawlability report and operator runbook
- [`docs/NEWSLETTER.md`](docs/NEWSLETTER.md) — Brevo/mock flow and consent operations
- [`docs/ANALYTICS.md`](docs/ANALYTICS.md) — event catalog and privacy
- [`docs/PUBLISHING.md`](docs/PUBLISHING.md) — deterministic drafts and approval gates
- [`docs/TESTING.md`](docs/TESTING.md) — commands, coverage and screenshot inventory
- [`docs/DEPENDENCIES.md`](docs/DEPENDENCIES.md) — runtime and tooling inventory
- [`docs/RELEASE-RUNBOOK.md`](docs/RELEASE-RUNBOOK.md) — exact owner release procedure
- [`docs/ROLLBACK.md`](docs/ROLLBACK.md) — rollback and recovery

## Known blockers before launch

1. Owner visual approval of the React extraction is still open (Gate E).
2. The three-`l` domain must be confirmed as owned and the deployment target chosen.
3. Newsletter collection has no live credentials; Brevo setup, DPA, sender authentication
   and a privacy mailbox are not complete.
4. Rate limiting and idempotency are process-local in V0.1; multi-instance deployment needs
   a shared store.
5. Search Console, Bing Webmaster Tools and IndexNow submission have not been performed.
6. No external deployment, merge, real subscriber collection or live email delivery has
   occurred.
