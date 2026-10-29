# Nullworx consolidation 01 — owner handoff

**Verdict: `CONSOLIDATED_READY_FOR_OWNER_REVIEW`.**

One branded application now owns the public release gate, the homepage and every
working experimental preview. Nine effect/composition families are integrated on
one local origin; the blocked and deferred candidates are explicit. No effect is
released, no branch was merged wholesale, no original source root changed, and no
deployment/publication/marketplace/payment/newsletter activation was performed.

- Repository: <https://github.com/CipherCuttle/nullworx>
- Base: `feat/nullworx-v0-1-foundation` at `4884b2b`
- Worktree: `feat/consolidation-01` at `034231b` in `/home/swirky/Documents/deepseek-harness/default-workspace/nullworx-consolidation-01`
- One local origin: `http://127.0.0.1:3200`
- Public catalogue: **00 released**, **01 owner-review** (ASCII Waves, unchanged)
- Lab index: `http://127.0.0.1:3200/lab` (noindex, unreleased)

---

## PLAN

1. Reconcile the two actual applications (branded Next 16 site vs UI Forge / G3-A
   Next 15 lineage) and preserve all source roots read-only.
2. Choose the branded website as the shell; do not merge the older gallery or its
   global CSS.
3. Diagnose the homepage's false-live/static behaviour around poster layering,
   video readiness, autoplay, reduced motion, visibility and context loss.
4. Import preserved renderers through isolated adapters; reuse Paper Shaders and
   Motion as exact pinned dependencies.
5. Put all previews behind one branded lab shell with preset selectors, real
   capability/source/licence/verification information and truthful errors.
6. Verify in production across Chromium, Firefox and WebKit at desktop and mobile,
   with motion clips, pixel movement, negative controls, resource accounting and a
   source-vs-integration comparison sheet.
7. Stop before G5-A monetization/export work.

## CHANGESET

The exact file list is in [`CONSOLIDATION_CHANGESET.md`](CONSOLIDATION_CHANGESET.md).
Summary:

- **Homepage repair:** `components/effects/ascii-waves-canvas.tsx` and
  `home-field.tsx` now observe actual video/renderer progress, expose a truthful
  `loading/live/paused/reduced/blocked/hidden/offscreen/error` state, offer a real
  start control for blocked autoplay, and label fallback/reduced states correctly.
  Poster/canvas layering is explicit; the renderer source is untouched.
- **WebKit media fallback:** a CC0 VP9 `public/media/flower.webm` derivative is
  selected only when H.264 is unavailable. The reviewed MP4 remains the default.
- **Preserved sources:** 37 files copied byte-identically (HoloType, CRT, Pearl,
  Terminal Rain, UI Forge primitives, third-party notices). Composition contracts
  and surfaces reused with adapter-only changes.
- **Lab shell:** `components/labs/` + `lib/labs/` + `app/lab/` provide one index,
  shared brand controls, capability/source/licence panels, lazy previews and an
  error boundary.
- **Dependencies:** `@paper-design/shaders-react@0.0.82` (Apache-2.0) and
  `motion@14.7.1` (MIT), exactly pinned; Zod 4 compatibility fixes for the copied
  composition schemas.
- **Verification tooling:** `scripts/verify-home.mjs`, `scripts/verify-labs.mjs`,
  `scripts/capture-media.mjs`, `scripts/verify-import-integrity.mjs`,
  `scripts/source-preservation.mjs`, pixel-diff/contact-sheet helpers.
- **Docs:** G0 reconciliation, inventory/admission matrix, dependency/security,
  verification receipts and this report.

## VERIFY

Production build on Next 16.4.3 / React 19.3.1:

| Gate | Result |
| --- | --- |
| `pnpm verify` (lint, typecheck, manifest, 51 unit tests, build, secrets) | **pass** |
| Existing Playwright suite | **26/26** |
| `pnpm verify:home` | **49/49** |
| `pnpm verify:labs` | **359/359** |
| Imported source integrity | **37/37** byte-identical |
| Preserved source roots | **8/8** unchanged |
| Production dependency audit | **0** vulnerabilities |

Homepage evidence: live video timeline `0.211 → 1.461 s`, renderer frames
`20 → 95`, **12.60%** of stage pixels changed over one second. Paused and reduced
motion are effectively byte-identical (0.01% / 0.00%) and never claim LIVE.
Autoplay-blocked is a stable still with a working `Start live field` path. Context
loss becomes `FALLBACK / POSTER`. Pointer eddy rises to 0.985 and settles to 0.012.

Cross-browser: Chromium (RTX 4060 via ANGLE/GL), Firefox and WebKit all reach LIVE
at 1440×900 and 390×844 on the homepage and mount all nine previews. WebKit uses the
VP9 fallback because it has no H.264. Firefox/WebKit report generic renderer strings;
only Chromium proves the RTX 4060 identity.

Resources over three client-navigation cycles: **15 WebGL contexts created, 15
released**, **0 canvases left** on the lab index, DOM nodes `404 → 424`, heap
`4.35 → 8.84 MB`.

Artifacts:

- `evidence/g4/home/home-verification.json` + screenshots
- `evidence/g4/labs/lab-verification.json` + route/stage screenshots
- `evidence/g5/recordings/` — before/after homepage and one clip per effect
- `evidence/g5/comparisons/homepage-before-after.png`
- `evidence/g5/comparisons/source-vs-integration.png`
- `evidence/g2/import-integrity.json`
- `evidence/g0/source-preservation-baseline.json` / `-final.json`
- `evidence/g5/audit-prod.json`

## HOSTILE REVIEW

| Severity | Finding | Resolution |
| --- | --- | --- |
| CRITICAL | Homepage claimed `LIVE` from `canplay`; an autoplay rejection left a static frame permanently labelled LIVE. | **Fixed.** Readiness now requires advancing video time **and** renderer frames; blocked autoplay is a labelled, recoverable Start state. |
| HIGH | Reduced motion froze the field but the page still showed `LIVE MATERIAL`. | **Fixed.** `REDUCED MOTION / STILL`, no LIVE claim, stable frame. |
| HIGH | The prefetch observer's 360px margin marked an offscreen stage as visible, producing a false `BLOCKED` state and failed readiness. | **Fixed.** Visibility is owned only by the separate observer; offscreen is labelled `PAUSED / OUT OF VIEW`. |
| HIGH | WebKit could not decode H.264, leaving the homepage at loading/poster. | **Fixed.** CC0 VP9 derivative selected only when `canPlayType` reports no H.264; renderer unchanged. |
| MEDIUM | Pause button's accessible name did not match its visible text (axe serious). | **Fixed.** Visible `Pause`/`Play` is the accessible name; full suite passes. |
| MEDIUM | Pearl component deleted GL objects but did not force context release on route unmount; contexts could accumulate. | **Fixed in the site adapter.** Explicit `WEBGL_lose_context` on preview unmount; 15/15 contexts released. |
| MEDIUM | A fixed 900ms screenshot window cannot prove CRT motion because the material is intermittent. | **Fixed test.** Verify running animations and seek deterministically to the tear phase. |
| MEDIUM | WebKit navigation produced benign `_rsc`/media cancellation noise. | **Classified separately**; header prefetch disabled to remove avoidable RSC noise. No application error is hidden. |
| MEDIUM | Firefox/WebKit return generic WebGL renderer strings. | **Documented.** Cross-browser rendering verified; only Chromium proves GPU identity. |
| MEDIUM | Full Living Stencils compositor is not integrated; only Terminal Rain is. | **Explicit blocker.** Needs the preserved FlowerMaterial wrapper and a visible CC BY 2.0 attribution surface; not claimed as done. |
| MEDIUM | Owner approval and repository licence decisions remain open. | **Documented.** Every lab route is noindex, labelled unreleased and not a registry item. |
| LOW | Source files for HoloType/CRT/Pearl/UI Forge have no licence file. | **Documented as redistribution-restricted.** No relicensing. |
| LOW | `sharp`/libvips optional LGPL package present via Next image optimization. | **Documented.** Not imported by effects; review before bundled redistribution. |
| LOW | CRT still uses intermittent scanline/tear motion by design, not continuous animation. | **Documented and tested at the correct phase.** |

No CRITICAL or HIGH finding remains open. The remaining owner decisions are aesthetic
and licensing decisions, not hidden technical failures.

## VERDICT

**`CONSOLIDATED_READY_FOR_OWNER_REVIEW`.**

The foundation is one app, one origin and one design language. The homepage is
genuinely live, the negative controls are truthful, the integrated effects are
preserved and working, the blocked candidates are explicit, and the release gate
still says `00 released`. The full Living Stencils compositor and owner licensing
remain owner decisions and are listed as such rather than quietly claimed.

Open `http://127.0.0.1:3200/lab` from the running production server and navigate
the nine previews. The public catalogue remains at `/effects` with zero releases.
Do not merge, deploy, publish or start G5-A until the owner has reviewed this
branch and recorded visual/licence decisions.
