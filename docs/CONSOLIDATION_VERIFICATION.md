# Consolidation 01 — verification receipts

Updated: 2026-10-31 Europe/Stockholm. Production build: `next build` on Next 16.4.3,
React 19.3.1, Zod 4.6.7. Server: `pnpm start --port 3200` on
`http://127.0.0.1:3200`.

The earlier claim of sustained WebKit LIVE playback was incorrect. At `059db3d`,
a fresh isolated baseline build reproduces **355/359** checks, with four WebKit
homepage failures. Native VP9 looping presents frames but leaves `currentTime`
at EOF; the wrapper subsequently pauses it and mislabels it as autoplay blocked.
The expanded repair remains **FAILED_VERIFICATION**, local and uncommitted.
Standalone reel checks pass 213/213 and WebKit startup stress passes 10/10, but
the integrated WebKit reference banks fail before three-cycle proof completes.
Final end-to-end and exact golden reruns are still required. Details are in
[the repair receipt](../evidence/webkit-media-loop-01/RECEIPT.md).

## Commands and results

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | pass; 386 packages |
| `pnpm lint` | pass; 0 errors, 0 warnings |
| `pnpm typecheck` | pass |
| `pnpm validate:effects` | pass; schema, source hashes, archive, uniqueness and release gate |
| `pnpm test` | pass; **51/51** unit/integrity tests |
| `pnpm build` | pass; all public and lab routes generated |
| `pnpm check:secrets` | pass; no credential patterns in source or built client assets |
| `pnpm test:e2e` | final rerun pending; historical prototype **26/26** is superseded |
| `pnpm verify:home` | pass; **49/49** G1 temporal/negative-control checks |
| `pnpm verify:labs` | **FAILED: 712/715**; original 359 pass; three integrated WebKit reference-video decoding checks fail. Original `059db3d`: **355/359** |
| `node scripts/verify-import-integrity.mjs` | pass; **37/37** copied files byte-identical |
| `pnpm preservation` | pass; **8/8** preserved roots unchanged |
| `pnpm audit --prod` | historical consolidation receipt in `evidence/g5/`; not rerun for this repair |

Raw machine receipts:

- `evidence/webkit-media-loop-01/` contains the fresh repair receipts, raw media traces, command logs and nine controlled image pairs.
- `evidence/g4/home/home-verification.json`
- `evidence/g4/labs/lab-verification.json`
- `evidence/tests/playwright-results.json`
- `evidence/g2/import-integrity.json`
- `evidence/g0/source-preservation-baseline.json` and `…-final.json`
- `evidence/g5/audit-prod.json`
- `evidence/g5/recordings/manifest.json`

## G1 — homepage temporal proof

The numeric pixel samples below are historical (2026-10-29). Fresh repair runs
cover the Jellyfish homepage; the media gate independently verifies its 1-second
opening and Flower's 2.2-second lab opening. See `evidence/webkit-media-loop-01/home.json` and `verification.json`.

Chromium 156, RTX 4060 Laptop, ANGLE/GL hardware path
(`ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2)`).

| State | Video time | Renderer frames | Pixel change over 1 s |
| --- | --- | --- | --- |
| Live | `0.211 → 1.461 s` | `20 → 95` | **12.60%** of stage pixels; bbox `[2,1,490,439]` |
| Paused | `3.754 → 3.754 s` | frozen frame | **0.01%** (threshold ≤ 0.1%) |
| Reduced motion | `0.001 → 0.001 s` | frozen frame | **0.00%** (byte-identical) |
| Autoplay blocked | `0 → 0 s` | frozen | **stable still**; no LIVE claim |
| Context lost | – | – | `FALLBACK / POSTER`; live claim false |

Additional checks: canvas paints above the poster (center hit test is `CANVAS`),
pointer strength rises to `0.985` and settles to `0.012`, hide/show pauses and
resumes, mobile 390×844 animates, and no application console/page errors occur.

The `LIVE` badge requires actual presented media progress and an advancing
renderer frame counter. A `canplay` event alone is not enough.
Blocked autoplay exposes a real `Start live field` control; a post-start stall
uses `Restart live field` and a distinct `playback-stalled` reason; reduced motion is
labelled `REDUCED MOTION / STILL`; context loss is labelled `FALLBACK / POSTER`.

Before/after homepage recordings and a contact sheet are in
`evidence/g5/recordings/` and `evidence/g5/comparisons/homepage-before-after.png`.
The before source is the clean detached foundation worktree at `4884b2b`; the
after source is this branch.

## G2/G3 — lab matrix

All 10 routes (`/lab` plus nine previews) returned HTTP 200, had exactly one H1,
shared the brand header/main/footer, had zero horizontal overflow and zero
application console/page/network errors. Every preview is noindexed and states
that no release approval is recorded. The lab index has **9** integrated links and
explicit blocked/deferred entries.

The per-effect pixel percentages and resource samples below are historical
consolidation receipts; fresh acceptance counts and raw traces are linked above.

Per-effect interaction checks passed:

- ASCII: temporal movement (**12.51%** of stage pixels), pause stability, reduced-motion state.
- HoloType: **3.05%** pixel change while animated; explicit still stable.
- Paper: **50.46%** pixel change while animating; pause stable.
- Pearl: **16.80%** pixel change; pause stable. Terminal Rain: **5.44%**; pause stable.
- CRT: deterministic tear-phase receipt **0.044%** (278 pixels in the tear band); still stable.
- HoloType: animated → explicit still; still stable; pointer/DOM material.
- Paper: WebGL 2 canvas, upstream shader animation, pause holds it.
- Motion: running pulse in Scan, stopped in Hold, replay, reduced motion removes pulse.
- Composition: presets A–D switch mask/material, B/D mount Paper canvas, A removes it,
  pause and forced reduced motion stable.
- CRT: broken preset starts CSS animations; deterministic tear-phase seek changes
  pixels; still state stable; preset switch.
- Pearl: WebGL render state, caustic animation, pause holds phase.
- Terminal Rain: stream animation, pause stable.
- Signal UI: button press counter and loading `aria-busy`.

## G4 — cross-browser and resources

Each engine ran the homepage and all nine previews at **1440×900** and
**390×844**. The original short observations did not prove continued playback.
Chromium and Firefox looped normally. WebKit could initially reach LIVE but
lost it after the first native VP9 loop; the four failures above supersede the
previous claim that all six homepage observations established sustained LIVE.

| Engine | Homepage source | Reported WebGL renderer | Result |
| --- | --- | --- | --- |
| Chromium 156 | cyclic `jellyfish.mp4` | `ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2)` | live; hardware path |
| Firefox 157 | cyclic `jellyfish.mp4` | `NVIDIA GeForce GTX 980, or similar` (Firefox generic string) | live; renderer string masked by browser |
| WebKit 27.2 | cyclic `jellyfish.webm` | `Apple GPU` (WebKit generic string) | original: clock sticks at EOF, wrapper pauses; repair gate: three actual source cycles, continuous LIVE, desktop/mobile |

This Playwright WebKit installation reports no H.264 decoder. The wrapper
probes the actual media profile and uses VP9 when necessary. Flower prefers its
lossless VP9 copy for portable MSE decoding. Supported engines receive a cyclic
MediaSource: encoded copies append onto a continuous timeline, with no seek,
play call or HTML EOF at cycle boundaries. Initial Flower playback starts at
2.2 seconds exactly once. Jellyfish is the homepage default at the owner's
request, starts at 1 second and uses a finer 8 px grid at High quality. A
separate Jellyfish source derivative lifts saturated blue for clearer glyphs.
The renderer, shader, atlas, original media and approved Flower parameters remain
unchanged. The download package remains the original Flower component.

All five existing ASCII reels (Flower, Jellyfish, Koi, Smoke, Orion) have new
cyclic derivatives under `public/media/loops/`. A cosine-eased tail/head blend
removes the source content cut; their actual last-to-first boundary uses adjacent
prepared source frames. Decoded MD5 verifies the masters. Delivery copies meet
40 dB PSNR against those masters; Flower remains lossless. The original media
files and source trees are untouched. Source credits and modifications are
listed on `/licenses` and in `public/media/credits/`.

`verify:labs` requires three real source cycles at normal speed in nine app
cases and all five reels in all three engines. Clock normalization alone cannot
pass: the gate independently hashes decoded beginning pictures, requires at
least eight presented frames/five distinct hashes after every cycle, advancing
renderer frames, continuous LIVE and no pauses/seeks at the seams. Every seam
has an unchanged 80 ms maximum changing-picture and sampling gap. It also checks one initial
seek, bounded buffering/one fetch, no retries/reloads and one unchanged WebGL
context. The command always runs all three engines; there is no engine-subset
environment bypass.

Lifecycle negatives cover Pause near the source end, native reduced-motion
emulation, real scrolling out of view, a labelled document.hidden simulation,
pause at an actual cycle boundary followed by duplicate ended events, and an
injected decoder hold. Held states do not recover automatically. A real
NotAllowedError is `autoplay-blocked`; a stopped source is `playback-stalled`.
Neither negative is accepted as successful motion. The lab also has direct
Start/Restart controls. Native OS background scheduling is outside the labelled
visibility simulation claim. Linux WPE results are not Safari/macOS/iOS claims.

The [media receipt](../evidence/webkit-media-loop-01/RECEIPT.md) records the exact
original defect, upstream research, versions, intervention and final command
receipts. [Encoding and browser evidence](../evidence/seamless-demos-2026-10-30/)
records original/output hashes, fidelity and all fifteen bare-video cases.

Resource accounting used client-side App Router navigation (no full reloads) over
three cycles of Paper → Pearl → Terminal Rain → Composition:

- WebGL contexts created: **15**; contexts lost: **15**.
- Canvas elements left on `/lab`: **0**.
- DOM nodes: `404 → 424`.
- JS heap: `4.35 MB → 8.84 MB` (bounded, no persistent growth claim beyond this run).
- Pearl's preserved component deletes its GL objects; the site adapter explicitly
  releases its context on unmount so repeated route changes do not accumulate contexts.

Benign WebKit navigation cancellations (`Load request cancelled` for an in-flight
media request and aborted `_rsc` prefetch) are recorded separately from application
errors. Header prefetch was disabled to remove the avoidable `_rsc` noise; the
media cancellation is the homepage request being superseded by navigation.

## Media receipts

`evidence/g5/recordings/` contains MP4 clips (H.264, 1440×900) for:

- `before-home-live`, `before-home-reduced-motion-static`,
  `before-home-autoplay-blocked-static`
- `after-home-live`, `after-home-reduced-motion-labelled`,
  `after-home-blocked-to-live`
- `after-lab-ascii-waves`, `after-lab-holotype`, `after-lab-paper-mesh`,
  `after-lab-motion-signal`, `after-lab-signal-ui`, `after-lab-composition-b`,
  `after-lab-crt-material`, `after-lab-pearl-caustics`,
  `after-lab-terminal-rain`

Screenshots: `evidence/g4/home/`, `evidence/g4/labs/`, `evidence/g4/smoke/`.
Contact sheets: `evidence/g5/comparisons/source-vs-integration.png` and
`homepage-before-after.png`.

## Fidelity comparison

Source evidence was compared against the integrated output for ASCII Waves,
HoloType, CRT, Pearl, G3-A composition B and Terminal Rain. The contact sheet is a
visual comparison, not an owner approval. Preserved renderer bytes are verified by
`evidence/g2/import-integrity.json`; adapted wrappers are recorded in the inventory.

## Known limits

- Firefox and WebKit expose generic WebGL renderer strings. Only Chromium proves the
  RTX 4060 renderer identity. Cross-browser rendering is verified; per-browser
  hardware acceleration is not claimed.
- The CRT material is intentionally intermittent. Its motion receipt seeks the CSS
  animations to the tear phase rather than asserting continuous frame changes.
- The full Living Stencils compositor is not integrated (CC BY 2.0 attribution
  surface and Vite-specific FlowerMaterial wrapper). Terminal Rain is integrated
  standalone.
- No owner visual approval is recorded. Experimental previews remain noindexed and unreleased.
- No public deployment, merge, publication, marketplace, checkout or newsletter
  activation was performed.

Final repair status is recorded in [final-status.json](../evidence/webkit-media-loop-01/final-status.json).
PR #6 remains DRAFT; no commit, push, merge or deployment was performed.
