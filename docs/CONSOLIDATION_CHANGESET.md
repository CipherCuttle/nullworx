# Consolidation 01 — exact changeset

- Base: `feat/nullworx-v0-1-foundation` at `4884b2b`
- Branch: `feat/consolidation-01`
- Implementation commit: `5423300`
- Branch tip (includes this handoff doc): run `git rev-parse HEAD`
- Worktree: `/home/swirky/Documents/deepseek-harness/default-workspace/nullworx-consolidation-01`
- No existing PR/branch was merged. No public page was released.

## Homepage repair (G1)

| File | Change |
| --- | --- |
| `components/effects/ascii-waves-canvas.tsx` | Truthful playback state machine; polls the preserved public handle for video time, frame count, wave clock and pointer strength; WebM source selection when H.264 is unsupported; explicit blocked/reduced/hidden/offscreen/error states; real start/retry; no renderer rewrite. |
| `components/effects/ascii-waves-runtime.tsx` | Forward-ref lazy seam around the unchanged `AsciiWaves`. |
| `components/effects/ascii-waves-canvas.module.css` | Explicit z-order: poster below live canvas, then vignette/scan; poster dim only when live; hidden observation text. |
| `components/effects/home-field.tsx` | Real `LIVE / PAUSED / REDUCED / BLOCKED / FALLBACK` readout, pause/play control, blocked-autoplay Start overlay, reduced-motion note, lab-index link. |
| `components/effects/home-field.module.css` | State colours, start overlay, readable readout, fallback/reduced notes, footer links. |
| `components/effects/effect-lab-preview.tsx` / `.module.css` | Toolbar now reflects the observed phase instead of a hardcoded “live” label. |
| `components/effects/effect-page.tsx` / `.module.css` | Review banner links to the lab index. |
| `public/media/flower.webm` | CC0 VP9 derivative, 5.005 s, 960×540, 495 KiB; selected only when `canPlayType` has no H.264. |
| `public/media/credits/flower.md` | WebM provenance and hash. |

`components/effects/ascii-waves/*` (the approved renderer, shader, glyph atlas,
presets and CSS) was **not modified**. Five files remain byte-identical to the
Flower integration source (`evidence/g2/import-integrity.json`).

## Consolidated lab (G2/G3)

| Area | Files |
| --- | --- |
| Lab index | `app/lab/page.tsx`, `app/lab/lab-index.module.css` |
| Lab routes | `app/lab/{holotype,paper-mesh,motion-signal,signal-ui,composition,crt-material,pearl-caustics,terminal-rain}/page.tsx` (ASCII stays on `app/lab/[slug]`) |
| Shared shell/controls | `components/labs/lab-shell.tsx` + CSS, `controls.tsx` + CSS, `preview-chrome.module.css`, `lab-preview.tsx` + CSS (lazy loader + error boundary) |
| Previews | `components/labs/{holotype,paper-mesh,motion-signal,signal-ui,composition,crt,pearl,terminal-rain}-preview.tsx` + scoped CSS |
| Catalog | `lib/labs/types.ts`, `lib/labs/catalog.ts` (integrated + blocked admission matrix) |
| Effect metadata | `lib/labs/effects/{types,schemas,definitions,index,validate,use-prefers-reduced-motion}.ts` |
| Composition contracts | `lib/composition/*` (G3-A contracts; Zod 4 fixes; brand font) |
| Composition surfaces | `components/labs/composition/surfaces/*`, `surface-registry.ts`, `composition-lab.module.css` (renderers unchanged; imports/shell adapted) |
| Preserved sources | `experiments/holotype/` (8 files), `experiments/crt-material-lab/` (6), `experiments/pearl-caustics/` (3), `experiments/living-stencils/src/...` (4), `registry/new-york/` (6) — all byte-identical |
| Notices | `third_party/paper-shaders*/`, `third_party/motion/LICENSE.md`, `THIRD_PARTY_NOTICES.md` |
| Header | `components/site/site-header.tsx` — `prefetch={false}` to avoid aborted RSC prefetch noise during lab review |

## Dependencies and configuration

| File | Change |
| --- | --- |
| `package.json` | Pinned `@paper-design/shaders-react@0.0.82`, `motion@14.7.1`; added verify/capture/preservation scripts |
| `pnpm-lock.yaml` | Resolved new exact dependencies and transitive packages |
| `playwright.config.ts` | `E2E_PORT` / `E2E_BASE_URL` override; no behaviour change to checks |
| `tests/e2e/experience.spec.ts`, `tests/e2e/visual.spec.ts` | Base URL env override only |
| `README.md` | Consolidated routes, lab status, scripts, dependencies and blockers |
| `.gitignore` | Large local verification media excluded; receipts/screenshots retained |

## Verification tooling and evidence

| File | Purpose |
| --- | --- |
| `scripts/verify-home.mjs` | 49-check temporal homepage harness (live, pause, reduced, blocked recovery, context loss, visibility, mobile) |
| `scripts/verify-labs.mjs` | 359-check route/interaction/cross-browser/resource harness |
| `scripts/capture-media.mjs` | Before/after homepage clips and one clip per effect |
| `scripts/verify-import-integrity.mjs` | 37-file byte comparison against source roots |
| `scripts/source-preservation.mjs` | Read-only 8-root content fingerprint |
| `scripts/pixel-diff.py`, `scripts/make-contact-sheets.py` | Pixel receipts and comparison sheets |
| `evidence/g0/` | Baseline/final source fingerprints and preserved branded screenshot baseline |
| `evidence/g2/import-integrity.json` | Copied-source hashes |
| `evidence/g5/receipts/` | Committed JSON receipts (home, labs, Playwright, audit, preservation, import) |
| `evidence/g5/screenshots/` | Selected committed screenshots |
| `evidence/screenshots/` | Updated repository screenshot set from the final Playwright run |
| `evidence/g5/recordings/`, `evidence/g5/comparisons/`, `evidence/g5/frames/`, `evidence/g4/` | Large local-only motion/comparison artifacts (excluded from Git, present for handoff) |

## Removed or deliberately absent

- `public/masks/*`: unused Living Stencils assets were removed from the site because the
  full compositor is not integrated. The original assets remain in the preserved source
  worktree.
- No old UI Forge gallery, global CSS, `components/forge-gallery.*`, `experiments/living-stencils`
  stencil assets, marketplace, checkout, newsletter change or deployment config entered
  this branch.
- No original source root was written to. Final preservation: **8/8 unchanged**.

## Rollback

See [`CONSOLIDATION_ROLLBACK.md`](CONSOLIDATION_ROLLBACK.md). The branch is isolated;
no data, deployment or published artifact needs reversal.
