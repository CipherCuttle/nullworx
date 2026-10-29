# Testing and evidence

The production-equivalent build is tested locally. The e2e suite starts `next start` on
`127.0.0.1:3300` with `NODE_ENV=production` and the in-memory mock provider. It does not
contact Brevo, send email, deploy, or collect real addresses.

## Commands

```sh
pnpm lint
pnpm typecheck
pnpm validate:effects
pnpm test
pnpm check:secrets
pnpm build
pnpm test:e2e
pnpm verify          # lint + typecheck + validate + unit + secret scan + build
```

Requirements: Node 22.12+, pnpm 12.15.0, Google Chrome (the Playwright config uses the
system `chrome` channel), and a working WebGL/SwiftShader environment for the live-field
checks. The suite is configured with SwiftShader flags for headless Chrome.

## Current verification result

At the time this foundation was packaged:

- **Unit/integrity:** 7 files, **51 tests**, all passing.
- **Playwright:** **26 tests**, all passing after the production build.
- **SEO verification:** **99/99** checks, including social-card images on every public
  route, sitemap membership and noindex states.
- **Manifest validation:** 1 schema-1.1.0 effect, `OWNER_REVIEW`, 0 released; source
  hashes, archive hash, component paths and tree digest pass.
- **Secret scan:** pass.
- **Production build:** all 17 static/dynamic routes generated; 6 public indexable routes,
  0 released effect pages.
- **Dependency audit:** `pnpm audit --prod` reported no known vulnerabilities on the review
  date.

These are local results, not a deployment or an indexation claim.

## Unit and integrity coverage

| File | What it protects |
| --- | --- |
| `tests/unit/effects.test.ts` | Schema-valid registry, release-status counts, sitemap filtering, approval invariants, duplicate rejection, exact file hashes, recomputed tree digest, component/archive existence |
| `tests/unit/archive.test.ts` | Archive digest, exact entry inventory, no caches/secrets, embedded hash agreement |
| `tests/unit/seo.test.ts` | Canonical/OG/Twitter metadata, noindex, sitemap filtering, retrieval vs training robots policy, `llms.txt`, no fabricated structured data, support URL validation |
| `tests/unit/newsletter.test.ts` | Email/consent validation, premium separation, redirect pinning, mock DOI, duplicate/pending behavior, suppression, invalid/expired tokens, idempotency, rate limit, provider failure containment, no email/IP in response |
| `tests/unit/brevo.test.ts` | DOI request shape, suppressed contact, already-confirmed preference update, auth error mapping, duplicate handling, 500 handling, redirect protection |
| `tests/unit/analytics.test.ts` | Event allowlist and rejection of email/IP fields |
| `tests/unit/publishing.test.ts` | Refusal to publish unreleased effects, warning text, release approval gate, canonical/sitemap outputs, no external send |

## Browser coverage

`tests/e2e/` uses Playwright at desktop 1440×900 and mobile 390×844.

- **Homepage:** server-rendered copy, real WebGL field, no console/page errors, owner-review
  label.
- **Lab preview:** live controls, quality/cell/speed adjustments, clipboard fidelity, copy
  config and usage, reduced motion freeze, accessible canvas label.
- **Layout:** no horizontal overflow at 390 px, mobile navigation, landmarks, one H1 per
  page, skip link, footer.
- **Accessibility:** axe-core scan on `/`, `/effects`, `/drops`, `/lab/ascii-waves`,
  `/privacy`, `/licenses`; no serious or critical WCAG A/AA violations.
- **Cookies/support:** no cookies, no invented support button when the URL is absent.
- **Drops:** two unchecked consents, free-only submission, confirmation page, mock note,
  effect-page signup, premium independence, server-side missing-consent/malformed email/
  unknown field/cross-origin rejection, duplicate/idempotency generic responses, honeypot,
  analytics allowlist.
- **SEO:** unique metadata and canonicals, server-rendered copy, noindex/status pages,
  sitemap, robots, `llms.txt`, 1200×630 PNG, structured data, 404, internal link resolution,
  media/download bytes.
- **Visual evidence:** desktop/mobile full pages, gallery, effect lab, Drops form, reduced
  motion.

The screenshots are evidence of the current build, not sign-off. No serious/critical axe
violations are a baseline, not a WCAG conformance certification.

## Screenshot inventory

Captured by the visual spec into `evidence/screenshots/`:

| Screenshot | What it shows |
| --- | --- |
| `home-desktop-1440x900.png`, `home-desktop-full.png` | Homepage above fold and full flow |
| `home-mobile-390x844.png`, `home-mobile-full.png` | Mobile homepage |
| `effects-desktop-1440x900.png`, `effects-desktop-full.png` | Gallery/prelaunch gate |
| `effects-mobile-390x844.png`, `effects-mobile-full.png` | Mobile gallery |
| `drops-desktop-1440x900.png`, `drops-desktop-full.png` | Drops page |
| `drops-signup-desktop-1440x900.png` | Actual signup form and consent choices |
| `drops-mobile-390x844.png`, `drops-mobile-full.png` | Mobile Drops |
| `ascii-waves-lab-desktop-1440x900.png`, `ascii-waves-lab-desktop-full.png` | Owner-review effect page |
| `ascii-waves-lab-field-1440x900.png` | Live field scrolled into view after the video is ready |
| `ascii-waves-lab-signup-1440x900.png` | Drops form embedded on the effect page |
| `ascii-waves-lab-mobile-390x844.png`, `ascii-waves-lab-mobile-full.png` | Mobile effect page |
| `ascii-waves-lab-reduced-motion-1440x900.png` | Reduced-motion still |

There is no released-effect screenshot because no effect is released. The lab preview is
captured instead and is clearly labelled `OWNER REVIEW`; it is not presented as a released
product.

## Source and visual baselines

The effect source files are compared byte-for-byte by hash against the reviewed integration
copy. The original source review preserved three exact A/B/C still pairs
(`exactPixelPercent: 100`) at 1440×900 DPR 1 and 390×844 DPR 2. See
`docs/SOURCE-PROVENANCE.md` for the paths and hashes.

Nullworx does not rerun the original source renderer for a new pixel diff in V0.1. The
homepage/lab add different page chrome and crops, so a page-level screenshot comparison
would not be like-for-like. The verified static facts are the source bytes, renderer tree
digest, production build, live browser rendering and reduced-motion behavior. The owner’s
visual approval remains open.

## Evidence map

```text
evidence/
  dependencies/        audit and license inventories
  drafts/              deterministic internal review drafts
  logs/                build, validation, Playwright, provenance, bundle logs
  provenance/          before/after source fingerprints
  screenshots/         capture set above
  seo/                 crawlability report
  tests/playwright-results.json
```

`pnpm build` and Playwright write/refresh their evidence. `pnpm verify:seo` writes the SEO
report. `pnpm provenance` updates the before/after comparison but never writes the source
directories.

## Known test limitations

- Chrome-only; no Firefox/WebKit/physical-phone matrix in V0.1.
- WebGL runs on a local GPU/SwiftShader; performance varies by machine.
- The visual spec produces screenshots, not perceptual diffs against historical pages.
- No real Brevo call is made. The adapter is tested against a mocked `fetch`; live DOI,
  deliverability and sender authentication remain launch gates.
- Rate limiting/idempotency are tested in-process, matching the V0.1 limitation.
- No load, penetration or cross-browser test has been run.
