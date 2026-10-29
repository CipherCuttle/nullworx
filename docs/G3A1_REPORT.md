# G3-A.1 — independent acceptance report

**Verdict: `READY_FOR_OWNER_VISUAL_DECISION`.**

Repository: <https://github.com/CipherCuttle/nullworx>
Branch: `feat/g3a-composition-proof`
HEAD: `e5e4119e791e7815b8b6e8efe4439b123fc61225` (matches the expected HEAD)
Draft PR: #3 (draft, unmerged, not published)
Date: 2026-10-29, Europe/Stockholm
Scope: verification and targeted repair. No merge, deploy, publish, new rendering
library, or change to the original UI Forge experiments.

This report records technical acceptance. It does not grant visual approval.
The owner-facing comparison sheet is marked **NOT OWNER-APPROVED** and no
`OWNER_APPROVED` state is set anywhere in the code or evidence.

---

## PLAN

### Pre-flight

| Check | Result |
| --- | --- |
| Branch | `feat/g3a-composition-proof` |
| HEAD | `e5e4119e791e7815b8b6e8efe4439b123fc61225` — exact match |
| Worktree | Clean before work; no stash; two registered worktrees (`feat/forge-foundation-g2` at `07f91b5`, G3-A at `e5e4119`) |
| G3-A evidence | 198 files hashed and archived to `evidence/g3a1/baseline-r0/` before any change |
| Governing docs | `docs/G3A_COMPOSITION.md` and `docs/G21_SECURITY.md` read |
| Compositions | A–D present, mounted from the same `MaskDefinition` data |
| Harness | 149 browser checks + 26 structural checks present and runnable |
| Browsers | Chrome 156, Playwright Firefox 157, Playwright WebKit 27.2, system Firefox 158 snap (not used by Playwright) |
| GPU | NVIDIA RTX 4060 Laptop, driver 595.99.02, no `/dev/dri` restrictions |

No reconciliation was needed: the branch HEAD was exactly the expected commit and
the worktree was clean. The baseline was preserved rather than overwritten.

### Gate plan

1. **Gate A** — force hardware acceleration, prove the renderer string, run the
   existing 149 checks, then extend captures to all four presets at desktop and
   mobile, animated/paused/reduced, with pointer, frame-time, resource and
   context-lifecycle receipts.
2. **Gate B** — same production build and fixtures in Chromium, Firefox and
   WebKit; verify CSS mask alpha, font/mask alignment, reduced motion, WebGL2,
   responsive layout, resize, mount/unmount and console errors; prove the
   explicit no-WebGL2 fallback by disabling WebGL.
3. **Gate C** — one comparison sheet, individual 2× stills, motion clips,
   desktop/mobile comparisons, edge crops on dark and light surfaces, and a
   before/after receipt for the one targeted fix.
4. **Gate D** — inspect the ten portability questions and register risks for G5.
   No G5 implementation.
5. **Gate E** — hostile review, bounded fixes only where a current acceptance
   check fails, one re-review, verdict.

### Non-goals

No G5 studio, no export pipeline, no payment/marketplace, no new shader library,
no UI Forge experiment edits, no merge or publication.

---

## CHANGESET

### Modified

| File | Change | Why |
| --- | --- | --- |
| `scripts/verify-composition.mjs` | +25 / −4 lines: classify the WebGL renderer as `hardware`, `software` or `unknown`; emit `hardware-webgl` instead of the unconditional `software-or-unknown-webgl` finding; record `launch` provenance and `rendererClass` in `performance.json` | The harness called every renderer software, including the verified RTX 4060. That made the evidence receipt contradict the measured renderer string. |

No check definition, threshold or assertion changed. The 149 checks are the same
149 checks.

### Added

| File | Purpose |
| --- | --- |
| `scripts/g3a1/chrome-gpu.sh` | Launches system Chrome with `--use-gl=angle --use-angle=gl --ignore-gpu-blocklist`; passed through `CHROME_PATH` so the harness launch code stays honest. |
| `scripts/g3a1/probe-gpu.mjs` | Enumerates renderer strings for six launch modes (headless default, ANGLE/GL, ANGLE/Vulkan, `--enable-gpu`, headed default, headed ANGLE/GL). |
| `scripts/g3a1/verify-crossbrowser.mjs` | 62-check Chromium/Firefox/WebKit matrix against the same production build. |
| `scripts/g3a1/verify-fallback.mjs` | 20-check no-WebGL2 fallback test in Chromium and Firefox. |
| `scripts/g3a1/capture-motion.mjs` | 2× stills, edge crops, screenshot-sequence motion clips, frame distributions, lifecycle, heap/DOM receipts. |
| `scripts/g3a1/capture-video.mjs` | 25 fps screencast clips and host GPU utilisation sampling. |
| `scripts/g3a1/pause-probe.mjs` | Proves pause freezes the Paper shader instead of resetting it. |
| `scripts/g3a1/probe-canvas.mjs` | Measures the shader backing store against CSS size and DPR. |
| `scripts/g3a1/probe-headed.mjs` | Measures renderer and rAF pacing in a headed window on `DISPLAY=:0` (the owner's 143 Hz display). |
| `scripts/g3a1/capture-reduced.mjs` | Reduced-motion stills for all four presets. |
| `scripts/g3a1/make-sheets.py` | Builds the comparison, edge and browser sheets with PIL. |
| `docs/G3A1_REPORT.md` | This report. |

### Unchanged

No change to `app/`, `components/`, `lib/`, `experiments/`, `registry/`,
`fixtures/`, `third_party/`, `package.json`, `pnpm-lock.yaml`,
`pnpm-workspace.yaml` or the two governing docs. The original UI Forge
experiments are byte-identical.

### Evidence

All G3-A.1 evidence is under `evidence/g3a1/` (gitignored, as in G3-A):
`SUMMARY.json`, `gpu/`, `gpu-baseline/`, `gpu-final/`, `cross-browser/`,
`no-webgl2/`, `review/`, `logs/`, `baseline-r0/`.

---

## VERIFY

### Gate A — real GPU

#### Renderer identification

The harness previously ran headless Chrome with no GPU flags. On this host that
selects **SwiftShader**, which is why the G3-A report said software WebGL. The
renderer probe shows that the backend is a launch decision, not a property of the
composition:

| Launch mode | `UNMASKED_RENDERER_WEBGL` | Backend |
| --- | --- | --- |
| headless, no GPU flags | `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)` | software |
| headless + `--use-gl=angle --use-angle=gl` | `ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2)` | **hardware** |
| headless + `--use-angle=vulkan` | `ANGLE (NVIDIA, Vulkan 1.4.329 (NVIDIA RTX 4060 Laptop GPU), NVIDIA)` | **hardware** |
| headless + `--enable-gpu --ignore-gpu-blocklist` | `ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2)` | **hardware** |
| headed (X11 `DISPLAY=:0`), default | `ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2)` | **hardware** |
| headed + ANGLE/GL | same NVIDIA string | **hardware** |

The acceptance run used **headless + ANGLE/GL** for determinism. The launch
wrapper is recorded in `evidence/g3a1/gpu-final/performance.json#launch`, and the
renderer is recorded in every run. SwiftShader was **not** silently substituted:
the software row above is the unmodified default, and it is not the row used for
the Gate A receipts.

Host truth:

- GPU: NVIDIA GeForce RTX 4060 Laptop GPU (AD107M), 8188 MiB.
- Driver: NVIDIA 595.99.02, CUDA 13.2.
- `glxinfo`: OpenGL 4.6.0 NVIDIA 595.99.02, direct rendering, NVIDIA renderer.
- Chrome: Google Chrome 156.0.8078.47, `HeadlessChrome/156.0.0.0`.
- Display: Wayland session with X11 `DISPLAY=:0`; headless capture used ANGLE/GL.

#### Existing 149-check harness

`pnpm verify:composition` against the production build, 1440×900 and 390×844,
reduced motion on/off, paused/animated, 20 preset switches, 5 unmount cycles,
resize 1440→1024→390→1440:

**149/149 passed, 0 failed**, 85.5 s, 0 application console errors, 0 page
errors, 0 failed requests, 0 external requests, 0 horizontal overflow.

The only finding emitted is the truthful one:

> `hardware-webgl` — WebGL renderer reported as ANGLE (NVIDIA Corporation, NVIDIA
> GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2); WebGL 2.0 (OpenGL ES
> 3.0 Chromium). Hardware acceleration was selected by the launch configuration,
> not substituted.

#### Boundary evidence (paused, composited pixels vs canonical mask alpha)

| Preset | Inside samples visible | Mean inside Δ | Outside violations | Max outside Δ | Mask / content Y bbox |
| --- | ---: | ---: | ---: | ---: | --- |
| A moth × HoloType | 95.6% | 157.6 | 0 | 4 | 0.039–0.853 / 0.042–0.854 |
| B moth × Paper | 100% | 233.0 | 0 | 0 | 0.039–0.853 / 0.042–0.850 |
| C wordmark × HoloType | 100% | 114.7 | 0 | 2 | 0.189–0.800 / 0.203–0.797 |
| D wordmark × Paper | 100% | 172.7 | 0 | 0 | 0.189–0.800 / 0.203–0.797 |
| mobile B | 100% | 232.9 | 0 | 0 | identical |
| mobile D | 100% | 172.7 | 0 | 0 | identical |
| post-resize mobile D | 100% | 172.8 | 0 | 0 | identical |

The non-zero HoloType outside deltas (4/255 for A, 2/255 for C) are the material's
native depth/edge treatment, below the documented 9/255 tolerance. They are not
material outside the silhouette. The Paper mask is exact (0/255).

#### Frame-time distributions — headless (virtual 60 Hz)

Eighteen distributions were sampled: four presets × desktop/mobile ×
animated/paused, plus four reduced-motion states. Every headless distribution has
**median 16.7 ms, p95 16.7–16.8 ms, p99 16.8 ms, max 16.8 ms, 0 frames >33 ms,
0 frames >50 ms, 0 frames >100 ms**.

**This is rAF cadence, not GPU frame time.** Headless Chrome does not present to
a display, so this is not a display-latency or compositor-cost measurement. It
shows that the main thread was not blocked and that the page's virtual clock held
60 Hz on this host. It is **not** a universal 60 fps claim.

| Preset | Desktop animated | Desktop paused | Mobile animated | Reduced |
| --- | --- | --- | --- | --- |
| A HoloType | 16.7 ms median, 0 long | 16.7, 0 | 16.7, 0 | 16.7, 0 |
| B Paper | 16.7, 0 | 16.7, 0 | 16.7, 0 | 16.7, 0 |
| C HoloType | 16.7, 0 | 16.7, 0 | 16.7, 0 | 16.7, 0 |
| D Paper | 16.7, 0 | 16.7, 0 | 16.7, 0 | 16.7, 0 |

The 149-check harness independently measured 60.0 fps median for HoloType and
Paper with 0 frames >50 ms in both, on the same headless clock.

#### Frame-time distributions — headed, on the owner's display

A headed Chrome window on `DISPLAY=:0` (XWayland, `visibilityState: visible`,
1440×900 DPR1) reports the same RTX 4060 renderer and targets a **143 Hz display**
(7.0 ms median). Six-second samples per preset:

| Preset | Samples / 6 s | Average fps | Median | p95 | p99 | Max | >33 ms | >50 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A HoloType | 798 | 133.0 | 7.0 | 8.6 | 30.4 | 39.9 | 4 (0.5%) | 0 |
| B Paper | 476 | 79.3 | 7.0 | 34.6 | 44.7 | 58.9 | 29 (6.1%) | 2 |
| C HoloType | 819 | 136.5 | 7.0 | 7.9 | 16.7 | 42.9 | 3 (0.4%) | 0 |
| D Paper | 721 | 120.2 | 7.0 | 16.7 | 34.8 | 55.4 | 11 (1.5%) | 2 |

This is the important performance result, and it is not visible in the headless
60 Hz numbers:

- On the real 143 Hz display, **HoloType (A/C) sustains 133–137 fps** with p95
  under 9 ms and zero frames over 50 ms.
- **Paper B averages 79 fps** with p95 34.6 ms; 6.1% of frames exceed 33 ms and
  2 exceed 50 ms (max 58.9 ms). It does not hold the display cadence.
- **Paper D averages 120 fps** with p95 16.7 ms, but 1.5% of frames exceed 33 ms
  and 2 exceed 50 ms (max 55.4 ms).
- The earlier 3-second headed probe caught a single 111 ms stall in B that did
  not repeat in the 6-second sample. Stalls are intermittent, not eliminated.

The material is therefore the frame-pacing variable, not the mask. A 60 Hz
customer display would hide most of this; the owner's 143 Hz display does not.
No application console warning accompanies the drops.

#### Capture cadence vs browser display cadence

Recorded separately, as requested:

| Clip | Requested | Effective screenshot capture | Display rAF during capture (headless 60 Hz clock) |
| --- | --- | ---: | --- |
| A | 10 fps | 4.73 fps (median interval 211 ms) | n/a — HoloType animates in CSS, no rAF loop |
| B | 10 fps | 7.82 fps (130 ms) | 16.6 ms median, 16.8 p95, 17.2 max |
| C | 10 fps | 8.59 fps (116 ms) | n/a — CSS animation |
| D | 10 fps | 9.98 fps (99 ms) | 16.6 ms median, 17.0 p95, 18.3 max |
| A pointer | 10 fps | 4.55 fps (218 ms) | n/a — CSS animation |

The screenshot loop is slower than the render loop because each element
screenshot serialises a 1476×962 frame. The smooth clips are separate 25 fps
screencast recordings: 168/178/170/180 frames over 6.72/7.12/6.80/7.20 s. Both
sets are evidence of real motion; neither is a 60 fps video claim.

#### Resource use and lifecycle

| Measure | Result |
| --- | --- |
| GPU utilisation (host, 250 ms sampling) | median 16%, p95 33%, max 59% |
| GPU power / temperature | 7.19–21.11 W / 54–59 °C |
| GPU memory used (host total) | 1016–1219 MiB |
| WebGL contexts over 10 B↔D mask switches | created 25 → 25, lost 24, live 1, same canvas `true` |
| Unmount (client navigation to `/`) | created 25, lost 25, live 0, canvases 0 |
| Remount | created 27, lost 26, live 1, canvases 1 |
| Contexts over 20 preset switches | created 47, lost 46, live 1 at the end |
| Max simultaneous live contexts | 1 |
| Heap, five 4-preset cycles (harness) | −281,080 bytes |
| Heap, five 4-preset cycles (capture) | +515,632 bytes |
| DOM nodes after 20 switches | 217 → 220 |
| Composition bundle | 540,883 bytes (493,731 JS + 47,152 CSS) |
| vs `/labs/effects` | +86,124 bytes |
| vs `/` | +99,021 bytes |

Each Paper mount creates two contexts: the WebGL2 capability probe and the real
shader canvas. The probe is explicitly lost with `WEBGL_lose_context`, which is
why `created` is always one more than `lost` while one shader context remains
live. The mask-only switch keeps the same canvas and adds no context.

#### GPU utilisation caveat

`nvidia-smi` reports host-level utilisation, including desktop compositing and
other processes. It is not attributable solely to the composition. The low
median (16%) is consistent with a 738×480 stage on a laptop RTX 4060, not with a
GPU-bound workload.

---

### Gate B — cross-browser

Same production build, same four fixtures, three engines, 62 checks each:

| Check | Chromium 156.0.8078.47 | Firefox 157.0 | WebKit 27.2 |
| --- | --- | --- | --- |
| WebGL2 | yes | yes | yes |
| Reported renderer | `ANGLE (NVIDIA … RTX 4060 … OpenGL ES 3.2)` | `NVIDIA GeForce GTX 980, or similar` (masked) | `Apple GPU` (masked) |
| `CSS.supports("mask-image", …)` | true | true | true |
| `CSS.supports("mask-mode", "alpha")` | true | true | true |
| Computed mask on mounted Paper | `mask-mode: alpha; mask-size: contain; repeat: no-repeat; position: 50% 50%` | identical | identical |
| Geist resolves and loads | true | true | true |
| Text-mask vs content Y delta | 1.59% | 0.54% | 0.54% |
| Text-mask X delta | 0.53% | 0.20% | 0.32% |
| Pointer response (A) | pass | pass | pass |
| Reduced motion (media query, REDUCED, speed 0, no rAF) | pass | pass | pass |
| Responsive 390×844, no overflow | pass | pass | pass |
| Resize 1440→1024→390→1440 | pass | pass | pass |
| Mount/unmount, no leaked context | pass | pass | pass |
| Console/page/request errors | 0 | 0 | 0 |
| **Checks** | **62/62** | **62/62** | **62/62** |

Font probe: all three report `document.fonts.check('600 100px "Geist"')` true,
`--font-geist-sans` resolving to `"Geist","Geist Fallback"`, and the capability
panel reporting `Geist variable · loaded · weight 600`.

#### Explicit no-WebGL2 fallback

Run with WebGL actually disabled (`--disable-webgl --disable-webgl2
--disable-3d-apis --use-gl=disabled` in Chromium; `webgl.disabled=true` in
Firefox):

**20/20 checks passed.** For B and D: the explicit fallback is shown, no canvas
is mounted, no `data-paper-shader` gradient substitute appears, the canonical
mask is still present, the stage is still present, and HoloType A/C still render.
No console or page errors. Screenshots:
`evidence/g3a1/no-webgl2/screenshots/`.

#### Browser caveats — read before quoting

- **WebKit is the Playwright WebKitGTK/WPE build 27.2, not Safari on macOS or
  iOS.** `Apple GPU` is a masked WebKit renderer string, not evidence of Apple
  hardware. This pass does not claim Safari compatibility.
- **Firefox is the Playwright build 157.0, not the system Firefox 158 snap.**
  `NVIDIA GeForce GTX 980, or similar` is Firefox's generic masked string; it is
  not the installed RTX 4060 and it is not evidence of Firefox's GPU backend.
- Only Chromium's renderer string is trustworthy as GPU identification. Firefox
  and WebKit results establish **functional** compatibility, not GPU truth.
- No stock Safari, iOS Safari, Edge, or Chromium-on-Android was tested.
- No browser without CSS mask support was tested; all current engines support it.

Browser sheet: `evidence/g3a1/review/BROWSER_SHEET.png`.
Per-engine JSON: `evidence/g3a1/cross-browser/<engine>/results.json`.

---

### Gate C — visual review package

| Artefact | Path | Contents |
| --- | --- | --- |
| Comparison sheet | `evidence/g3a1/review/COMPARISON_SHEET.png` | All four compositions, desktop + mobile, mask/boundary facts, method notes |
| Edge sheet | `evidence/g3a1/review/EDGE_SHEET.png` | 96×96 CSS px edge crops at DPR2 on the dark stage and an evidence-only light surface |
| Browser sheet | `evidence/g3a1/review/BROWSER_SHEET.png` | B and D in Chromium / Firefox / WebKit with 62/62 receipts |
| Individual stills | `evidence/g3a1/gpu/stills/` | A–D at 1440×900 @2× and 390×844 @2× (1476×962 and 688×450 / 688×140) |
| Motion clips | `evidence/g3a1/gpu/motion-video/` | 25 fps H.264, 1476 px wide, 6.7–7.2 s |
| Frame sequences + timing | `evidence/g3a1/gpu/motion/<clip>/` | 36 PNG frames + `timing.json` per clip; capture and display cadence separated |
| Reduced-motion stills | `evidence/g3a1/gpu/stills/reduced-motion-{a..d}.png` | All four presets, `effectiveState: REDUCED`; Paper `speed: 0`; HoloType `animated: false` |
| Fallback screenshots | `evidence/g3a1/no-webgl2/screenshots/` | A still works; B/D show the explicit fallback |
| Before/after | `evidence/g3a1/before-after-harness.json` | The one targeted fix, before and after |

#### Technical observations (measured)

- Mask edges are exact for Paper B/D: 0/255 outside delta, inside coverage 100%.
- HoloType A/C have a native edge/depth halo: 4/255 and 2/255 maximum outside
  delta on the dark stage, both under the 9/255 tolerance. On the evidence-only
  light surface the halo is visibly grey (see the edge sheet).
- The Paper shader backing store on the moth stage is **738×480 at DPR2** while
  the text mask source is **2400×480**. The material is rendered at 1× CSS resolution and
  scaled on hi-DPI displays; the mask edge is not. On the 2× stills, Paper
  interiors are softer than their mask edges.
- HoloType's wordmark shows a strong diagonal hatch/grain pattern at 2×. It is
  part of the native material, not the composition seam.
- Text mask alignment is within 1.59% of stage height in Chromium and 0.54% in
  Firefox/WebKit. The residual is threshold/edge measurement plus the DOM line
  box, not visible clipping.
- Pause freezes the Paper shader: two paused captures 1.2 s apart differ by
  0/255; the live-to-paused delta is 0.48/255; a new pause after 2 s of resumed
  motion differs by 8.54/255, i.e. time advanced while running. Pause is a
  freeze, not a reset.

#### Subjective observations (not measurements, not approval)

- A (moth × HoloType) is the strongest preset: the foil reads as a material and
  the moth silhouette is immediately legible. It is still a proof silhouette,
  not a brand asset.
- B (moth × Paper) is vivid but reads as a gradient-filled clip-art moth; it
  demonstrates the CSS-mask seam more than a distinct visual idea.
- C (wordmark × HoloType) is legible and material-rich; the hatch pattern is
  prominent and may not survive scaling or print.
- D (wordmark × Paper) is the weakest visually: a soft purple gradient inside a
  sharp wordmark has little internal contrast, and the 5:1 stage gives the
  material little vertical room.
- The four presets demonstrate the seam. They are not yet four independently
  valuable visual primitives.

#### Before/after for targeted fixes

There was **no visual product fix** in G3-A.1: no current acceptance check
required one. The only targeted fix was in the evidence harness. Before, it said
`software-or-unknown-webgl` while the measured renderer was the RTX 4060. After,
it says `hardware-webgl`, records `rendererClass: hardware`, and records the
launch wrapper. The 149 checks and thresholds are unchanged; the re-run is
149/149.

---

### Gate D — portability risk register

No G5 work was implemented. The register is the deliverable.

| # | Risk | Severity | Evidence | G5-A action |
| --- | --- | --- | --- | --- |
| 1 | Mask cache is keyed only by mask id | **High** | `lib/composition/use-mask-image.ts:12–13, 37–38, 67` compares `entry.maskId === mask.id`; version and geometry are not in the key | Key on `id + version + geometry hash`, or require immutable definitions with new ids |
| 2 | Geometry change under the same id | **High** | The effect depends on object identity (`:65`), but the render guard is id-only (`:67`). A new object with the same id returns the previous image for at least one render; in-place mutation never re-runs the effect | Same fix as #1; add a regression test that mutates geometry under a fixed id |
| 3 | Font consistency across browsers and machines | Medium | Geist loads in all three engines; text mask alignment 0.54–1.59%; `resolvePageFont` reports `loaded` and falls back explicitly | Vendor the font file with the composition; pin weight/tracking; keep the canvas/DOM metric pairing |
| 4 | React consumer dependencies | **High** | 19 `@/` alias imports; `materials.ts` pulls `@/lib/effects`; surfaces pull `@/experiments/holotype` and `@paper-design/shaders-react`; no package `exports`/`main`/`files` | Publish one package entry with relative imports; document peer deps (`react`, `react-dom`, `@paper-design/shaders-react`) |
| 5 | CSS Module portability | Medium | Surfaces import `../composition-lab.module.css` (three importers); stage/material classes and `--stage-bg` live in the lab module | Extract a surface-scoped CSS module or CSS variables; do not ship the lab sheet |
| 6 | Paper Shaders dependency and NOTICE | Low (compliant) | `@paper-design/shaders-react@0.0.82`, Apache-2.0; `third_party/paper-shaders/{LICENSE,NOTICE}` byte-match the installed package | Ship the NOTICE and LICENSE with the customer package; keep the exact version pinned |
| 7 | Shader paused or remounted | Low | Pause freezes at 0/255; remount creates a new context and resets phase; no leak on unmount | Document that remount is a new time origin; expose an explicit still-frame API if customers need reproducibility |
| 8 | Text/SVG alpha edge fidelity | Medium | Paper mask is 2× text PNG (2400×480) and crisp; shader backing is 1× at DPR2 (738×480); HoloType has a light-surface halo | Decide DPR policy in G5-A (`minPixelRatio`), and restrict HoloType to dark surfaces or disable its depth treatment |
| 9 | Apparent export target is metadata | **High** | `EXPORT_TARGETS` includes `png-sequence` and `webm` (`lib/effects/types.ts:23–28`); the effect lab prints `exportTargets` (`components/labs/effect-lab.tsx:159`); no exporter exists. `exportCapability` is a string only | Remove unimplemented targets from the type or gate them behind an explicit "planned" status; never show `png-sequence`/`webm` as available |
| 10 | Recipe serialization and deterministic replay | **High** | Recipes are static TS objects validated by zod; no seed, time origin, pointer state, font asset or mask hash is captured; shader time is wall-clock | Define a serialisable recipe v2 with seed, fixed time origin, mask geometry hash, font asset id, material version, paused frame |
| 11 | Accessibility of canvas-only content | **High for G5** | Paper surface has no role/accessible name; D's wordmark exists only as canvas pixels; A/B/D have no text alternative | Add a labelled `role="img"` (or real text alternative) to the composition surface; include a11y checks in G5-A |
| 12 | Moth provenance hash | Low | `lib/composition/masks.ts:73` sets `sourceSha256: undefined` | Hash the mask geometry/source at build time and require it in the manifest |
| 13 | Moth is proof-grade | Medium | Visual review; original primitive geometry, no brand licence | Commission/authorise a brand-grade mask before customer use |
| 14 | HoloType licence | **Blocker for A/C** | `REVIEW_PENDING`, `LicenseRef-Proprietary`, redistribution restricted, no licence file | Do not ship A/C until the owner assigns a licence and approves the material |
| 15 | `capabilities.interactive` overclaim | Low | `paperMeshEffect.capabilities.interactive: true`; Paper surface wires no pointer handler; effect lab prints `interactive` | Correct the capability or implement pointer interaction in G5-A |

---

### Gate E — hostile review

#### Are the four compositions valuable visual primitives?

Honest answer: **the seam is valuable; the four presets are mechanism proofs,
not yet four product-grade primitives.**

The reusable idea is real: one `MaskDefinition` drives a native-geometry material
and a CSS-alpha-masked WebGL material, the material stays mounted when only the
mask changes, and the only unsupported pair is rejected before mount. That is a
genuine architectural result, verified at the pixel boundary and across three
engines.

The visual result is narrower. A and C show a material; B and D show a gradient
inside a shape. D in particular has little internal contrast. The moth is a
credible silhouette but not a brand asset. The wordmark is the strongest
commercial hook because it is actual brand text, but D undersells it.

#### Technical strengths

1. One mask contract, two mechanisms, no per-combination renderer branch.
2. 149/149 browser checks and 26/26 structural checks, now on real GPU.
3. 62/62 in Chromium, Firefox and WebKit, including CSS `mask-mode: alpha`,
   computed mask style, font loading, reduced motion, resize, mount/unmount.
4. Explicit no-WebGL2 fallback: 20/20, with no substitute effect and no canvas.
5. Pixel-boundary evidence is material-colour-independent (hide-surface method).
6. Context lifecycle is bounded: max one live context, same canvas on mask-only
   switch, zero live after unmount.
7. Pause freezes the shader; reduced motion stops rAF; no console/page errors.
8. No external requests; masks are generated locally.
9. Paper licence and NOTICE are compliant and byte-verified.

#### Visual deficiencies

1. Moth is proof-grade clip-art, not a brand primitive.
2. B/D read as gradient-in-a-shape; the material does not add structure.
3. C's hatch/grain is heavy and may alias at other scales.
4. D has low internal contrast at 5:1 and little vertical room.
5. HoloType has a visible grey halo on light surfaces; it is dark-surface-only
   in practice.
6. Paper renders at 1× CSS on a DPR2 display while the mask is 2×; interiors are
   softer than edges.
7. The four presets all use the same near-black stage, so the comparison is
   consistent but does not show the materials on light or branded surfaces.

#### Browser incompatibilities

None found in the tested set. The unknowns are material:

- WebKit is WebKitGTK/WPE, not Safari. Safari's `-webkit-mask` and font
  rasterisation are unverified.
- Firefox is the Playwright build, not stock Firefox.
- No iOS/Android browser, no Edge, no browser without CSS masks.
- Firefox/WebKit renderer strings are masked, so their GPU backend is unverified.

#### Real-GPU performance constraints

- The owner's display runs at 143 Hz (7.0 ms median). Headless 60 Hz numbers are
  a virtual clock and hid the material difference.
- HoloType A/C sustains 133–137 fps with p95 under 9 ms and no frames >50 ms.
- Paper B averages 79 fps, p95 34.6 ms, 6.1% of frames >33 ms, 2 frames >50 ms
  (max 58.9 ms). Paper D averages 120 fps, p95 16.7 ms, 1.5% >33 ms, 2 >50 ms.
- Paper is the frame-pacing variable, not the mask. A 60 Hz customer display
  would hide most of this; the 143 Hz display does not.
- The shader is capped at 1× CSS pixels (`minPixelRatio={1}`,
  `maxPixelCount=1.2M`), which is why DPR2 interiors are soft.
- GPU utilisation is modest (median 16%), but the measurement is host-level and
  the stage is small; a full-bleed 4K stage is untested.
- No thermal, battery, or long-duration test. No mobile hardware test.
- The bundle is 540,883 bytes for the route (+86 KiB vs `/labs/effects`), which is
  acceptable for a lab but material for an installable component.

#### Commercial packaging blockers

1. **HoloType cannot ship** (A/C): `REVIEW_PENDING`, proprietary, no licence.
2. **No installable package boundary**: `@/` aliases, no `exports`/`main`,
   lab-scoped CSS module, no peer-dependency declaration.
3. **No export pipeline**: `exportTargets` metadata mentions `png-sequence` and
   `webm`, but nothing produces them. This is the most likely customer
   misunderstanding.
4. **No deterministic replay**: no seed, time origin, font asset or mask hash in
   the recipe.
5. **Mask cache keyed by id**: customer geometry edits can show stale masks.
6. **A11y**: canvas-only wordmark and unlabelled Paper surface.
7. **Font packaging**: Geist is fetched at build time; a customer build without
   network falls back, and the mask follows the fallback.
8. **Moth rights**: original but unlicensed and proof-grade.
9. **DPR policy**: 1× material on hi-DPI displays.
10. **Paper NOTICE**: must be redistributed with the package.

#### Exact recommended G5-A scope

Prove **one** independently installable, customisable composition in a clean React
consumer. Do not build a studio, marketplace, payment system, or new renderer.

In scope:

1. Pick **one** composition: **wordmark × Paper MeshGradient (D)**, because it is
   the only pair with a clear customer story (brand text + a licensed material)
   and no HoloType licence blocker.
2. Package it as one installable unit: a single entry point, relative imports, an
   `exports` map, declared peer dependencies, the surface CSS extracted from the
   lab module, and the Paper NOTICE/LICENSE included.
3. Ship a **fixed, self-hosted wordmark font asset** (or make the font a required
   input) so the canvas mask and DOM metrics are identical on every machine.
4. Add a deterministic recipe: mask id + version + geometry hash, material
   version, params, font asset id, seed/time origin, explicit paused frame.
5. Fix the mask cache key to include version and geometry hash, and add a
   regression test for a geometry change under the same id.
6. Add a DPR policy for the shader (at least 2× up to the pixel cap, or a
   documented 1× decision) and verify it at DPR2.
7. Add accessibility: labelled composition surface, real text alternative for the
   wordmark, reduced-motion behaviour, keyboard-safe controls.
8. Remove or gate `png-sequence`/`webm` metadata until an exporter exists.
9. Keep the acceptance bar: 149-check equivalent, 3-engine matrix, explicit
   no-WebGL2 fallback, pixel-boundary proof, and a fresh owner visual review.

Out of scope for G5-A: HoloType licensing, a node editor, multi-effect studio,
image/video export, payments, marketplace, additional rendering libraries.

---

## PRESERVATION CHECK

- Baseline archive: `evidence/g3a1/baseline-r0/evidence-g3a.tar.gz`
  (`sha256 e21e41d4…de20`), 198 files, SHA-256 manifest.
- Re-hash after all work: **198/198 byte-identical**; `diff` empty.
- Tracked product tree: `git diff --stat -- docs lib components app experiments
  registry fixtures third_party THIRD_PARTY_NOTICES.md package.json
  pnpm-lock.yaml pnpm-workspace.yaml` is empty (the new report is the only doc
  addition).
- Worktrees unchanged: `feat/forge-foundation-g2` at `07f91b5`,
  `feat/g3a-composition-proof` at `e5e4119`.
- No branch push, merge, tag, deploy, registry publish or PR state change.

---

## REPRODUCTION

```sh
# 0. Pre-flight
git rev-parse HEAD                     # e5e4119e791e7815b8b6e8efe4439b123fc61225
git status --porcelain                 # clean before the G3-A.1 scripts

# 1. Install and build
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm registry:validate
pnpm verify:contract                   # 24/24
pnpm verify:composition-contract       # 26/26
pnpm build

# 2. Serve the production build
pnpm start --hostname 127.0.0.1 --port 3100

# 3. Real GPU (headless Chrome + ANGLE/GL wrapper)
node scripts/g3a1/probe-gpu.mjs
CHROME_PATH="$PWD/scripts/g3a1/chrome-gpu.sh" \
  EVIDENCE_DIR=evidence/g3a1/gpu-final pnpm verify:composition   # 149/149

# 4. Extended GPU evidence
node scripts/g3a1/capture-motion.mjs
node scripts/g3a1/capture-video.mjs
node scripts/g3a1/pause-probe.mjs
node scripts/g3a1/probe-canvas.mjs
node scripts/g3a1/probe-headed.mjs    # headed window on DISPLAY=:0

# 5. Cross-browser (Playwright browsers must be installed)
#    npx playwright@1.64.1 install firefox webkit
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 \
  node scripts/g3a1/verify-crossbrowser.mjs                     # 62/62 each

# 6. Explicit no-WebGL2 fallback
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 \
  node scripts/g3a1/verify-fallback.mjs                         # 20/20

# 7. Review sheets
python3 scripts/g3a1/make-sheets.py
```

WebKit on this host needed `libmanette-0.2.so.0`. It was extracted from
`libmanette-0.2-0_0.2.13-1_amd64.deb` into the Playwright bundle's
`minibrowser-wpe/sys/lib/` (environment-only, not a repository change), and
`PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` skips the remaining host check.
This is a test-environment workaround, not a product dependency.

---

## ROLLBACK

No commit was created in this session, so rollback is local and additive:

```sh
# Restore the only modified tracked file
git restore scripts/verify-composition.mjs

# Remove the G3-A.1 tooling and report
rm -rf scripts/g3a1 docs/G3A1_REPORT.md

# Remove the G3-A.1 evidence if desired (the G3-A evidence is untouched)
rm -rf evidence/g3a1

# Stop the verification server
pkill -f "next start --hostname 127.0.0.1 --port 3100"
```

The original G3-A rollback remains as documented in `docs/G3A_COMPOSITION.md`:

```sh
git switch feat/forge-foundation-g2
git branch -D feat/g3a-composition-proof   # local only
git push origin --delete feat/g3a-composition-proof   # only if abandoning PR #3
```

No data migration, deployment, package publication or production state is
involved. The G3-A evidence archive is byte-identical and can be restored from
`evidence/g3a1/baseline-r0/evidence-g3a.tar.gz`.

---

## FINAL VERDICT

**`READY_FOR_OWNER_VISUAL_DECISION`**

Reasoning:

- Gate A: **GPU_VERIFIED** on the RTX 4060, 149/149, bounded lifecycle and heap.
  Headless 60 Hz samples are clean; on the owner's real 143 Hz display HoloType
  sustains 133–137 fps with no frames >50 ms, while Paper B averages 79 fps with
  p95 34.6 ms and 2 frames >50 ms. That is a material-dependent pacing limit, not
  a failed check, and it is reported rather than averaged away.
- Gate B: **PASS** in Chromium, Firefox and WebKit (62/62 each) plus explicit
  no-WebGL2 fallback (20/20).
- Gate C: review package produced and clearly separated into technical facts and
  subjective observations; no automatic owner approval.
- Gate D: ten portability questions answered; risks registered; no G5
  implementation.
- Gate E: hostile review completed; no current acceptance check failed; no visual
  product fix was required; the one targeted harness fix was re-reviewed.

This is **not** a merge or publication approval, and it is **not** owner visual
approval. The remaining decision is the owner's: whether A–D are visually worth
taking into G5-A, and which single composition to package first.

The recommended next project is **G5-A: one installable wordmark × Paper
composition in a clean React consumer**, as scoped in Gate E. Do not start it
until the owner has reviewed the comparison sheet and chosen the composition.
