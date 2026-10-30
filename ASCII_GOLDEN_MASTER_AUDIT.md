# NULLWORX — ASCII Waves golden master audit

Date: 2026-10-30. Verdict: **FEATURE_PARITY_INCOMPLETE**. Owner visual review remains open.

The Flower rendering pipeline preserves the loved checkpoint under the controlled conditions below. Its shader, glyph shapes, palette, decoded frames, wave rhythm and pointer eddy match. That finding does **not** establish parity of the whole experience: Nullworx has a smaller, differently framed field and lacks several original controls, the mobile tray and a full-screen review view. The later experimental shelf is also absent; its reels must not be promoted automatically.

Two integration issues were demonstrated and repaired without modifying the preserved component: the codec-selection wrapper lost Flower's 2.2-second starting offset, and the lab mislabelled a hidden page as loading. Pause help text now describes the measured pointer settling behavior.

No commit, merge, push, publication, deployment or G5-A integration was performed. This report is evidence for owner review, not owner approval.

## Review artifacts

All paths below are local audit artifacts.

| Deliverable | Artifact |
| --- | --- |
| Visual review page | [REVIEW.html](evidence/ascii-golden-master-2026-10-30/REVIEW.html) |
| Golden/current controlled screenshot sheet | [PNG](evidence/ascii-golden-master-2026-10-30/screenshots/golden-versus-current-screenshot-sheet.png) |
| Actual desktop/mobile presentation | [PNG](evidence/ascii-golden-master-2026-10-30/screenshots/native-presentation-sheet.png) |
| Six-second side-by-side motion | [MP4](evidence/ascii-golden-master-2026-10-30/motion/golden-versus-current-motion.mp4) |
| Actual homepage motion | [MP4](evidence/ascii-golden-master-2026-10-30/motion/home-presentation-native-6s.mp4) |
| Actual lab motion | [MP4](evidence/ascii-golden-master-2026-10-30/motion/lab-presentation-native-6s.mp4) |
| Exact source hashes, including HEAD versus working tree | [Markdown](evidence/ascii-golden-master-2026-10-30/source/HASH_MATRIX.md), [TSV](evidence/ascii-golden-master-2026-10-30/source/hash-matrix.tsv), [JSON](evidence/ascii-golden-master-2026-10-30/source/hash-matrix.json) |
| Whole-file source/CSS differences | [Source directory](evidence/ascii-golden-master-2026-10-30/source) |
| Browser, GPU, frame intervals, native motion | [Performance receipt](evidence/ascii-golden-master-2026-10-30/receipts/performance-rtx4060.json), [motion timeline](evidence/ascii-golden-master-2026-10-30/receipts/motion.json) |
| Native flow/state verification | [46-check receipt](evidence/ascii-golden-master-2026-10-30/receipts/flow-verification.json), [explicit visibility-event tests](evidence/ascii-golden-master-2026-10-30/receipts/visibility-after.json) |
| Preservation and rollback | [Final preservation receipt](evidence/ascii-golden-master-2026-10-30/preservation/final.json), [audit-only patch](evidence/ascii-golden-master-2026-10-30/preservation/audit-only.patch) |
| Artifact checksums | [SHA256SUMS.txt](evidence/ascii-golden-master-2026-10-30/SHA256SUMS.txt) |

Local review servers: loved archived app <http://127.0.0.1:3217/>, consolidated homepage <http://127.0.0.1:3220/>, ASCII lab <http://127.0.0.1:3220/lab/ascii-waves>. These are local processes, not deployments. The archived app runs from a temporary extraction, not from the original directory.

## Plan and inspected state

The audit followed PLAN → CHANGESET → VERIFY → VERDICT: fingerprint the originals and existing work, inspect the checkpoint and actual implementations, compare controlled rendered frames and native motion, repair demonstrated wrapper issues, then verify the actual production routes.

| Source | Actual inspected state |
| --- | --- |
| Canonical checkpoint | `~/DevHub/experiments/ascii-waves-proof03/checkpoints/ascii-waves-proof03-loved-flower-2026-10-24.tar.gz`; extracted to an isolated temporary directory |
| Current Proof 03 | `~/DevHub/experiments/ascii-waves-proof03`; not a Git repository; contains the later five-reel shelf |
| React 01 | `~/DevHub/experiments/ascii-waves-react-01`; not a Git repository; actual renderer, component, demo, presets and media read |
| UI Forge Flower | `~/DevHub/experiments/ui-forge-flower-integration-01`; `main` at `906f859db0125965cba71c51da1707c0a4c6d045`, with pre-existing integration WIP; source hashes identify the actual uncommitted files |
| Branded Nullworx | `~/DevHub/nullworx`; `feat/nullworx-v0-1-foundation` at `4884b2bda77ead07f038c1a6ee2e85783936ba15`; three pre-existing untracked clean-clone logs |
| Branded preview clone | `~/DevHub/experiments/nullworx-site-preview`; same foundation branch/HEAD; owns the consolidation Git worktree |
| Consolidated Nullworx | `~/Documents/deepseek-harness/default-workspace/nullworx-consolidation-01`; `feat/consolidation-01` at `9926dbcb52f60348ddb5878eefe204451babd9d7` |

Consolidation was **not clean at audit start**. Three existing changes already selected High quality in `home-field.tsx`, `effect-lab-preview.tsx` and `lib/effects/manifest.ts`. They were preserved. Commit `9926dbc` itself uses Efficient on the homepage and Balanced in the lab/manifest. The matrix separates that commit, the pre-audit working state and the final working files. The quality change is not attributed to this audit.

The context-budget-router, verification and React review skills were used. MemPalace tools were not available. Chrome DevTools MCP could not start its browser (`Missing X server`); local headful Playwright plus the Chrome DevTools Protocol supplied the browser/GPU/runtime evidence instead. No production service was accessed.

## Phase 1 — exact golden master

Checkpoint SHA-256:

```text
422482e98569aeda9e4254a9ef98b4cd42ca5b9f9ede75e7d17fca6d61114012
```

This equals the checksum in the checkpoint README, React 01's saved `evidence/source-manifest.json` and preservation baseline, and UI Forge's saved `evidence/preservation.json`. Separately, **90/90 current Proof 03 file hashes match** the React 01 preservation baseline captured at `2026-10-24T00:59:26.774604+00:00`. See the final preservation receipt for the exact historical source path and comparisons. These are corroborating local records, not an externally signed attestation. Tree digests made by different manifest algorithms must not be compared as if they used the same serialization.

The archive contains the pre-shelf Flower app, source, local MP4, scripts and historical evidence. It has **no** `src/motifs.ts`, experimental reels or public Flower poster. Its public media consists of `flower.mp4`. The later poster and reel shelf must not be retroactively described as part of the loved checkpoint.

| Golden item | Exact identity / behavior |
| --- | --- |
| Renderer | `src/renderer.ts`, SHA-256 `1d02a7a1c0608ec717863c45eaa76d840df7cb5ad6dd335ff30172fc82ea7088` |
| Vertex shader | Exact extracted `VERT`: `5e5cb7d301ae948a9e99926a0e5e040c73c9bb146c8875e1e91c6e34d71f50af` |
| Fragment shader | Exact extracted `FRAG`: `69681757a77f3099a9dd533f90d1e54e4d410398a32a03c90000aefec7faad08` |
| Glyph generator | `src/glyphAtlas.ts`: `6f8b4baea7da950add0733ea18d70dad764624110dd48ed148e99d2ccd46a321`; runtime-generated atlas, not a bundled bitmap |
| Atlas rasterization | `"DejaVu Sans Mono", "Liberation Mono", "Nimbus Mono PS", monospace`; weight 700; font size `max(9, cellDevicePx × .94)`; native device-pixel raster; 2-pixel padding; linear filtering; up to 48 glyphs |
| Glyph order | `" .:-+*=%@#"`, including the leading space |
| Ink / inversion | `#ffffff`; invert false; video RGB multiplied by ink, same luma mapping |
| Density | Initially 16 CSS px desktop, 14 at viewport ≤820, 12 at ≤520; 90 × 57 at 1440 × 900 |
| Wave settings | speed 1, noiseScale 2, tension .5, twist .1, intensity 1 |
| Pointer | enabled; intensity 1; same damped position/strength model; window coordinates |
| Media | `flower.mp4`: `0cd83d944a6ca7822b4a8306cecc60a36e859b041f6702c6a1ad9ead78924451`; H.264 960 × 540, 5.055-second container, retained AAC track, muted and looped |
| Starting frame | Video 2.2 s; independent wave clock starts at renderer creation, speed 1 |
| Quality | Device DPR capped at 2; original test URL can override DPR; no quality dropdown |
| GPU path | WebGL 2; opaque canvas; antialias/depth/stencil false; high-performance preference; one triangle / draw call; decoded-frame-gated video texture uploads |
| Presentation | Fixed full-viewport field; top/bottom scrims; desktop controls; mobile dock and scrollable bottom tray with safe-area spacing |
| Transport | Pause **video only**; waves continue. Confirmed afresh on desktop and mobile, not inferred from a README |

Original controls include local video chooser and drag/drop, Demo / No video, play/pause, mute, loop, Characters, Colour, inversion, size 8–32, intensity 0–2, speed 0–2 in .01 steps, tension .1–2, twist 0–1, noise .1–5 and pointer response 0–2. Keyboard shortcuts are Space, M, L, U, C and Escape, with editing controls excluded. There is a time readout and a seek API; **no visible scrubber was found**. Do not invent a lost timeline scrubber.

Fresh original control captures: [desktop](evidence/ascii-golden-master-2026-10-30/screenshots/golden-controls-desktop.png), [mobile tray](evidence/ascii-golden-master-2026-10-30/screenshots/golden-controls-mobile.png). [Control/paused-behavior receipt](evidence/ascii-golden-master-2026-10-30/receipts/golden-controls.json).

### Reel and experiment classification

| Item | Evidence and disposition |
| --- | --- |
| Flower | Only owner-loved golden master. MP4 identical throughout the lineage. Existing provenance identifies the MDN CC0 sample. Keep as the baseline. |
| Jellyfish | Later Proof 03 / React 01 experiment; Pexels 28156785. Existing provenance could not independently verify redistribution; local reference only. No import. |
| Koi | Later experiment; Pexels 6392574, incomplete inherited contributor credit. Redistribution unresolved. No import. |
| Smoke | Later experiment; Pexels 2328902. Redistribution unresolved. No import. |
| Orion / `nebula` | Later experiment; inherited NASA public-domain provenance, but no owner art approval. Rights status does not make it an approved Flower replacement. Defer. |
| Terminal Rain | Separate `living-stencils-proof01` implementation (`TerminalRain.tsx`, `rainEngine.ts`, `src/compositing/ascii.ts`), imported into a separate lab. It is not a Flower successor or a restored reel. |
| Glyph Dissolve Proof 01 / 02 and other materials | Separate local experiments/references. They are not interchangeable with this checkpoint. No renderer or assets taken from them. |
| G5-A Living Type | Independent work; no integration, merge or renderer substitution during this audit. |

The current Proof 03 source has five shelf entries, Flower first and `loved: true`; React 01 marks the other four experimental. Historical shelf screenshots/recordings show technical exploration, not art approval. This audit inventoried and probed those existing files; fresh visual/motion qualification is specifically for Flower. UI Forge, branded Nullworx and consolidation intentionally contain only the Flower preset/media. No uncertain-rights reel was copied into this audit's product changes.

## Phase 2 — source fidelity and all material behavior changes

The [161-entry exact matrix](evidence/ascii-golden-master-2026-10-30/source/HASH_MATRIX.md) covers renderer, extracted shaders/default block, atlas, presets, component/app, controls, CSS, wrappers, runtime seam, manifest, package/lock/config and media across seven source states. Missing files are explicit; no whitespace normalization is used. [Media inventory](evidence/ascii-golden-master-2026-10-30/source/media-inventory.json) includes file hashes and ffprobe streams.

| Comparison | Finding |
| --- | --- |
| Loved archive → current Proof 03 | Renderer and atlas identical. App, controls and CSS changed to add the shelf; new motifs, media and posters. Flower defaults preserved. |
| Proof 03 → React 01 | Renderer raw hash changes to `2bf9b073b0d8b1c11a6bfdf7e57fdf5443692c69d34f4fb1fbeafbd4b7c97568`. Both shader strings and atlas file remain identical. Renderer gains DPR options, start/stop, metrics and lifecycle behavior described below. Full app/CSS replaced by a reusable component and separate demo. |
| React 01 → UI Forge | Renderer hash `edd2ab3a049ed2c2a70b8cd62043134163463246516ba06cdf7d6fe9e12aafd7`; atlas `eb002aa7ce2875db3afeafebb596d0e32633acd4a4fdeb10ab95886c5be950f2`. Reviewed diffs change literal quoting and space/NBSP representation for packaging; shader bytes and actual settings values do not change. Component adds `use client` and fallback-image lint handling. Presets become Flower-only. |
| UI Forge → branded → consolidated | **All five preserved component files identical**, including renderer, atlas, preset and component CSS. The changed behavior is in site wrappers, their CSS and controls. |

Matching shader/source hashes alone were not used as a visual verdict. Actual renders and motion were captured.

| Setting / wrapper behavior | Golden → extraction / integration / final consolidation |
| --- | --- |
| All 11 renderer settings | Values unchanged: characters, ink, inversion, cell rule, noise, speed, tension, twist, intensity, cursor enable and strength. Actual cell size changes with container dimensions; see measurements below. |
| Responsive density basis | Golden uses viewport at initialization/reset. Component uses observed container width and updates on resize/orientation: 12 at ≤520, 14 at ≤820, otherwise 16. Thus a desktop homepage card can legitimately select 12. |
| DPR | Original cap 2 plus URL override (.5–2). Extraction removes URL override; High/Balanced/Efficient cap at 2/1.5/1 and do not force a device DPR. Current working defaults High; commit `9926dbc` overrides homepage to Efficient and lab to Balanced. |
| Clamping | Component clamps cell size to 8–32, speed to 0–4, pointer strength to 0–2, palette to 48 characters, and substitutes defaults for empty/invalid values. Original UI offered 32-character input, size 8–32 and speed 0–2. |
| Color parsing | Extraction trims outer whitespace and a leading `#`; approved `#ffffff` is unaffected. |
| Wave calculation | Same shader, clock multiplier, .08-second dt cap and pointer easing rates 6.5 / 11. No new shader or motion algorithm. |
| Resize / lifecycle | Original measures every render and owns window resize listeners. Component uses ResizeObserver; explicit running state, intersection/visibility pausing, clean source loading, idempotent disposal and context loss/recovery. Disposal releases the WebGL context. |
| Pause | Original pauses video while waves and pointer stay active. Component `playing=false` holds the video and wave clock and disables new pointer influence; the existing eddy still eases away. Consolidated labels now describe this accurately. |
| Pointer scope | Original uses window-relative pointer events. Component uses its own rectangle, pointer capture for touch/pen, mouse-leave damping and blur cleanup. CSS changes `touch-action:none` to `pan-y`, preserving page scrolling. |
| Reduced motion | Component/system integration freezes video/clock and disables interaction. React demo can force motion; that override is absent from Nullworx's visitor controls. |
| Source and seek | Golden MP4 starts at 2.2 s. Component defaults a custom `src` to zero. Consolidation supplies a codec-selected URL, accidentally triggering that custom-source default. Audit fix carries the preset offset through that wrapper; genuine explicit custom URLs retain their existing zero default unless `startTime` is supplied. |
| Codec selection | Consolidation probes H.264 first, then VP9. New `flower.webm` hash `11b671189edbc5d755e1874b656a73b4bcfa1b551cc5a3b987757152046935b1`; VP9 960 × 540, 5.005 s, no audio. It is a derivative, not byte-identical Flower. Forced codec-probe tests verify decode/start offset on both routes; they do not establish cross-codec visual equality or constitute WebKit testing. |
| Lazy loading | Site uses a client-only dynamic runtime and 360-pixel prefetch margin; a separate 1% intersection observer owns actual visible state. |
| Truthful state observation | Consolidated wrapper polls every 250 ms; progress window 650 ms, startup settling 1200 ms; states loading/live/paused/reduced/blocked/hidden/offscreen/error. A blocked state holds the clock; homepage exposes Start. Lab recovers via Motion off/on. |
| Poster | No public fallback image in the archive. Later CC0-derived poster is identical from the shelf onward: `fb34be9b63ad42c7b13dae6c507e683c09f623cc7380ca6717959d54554e919a`. Site poster is below the opaque canvas; opacity .76, .18 while live, 480-ms transition; saturation .65, contrast 1.08, brightness .7, scale 1.015 apply to the poster. Failure also shows the component's fallback image. |
| Field overlays | Golden has 150/170-pixel top/bottom scrims (mobile 110/140). Site has its own multiply vignette, .1-opacity scan layer, corners and status overlays. It is not a presentation-equivalent copy of Proof 03. These layers are stripped only in explicitly controlled captures. |
| Layout and control presentation | Golden is full-viewport, with desktop panel / mobile dock and bottom tray. React demo has Hero/Card/Fullscreen. Nullworx has homepage card and a lab stage (16:10 desktop, square below 620); no equivalent full-screen mode/tray. Home is 1.12:1, 1.05:1 below 760. |
| Font / framework | Atlas font stack and raster formula unchanged; measured page smoothing is `antialiased` in golden/current. Golden React 19.1/Vite 8.3.5 versus consolidation React 19.3.1/Next 16.4.3. Branded site typography is presentation CSS. No dependency changed in this audit. |
| UI controls / query APIs | Original app shortcuts, controls, source handling and test URL parameters are not carried over as a complete visitor interface. React/Forge expose a subset through props/demo controls. Nullworx's UI subset and the restore/defer decisions are in the feature table. |

Full raw diffs, including the complete CSS changes, are retained rather than reduced to these summaries. App-only differences are not described as renderer changes.

## Phase 3 — visual, motion and interaction evidence

Both sides use **headful Google Chrome 156.0.8078.47**, WebGL 2 / `ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2)`, the same local MP4 bytes, native glyph font, palette and wave settings. Driver: `595.99.02`. Physical display: 1920 × 1080 at 144 Hz, OS scale 1; test contexts explicitly emulate the stated DPR. Browser/SystemInfo receipts identify the device and feature status.

The original is the **archived app**, served from a temporary copy with its original code. The current side is the **actual production homepage route**, not a replacement renderer or a new demo implementation. For controlled captures only, browser-injected CSS expands the existing stage to the same viewport and hides app chrome, scrims, vignette/scan and scrollbars. Native presentation captures and homepage/lab clips retain all product framing.

Both APIs can seek the existing video, freeze the existing wave clock and set the existing pointer. The current handle is discovered through the mounted React ref; no production test hook was added. During controlled stills only, a test-only media `play()` guard prevents `canplay` from restarting a deliberately held decoder. It is released for all native flow, motion and timing tests. No mock clock, replacement drawing path or generated intermediate image is used.

### Corresponding rendered frames

| Canvas / DPR | Video timestamp / wave clock | Pointer | Result |
| --- | --- | --- | --- |
| 1440 × 900 CSS; 2880 × 1800 backing; DPR2; cell16 | 2.2 / 0, 2.7 / .5, 3.2 / 1, 4.2 / 2 | inactive | Four exact pairs: MAE 0, 100% identical CSS-size PNG pixels |
| Same desktop conditions | 3.2 / 1 | .70, .35; damped to settled strength | Exact pair: MAE 0 |
| 390 × 844 CSS; 780 × 1688 backing; DPR2; cell12 | 2.7 / .5 and 4.2 / 2 | inactive | Two exact pairs: MAE 0 |
| 1440 × 900 CSS/backing; DPR1; cell16 | 3.2 / 1 | inactive, neutralized | Exact pair: MAE 0 |
| 2880 × 1800 native device-pixel PNG; DPR2; cell16 | 3.2 / 1 | inactive, neutralized | Exact pair: MAE 0; no CSS-size downsampling |

The untouched full-size screenshots, actual state snapshots and per-pair metrics are retained. The sheet resizes them only for review. These comparisons support the same glyph shape/density, color/contrast, flower reconstruction and sampled wave phases **under matched inputs**. They are not a claim about every possible input, browser or viewport.

An early capture attempt was rejected because the seek's `canplay` event resumed native media; a separate initial DPR1 attempt was rejected because opening a physical window had left an unsolicited pointer eddy. Their receipts are explicitly named `*-rejected.json`, are not counted as matched evidence, and prompted media holding / neutral pointer convergence. No failed synchronization was presented as a rendering regression.

### Actual integration dimensions

| Page | Viewport | Actual CSS field | Actual backing | Cell / grid |
| --- | --- | --- | --- | --- |
| Golden | 1440 × 900, DPR2 | 1440 × 900 | 2880 × 1800 | 16 / 90 × 57 |
| Homepage | Same | 485.734 × 433.688 | 971 × 867 | 12 / 41 × 37 |
| ASCII lab | Same | 936.266 × 585.156 | 1873 × 1170 | 16 / 59 × 37 |
| Golden | 390 × 844, DPR2 | 390 × 844 | 780 × 1688 | 12 / 33 × 71 |
| Homepage | Same | 352 × 335.234 | 704 × 670 | 12 / 30 × 28 |
| ASCII lab | Same | 352 × 352 | 704 × 704 | 12 / 30 × 30 |

Those smaller grids materially reduce visible flower detail, especially on phones. The different aspect ratios also change the presentation of the same shader's normalized field. This follows the existing integration layout; it is not evidence of a new shader defect. **The owner's approval of the full-screen Flower does not approve these smaller layouts or darker edge overlays.** The native sheet is the review evidence for that decision.

### Native motion, pointer and pause

The six-second motion pair uses the same 1440 × 900/DPR2/cell16 conditions, video seed 2.2 s, clock seed 0, neutral pointer, then pointer (.70, .35) at 2 s and release at 4 s. Both clocks advance about 6.00 s, both source timelines advance and loop, and both damped eddies strengthen and settle with the same rhythm. Each final raw clip observes 863 native render ticks; CDP captures about 590 presentation frames before 30-fps export. Separate six-second actual homepage/lab clips retain native framing.

**Exact per-frame synchronization is unsupported** across two independent video decoders and rAF loops. The clips are independently recorded in foreground and preserve their real CDP elapsed timestamps; export does not retime the effect to make it appear equivalent. No live-clip MAE or fabricated pixel equivalence is claimed. Controlled stills provide the exact-image evidence; native clips provide movement/behavior evidence.

Fresh native user-path tests verify mouse reaction and leave damping; emulated touch down/move/release in real Chromium touch contexts; mobile `pan-y` and no horizontal overflow; pause/resume; every current lab control and copied config; offscreen pause/resume; reduced motion; blocked autoplay and recovery; and loaded visible fallback posters after deliberate decode/WebGL failure. Native normal paths have no console/network errors; intentional decode-failure logs are separated.

Original Pause video holds only the source frame; its wave clock advances. Current Motion/Pause holds source and wave clock, with the residual pointer eddy easing away. In two current paused stage comparisons, video/clock are exactly held, while tiny residual pixel changes remain (max channel delta 1 homepage / 2 lab; changed pixels about .010% / .006%). These are not advertised as pixel-exact frozen images. Help text now states that the eddy settles.

The native background-window attempt did **not** make `document.hidden` true: Chrome kept the independent windows visible. Two native visibility checks are **inconclusive**. A separately labelled document-visibility override plus `visibilitychange` event verifies that both routes stop the renderer/decoder, label the state correctly and resume. This verifies event handling, not an actual OS/tab transition.

### Full-speed RTX 4060 receipts

No frame-limit override, synthetic time or video recorder was active during timing samples. ABBA order, six seconds per sample after settling, same 1440 × 900 CSS / 2880 × 1800 backing / DPR2 / cell16 / High. Timings are delivered **rAF intervals**, not GPU execution durations.

| Sample | FPS | Median ms | p95 ms |
| --- | ---: | ---: | ---: |
| Golden A1 | 143.63 | 7.0 | 7.1 |
| Current B1 | 143.63 | 7.0 | 7.1 |
| Current B2 | 143.63 | 7.0 | 7.0 |
| Golden A2 | 143.63 | 7.0 | 7.0 |
| Actual homepage | 143.56 | 7.0 | 8.1 |
| Actual ASCII lab | 143.63 | 7.0 | 7.7 |

All use one draw call and roughly 29.3–29.5 video uploads/s. This matches the historical 143.6-fps receipt on this host under the tested conditions; it is not a guarantee for another workload/device. Raw interval arrays, clock/frame/upload counters, GPU strings and CDP metrics are in the performance receipt. [Display receipt](evidence/ascii-golden-master-2026-10-30/receipts/display.txt).

## Phase 4 — feature parity

“Proof 03” distinguishes the frozen Flower checkpoint from the later shelf. “Restore” below is a proposed follow-up after owner review, not a claim that it was implemented in this audit.

| Feature | Proof 03 | React 01 | Consolidated Nullworx | Missing? | Keep/Restore/Defer |
| --- | --- | --- | --- | --- | --- |
| Loved Flower effect | Canonical | Preserved component | Same preserved component | No, within tested conditions | Keep |
| 2.2 s source opening | Yes | Preset default | Was lost by codec wrapper; fixed | Fixed | Keep |
| High quality / DPR2 cap | Default | Default | HEAD Efficient/Balanced; pre-existing working edits High retained | Fixed before this audit | Keep High |
| Full-viewport Flower review | Default | Fullscreen placement | Embedded card/lab only | Yes | Restore a Flower-only focus view after framing review |
| Five-reel shelf | Absent in checkpoint; present later | Five, four labelled experimental | Flower only | Yes, versus later shelf | Defer; no automatic promotion |
| Jellyfish / Koi / Smoke | Later local reels | Development-only references | Absent | Yes | Defer; rights unresolved |
| Orion | Later experimental reel | Experimental preset | Absent | Yes | Defer; owner approval still absent |
| Local chooser and drag/drop | Yes, browser-local object URLs | Custom `src` prop; no equivalent demo chooser | Custom URL supported in wrapper; no visitor chooser | Yes | Restore local-only chooser in lab if owner wants it |
| No video / procedural toggle | Yes | `src=""` supported in component; no demo control | No visitor control | Yes | Restore lab affordance; keep Flower default |
| Characters / color / invert | Visible controls | Component props, absent from demo controls | Component/wrapper props; absent from lab UI | Yes | Restore tuning UI after review |
| Size slider 8–32 | Yes | Auto or numeric prop | Auto / 12 / 16 / 20 | Partial | Restore fine control in lab |
| Wave speed | 0–2, .01 step | Prop, demo fixed at 1 | 0–2, .1 step | Partial | Keep default 1; restore fine step if useful |
| Intensity / noise / tension / twist | Four visible controls | Fixed defaults in component | Same fixed defaults | Yes | Restore carefully in follow-up; no new shader |
| Pointer enable / strength | Switch + 0–2 slider | Props, no equivalent demo controls | Enable switch; strength only a prop | Partial | Keep enable; restore strength control |
| Play/pause semantics | Video pauses; waves continue | Whole-field intent | Video + clock held; eddy settles | Changed | Owner review; current text is truthful |
| Mute / loop controls | Visible + shortcuts | Fixed true by demo; props available | Fixed true; controls absent | Yes | Keep current defaults; defer transport expansion |
| Mobile dock / bottom tray | Yes, safe-area aware | Responsive demo chrome, different controls | Inline controls below stage; homepage Play only | Yes | Restore focused mobile affordance after review |
| Keyboard Space/M/L/U/C/Escape | Yes | No equivalent shortcut set | Native button keyboard support only | Yes | Restore focused lab shortcuts without global conflicts |
| Time readout / seek API | Readout + API; no scrubber | Readout + API | Internal state/API; no visible source time | Partial | Restore useful readout; do not invent scrubber parity |
| Pointer over entire field | Window coordinates | Container-relative | Container-relative + touch capture | Scope changed | Keep for embedded pages; compare focus view separately |
| Reduced-motion handling | CSS preference styling; source/clock continue | System freeze + optional override | System freeze, truthful still label | Changed/improved | Keep; defer override |
| Offscreen/hidden pausing | Limited original visibility handling | Component observers | Observers + state labels | Added | Keep; native tab transition remains unverified |
| Decode/WebGL image fallback | Error plate, no public fallback poster | Poster fallback + context recovery | Poster below canvas; verified fallback labels | Added | Keep |
| Quality selector / copy config | No quality dropdown | Quality selector | Lab selector + copy config/reset | Added | Keep |

UI Forge is a relevant intermediate loss point: its gallery still exposes characters, color, invert, size, speed, interaction strength, quality and playing. Nullworx's lab reduces that further to size, speed, quality, Motion and Pointer eddy. The original Wave tuning controls were already omitted from the React extraction; they were not newly deleted by consolidation.

## Phase 5 — narrowly scoped changeset

| Audit edit | Demonstrated reason | Verification |
| --- | --- | --- |
| `components/effects/ascii-waves-canvas.tsx` | Codec-selected `src` bypassed preset offset: pre-audit metadata/playback receipt starts near 0; no 2.2-second seek | Pass `startTime` through the wrapper using existing preset metadata. Final MP4 and forced VP9 paths both seek to 2.2 and become live on homepage/lab |
| `components/effects/effect-lab-preview.tsx` | Hidden simulation paused correctly but toolbar said Loading; corner states collapsed hidden/offscreen/error into Waiting | Explicit hidden/offscreen/fallback labels; visibility-event checks pass. Help text describes residual pointer settling |
| `scripts/ascii-golden-master/` | Reproducible read-only inventory/capture/verification and artifact composition | Audit scripts and receipts; no production test API |
| This report and `evidence/ascii-golden-master-2026-10-30/` | Owner review and rollback evidence | Artifact hashes and final preservation receipt |

No CSS, shader, renderer, atlas, presets, media or dependencies were changed. All five files of the preserved AsciiWaves component remain unchanged. The pre-existing High-quality changes in `home-field.tsx` and `lib/effects/manifest.ts` remain byte-for-byte unchanged from the start of this audit. The lab's existing High default remains intact around the audit's label/help edits.

## Verification output

| Command / check | Output |
| --- | --- |
| `pnpm build` on final code | PASS: effect manifest, production compile, TypeScript, static generation; [final build log](evidence/ascii-golden-master-2026-10-30/logs/build-reviewed.log) |
| `pnpm lint` | PASS, no warnings in final run; [log](evidence/ascii-golden-master-2026-10-30/logs/lint-reviewed.log) |
| `pnpm typecheck` | PASS; [log](evidence/ascii-golden-master-2026-10-30/logs/typecheck-final.log) |
| `pnpm test` | 7 files / **51 tests passed**; [log](evidence/ascii-golden-master-2026-10-30/logs/unit.log) |
| `node scripts/ascii-golden-master/verify-flows.mjs` | **46/46** native flow assertions passed; two background-window observations inconclusive |
| `node scripts/ascii-golden-master/visibility.mjs after` | Both explicit visibility-event cases pass pausing, labels and resume |
| `node scripts/ascii-golden-master/final-extras.mjs` | Final reviewed build: homepage/lab normal playback + 2.2-second seek; both forced VP9 decode/offset branches pass |
| `node scripts/ascii-golden-master/mobile-controls.mjs` | Final mobile homepage/lab controls pass, with held video/clock, lab density/quality changes and no overflow; full-page captures retained |
| Controlled captures / pixel metrics | Seven DPR2 exact CSS-size pairs, one exact DPR1 pair and one exact native DPR2 device-pixel pair; metrics retained separately |
| Motion + performance | Six-second raw pair plus native page clips; ABBA RTX 4060 timing receipts above |
| `python3 scripts/ascii-golden-master/preservation.py` | All five original trees unchanged; 90/90 historical Proof hashes match; all five preserved component files match UI Forge |
| `git apply --reverse --check …/preservation/audit-only.patch` | PASS; rollback applicability checked without applying it |

The full native flow run precedes the last help-text-only wording adjustment; the rebuilt final routes were then checked by focused smoke and codec tests. No unrelated suite or production endpoint was exercised. Native phone hardware, Safari/Firefox, VP9 visual equivalence and a real tab/OS visibility transition were not newly verified. The successful Chrome touch tests are emulation, not a claim of testing a physical phone.

## Preservation and rollback

The [baseline](evidence/ascii-golden-master-2026-10-30/preservation/baseline.json) and [final receipt](evidence/ascii-golden-master-2026-10-30/preservation/final.json) fingerprint regular files, excluding generated caches/dependencies/build output as documented in the receipt. Proof 03 (90 files), React 01 (115), UI Forge integration (158), branded Nullworx (186) and its preview clone (176) are unchanged, including Git HEAD/status where applicable. The checkpoint was read and extracted elsewhere; it was not rewritten. Consolidation HEAD is still `9926dbc`.

The audit-specific patch excludes the three existing quality edits. To undo **only this audit's two product-file changes**, first stop the local consolidated server and review/check the patch from the consolidation directory:

```sh
cd ~/Documents/deepseek-harness/default-workspace/nullworx-consolidation-01
git apply --reverse --check evidence/ascii-golden-master-2026-10-30/preservation/audit-only.patch
git apply --reverse evidence/ascii-golden-master-2026-10-30/preservation/audit-only.patch
pnpm build
```

The first command was verified; the reverse application was **not** executed. It returns the two files to their pre-audit contents while retaining the existing High defaults. Pre-audit file copies and the complete pre-existing diff are retained under `preservation/`. Do not use a blanket reset/checkout to undo this audit: that would discard unrelated existing work. Later edits may require resolving the small patch manually.

To inspect the original Flower again, extract the canonical archive into a **new empty directory**, verify the checksum above, and use its original package/scripts. Do not extract over Proof 03, React 01, UI Forge or Nullworx. Audit extraction/server details are in `audit-context.json`; generated build output lives outside the originals or inside the consolidated worktree. Keep the evidence/report until owner review is complete.

## Verdict and owner review gate

**FEATURE_PARITY_INCOMPLETE**

The demonstrated wrapper regressions are repaired, and the tested Flower rendering/motion is preserved. Full experience parity remains incomplete because the original controls, mobile tray and full-window field are missing, and the smaller/darker integration framing has not received owner visual approval. The shelf's absence must be documented without turning unapproved or uncertain-rights media into approved releases.

Review the side-by-side motion first, then the native homepage/lab presentation and original mobile tray. Decide whether the smaller field preserves the loved flower's legibility and whether the proposed Flower-only focus/controls follow-up is wanted. No art approval, release approval or experimental-reel approval is inferred from automated checks. **Stopped for owner visual review.**
