# G5-A browser compatibility matrix

**Status: EXPERIMENTAL / OWNER_REVIEW.** Technical checks, not visual approval.

Test date: 2026-10-29, Europe/Stockholm. Consumers are the two clean,
independent production builds at `g5a-consumers/next` (Next.js 15.5.28) and
`g5a-consumers/vite` (Vite 8.3.5), both React 19.1.10. The source is the
shadcn-installed `living-type-01` item, not the Nullworx demo.

| Engine | Version | Mode | Checks | Result | WebGL2 renderer | Notes |
| --- | --- | --- | ---: | --- | --- | --- |
| Chromium (system Chrome) | 156.0.8078.47 | full | **137/137** | PASS | ANGLE, NVIDIA RTX 4060 Laptop, OpenGL ES 3.2 | Headless ANGLE/GL; full fallback matrix |
| Firefox (Playwright) | 157.0 | full | **124/124** | PASS | WebGL2 present | 15 expected `WebGL context was lost` warnings per consumer from deliberate unmount/context-loss checks |
| WebKit (Playwright WebKitGTK) | 27.2 | full | **124/124** | PASS | WebGL2 present | No console warnings |

Both Next and Vite consumers are included in every engine count. Full mode
covers: initial render, accessibility tree, text edits, 24-character fit, rapid
text edits, rapid preset changes, pause/resume stability, OS reduced motion,
resize, mask-boundary sampling, 30-edit allocation checks, five
mount/unmount cycles, WebGL context loss and retry, console/page/request checks,
and no external requests.

Chromium additionally runs the no-WebGL2, no-CSS-mask and blocked-font
fallbacks, plus the browser's JS heap bound. Firefox/WebKit run the same product
checks but expose no `performance.memory` heap value.

## Checks that passed in every engine

- The shader mounts and the wordmark mask is ready.
- The real wordmark is present exactly once in the accessibility tree.
- Text edits change the content-addressed mask key and do not remount the
  material.
- The 24-character maximum fits without edge clipping.
- Paused and reduced-motion stills are pixel-stable.
- Resize has no horizontal overflow; the mask re-rasterises.
- The material is not visible outside eroded fully-transparent mask samples.
- No application console errors, page errors, failed requests or external
  requests.

## Fallback evidence

Chromium-only, deliberately provoked:

| Condition | Result |
| --- | --- |
| WebGL2 disabled | `static-fallback`, zero canvases, readable DOM fallback and accessible wordmark |
| CSS `mask-image` unsupported | `mask-unsupported`, zero canvases, readable fallback; no unclipped shader rectangle |
| Web font blocked (`--disable-remote-fonts`) | `font-state=fallback`, shader and mask still render with system type |
| WebGL context lost | `context-lost`, static fallback, accessible retry button; retry recovers the shader |
| 30 rapid text edits | zero new canvases, zero new WebGL contexts, one shader canvas |
| 5 mount/unmount cycles | live contexts return to 0 on unmount and 1 on remount |

## Mobile / DPR evidence

At `390x844`, `deviceScaleFactor=2`, both consumers:

- Stage CSS width **326 px**, mask raster **652x207** (2× effective DPR).
- `data-mask-engine=canvas-letter-spacing`.
- `data-font-state=loaded`.
- No horizontal overflow (`scrollWidth=390`, `innerWidth=390`).
- No console errors.

Artifacts:

- `docs/assets/g5a/consumer-mobile-dpr2-stage.png`
- `docs/g5a/evidence/browser-mobile-dpr2.json`
- Full JSON receipts: `docs/g5a/evidence/browser-{chromium,firefox,webkit}-full.json`
- Screenshot corpus under `evidence/g5a/browser/<engine>/` (local evidence).

## Runtime limits

- The headless rAF cadence values (16.7 ms Chromium, ~17.1 ms Firefox, 16.0 ms
  WebKit) are virtual-clock cadence, not GPU frame time, and do not imply a
  display refresh rate.
- WebKit here is Playwright's WebKitGTK build, not Safari on macOS/iOS.
- The font is an embedded ASCII subset; non-ASCII input is rejected by the
  recipe contract.
