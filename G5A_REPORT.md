# G5-A — NULLWORX / LIVING TYPE 01 — final report

**Verdict: `G5A_READY_FOR_OWNER_REVIEW`.**

Repository: <https://github.com/CipherCuttle/nullworx>
Branch: `feat/g5a-living-type-01`
Worktree: `nullworx-g5a`
Base: G3-A `feat/g3a-composition-proof` at
`e5e4119e791e7815b8b6e8efe4439b123fc61225`
Date: 2026-10-29, Europe/Stockholm
Product: **NULLWORX / LIVING TYPE 01**, experimental and owner-review-only.
No merge, release, package publication, public registry admission or deployment.

This report records **technical acceptance**. It is not visual approval. The
owner-facing preset sheet is marked **EXPERIMENTAL / OWNER_REVIEW**, not
owner-approved.

---

## PLAN

1. Preserve the source, G3-A.1 harness changes and evidence without writing to
   the source worktree.
2. Create one source-of-truth installable item, then use that same source in the
   product demo and in two fresh consumers.
3. Solve the wordmark mask as content-addressed browser work, not a fixed
   proof mask: text, font identity/version, weight, fit, tracking, frame aspect,
   rendered dimensions and effective DPR all participate in identity.
4. Keep the effect portable: no Next API, no `@/lib`, no Nullworx globals, no
   external font service, one shadcn item with text-transportable assets.
5. Prove actual installation into a clean Next.js/React 19 app and a clean
   Vite/React 19 app, including fallback, lifecycle, accessibility,
   performance and three-engine browser checks.
6. Attack the implementation, fix Critical/High issues, re-run one targeted
   hostile review, then stop.

### Non-goals observed

No general compositor, custom shader engine, image/video/PNG export, uploader,
newsletter, payments, subscription, account, marketplace, full visual editor,
second material implementation, or changes to HoloType, ASCII Waves, CRT
Material Lab, or the original UI Forge component source.

---

## GATE 0 — PRESERVATION

Captured before creating the new worktree at 2026-10-29 20:52 Europe/Stockholm.

| Check | Result |
| --- | --- |
| Source worktree | `/home/swirky/Documents/deepseek-harness/default-workspace/nullworx-g3a` |
| Source branch | `feat/g3a-composition-proof` |
| Source HEAD | `e5e4119e791e7815b8b6e8efe4439b123fc61225` |
| Verified remote HEAD | same |
| Source status at capture | `M scripts/verify-composition.mjs`; untracked `docs/G3A1_REPORT.md`, `scripts/g3a1/`; evidence gitignored |
| Registered worktrees | source G2 and G3-A preserved; G5-A added as a third worktree |
| G3-A.1 evidence/harness files hashed | **332** |
| Evidence/harness hash manifest | `evidence/g5a/preservation/g3a1-evidence-and-harness.sha256` |
| G3-A.1 preserved archive | `g3a1-product-and-evidence.tar.gz` |
| Archive SHA-256 | `88c711cd8806e520d344915f1a3dfa9cebc2734c5d566fae0ffcc001efb88a4e` |
| Original G3-A evidence archive hash (inside the above) | `e21e41d4ccf5f522aa54a9f584c2c8080e71c52432d05532fa66b4930dc0de20` |
| Source worktree after G5-A work | unchanged status and HEAD; no reset/clean/commit |
| G3-A.1 harness incorporated | modified `scripts/verify-composition.mjs`, `docs/G3A1_REPORT.md`, `scripts/g3a1/*` copied read-only into G5-A |

The source worktree was inspected, not modified. The G3-A.1 evidence and
harness archive lives outside Git under the G5-A `evidence/` tree, plus its hash
records. The archive itself is not committed.

### Dependency and licence check

| Item | Value |
| --- | --- |
| Paper Shaders React | `0.0.82` (Apache-2.0) |
| Paper Shaders core | `0.0.82` (transitive, Apache-2.0) |
| Next.js | `15.5.28` (patched G2.1 baseline) |
| React / React DOM | `19.1.10` (patched G2.1 baseline) |
| `sharp` override | `0.35.5` |
| Root shadcn dev CLI | `3.0.0`, intentionally preserved |
| Product installer | `npx shadcn@4.23.0` (isolated; see hostile finding H-01) |
| Font source | Unbounded Variable 5.3.0, OFL-1.1; ASCII subset embedded |
| Upstream notices | Paper Apache-2.0 licence + NOTICE, Unbounded OFL, both in item |
| Current advisory snapshot | See [docs/G5A_SECURITY.md](docs/G5A_SECURITY.md) |

No hard stop was triggered: source and evidence were preserved before the new
worktree was created.

---

## CHANGESET

### Product item — canonical source

`registry/nullworx/living-type-01/`

| File | Role |
| --- | --- |
| `living-type.tsx` | Client component, props, fallbacks, context-loss recovery, material mount |
| `living-type.module.css` | Scoped visual system, three presets, fallback/error/retry states |
| `living-type-font.css` | Embedded Unbounded ASCII WOFF2 data URI + `@font-face` |
| `living-type-recipe.ts` | Presets, recipe builder/validator/serialiser, canonical JSON |
| `living-type-mask.ts` | Font readiness, content-addressed mask key, Canvas 2D rasteriser, DPR/resize handling |
| `living-type.recipe.example.json` | Valid recipe fixture |
| `living-type.recipe.schema.json` | JSON Schema 2020-12 |
| `README.md` | Customer usage, props, limits, install, browser requirements |
| `THIRD_PARTY_NOTICES.md` | Dependency, font and source-licence provenance |
| `PAPER_SHADERS_LICENSE.txt`, `PAPER_SHADERS_NOTICE.txt` | Apache-2.0 licence + required notice |
| `UNBOUNDED_OFL.txt` | Font licence and copyright |

### Distribution and demo

- `registry.g5a.json` — separate one-item manifest; the shared UI Forge index
  remains exactly three items.
- `public/r/living-type-01.json` — generated installable item (12 files).
- `app/living-type/page.tsx` + `components/living-type-demo/*` — customer demo
  and noindex paused-recipe evidence route.
- `scripts/g5a/*` — consumer setup, browser suite, recipe round-trip, demo
  interactions and headed performance measurement.
- `scripts/living-type-contract.ts` — 45 non-browser contract checks.
- `scripts/registry.mjs` — validates both manifests and keeps the UI Forge index
  at three items.
- `third_party/unbounded/*` — original WOFF2, ASCII subset, OFL, provenance.
- `README.md`, `THIRD_PARTY_NOTICES.md`, `docs/G5A_*` — product/hand-off docs.
- G3-A.1 harness files copied as described in Gate 0.

No existing UI Forge component file was edited. `public/r/registry.json` remains
the three-item UI Forge index. No PR #1/#3/#4 was modified.

### Installable item

- One item: `living-type-01`, type `registry:block`.
- 12 files installed under `components/living-type-01/` (or
  `src/components/living-type-01/` when the consumer CLI resolves a `src` dir).
- One runtime dependency: `@paper-design/shaders-react@0.0.82`.
- No Tailwind, global CSS, CSS variables, reset or `registryDependencies`.
- Install command:
  `npx shadcn@4.23.0 add http://127.0.0.1:3102/r/living-type-01.json --yes`

---

## GATE 1 — EDITABLE WORDMARK

### Public API

`<LivingType>` accepts either a complete recipe or convenience props:
`text`, `preset`, `paused`, `reducedMotion`, `weight`, `fit`, `tracking`,
`aspect`, `colors`, `material`, `className`, `style` and
`onRendererStateChange`. A complete recipe wins over convenience config;
`paused`/`reducedMotion` remain explicit runtime overrides.

Supported text is validated, not sanitised silently:

- One line, maximum 24 characters.
- `A–Z`, `a–z`, `0–9`, space, `.`, `&`, `'`, `!`, `?`, `+`, `-`, `/`.
- No Unicode, SVG, HTML, CSS values, scripts or event attributes.
- Invalid input produces a recipe error; the component never injects the text as
  markup. The demo keeps the last valid preview and explains the rejection.

Font configuration is the pinned family/version plus weight, fit and tracking.
The family is intentionally fixed to the self-hosted Unbounded subset; custom
families are documented as unsupported in this build. The frame aspect is a
recipe control (2–5; demo 2.2–4.4). Consumer size is responsive through the
parent width; the component owns its aspect ratio.

### Mask identity and cache fix

The mask key is a JSON array of:

- mask algorithm revision
- text
- font family
- font version
- weight
- fit
- tracking
- aspect ratio
- raster width
- raster height
- effective pixel ratio (capped at 2)
- font status (`loaded`/`fallback`)

It does **not** depend on a component id or only `mask.id`. A completed mask is
accepted only when its key equals the current request. While a new key is
pending, the mask layer is hidden and has no mask URL. A task runs only after a
90 ms debounce; a new key aborts the previous controller and is serialised
through a single reusable offscreen canvas. Font loading is explicit, timed out
at 1.8 s to fallback, and upgraded if the font arrives late. Object URLs are
revoked when the mask is replaced or the component unmounts. A matching earlier
key may be reused, which is correct content reuse, not a stale mask.

### Verification

- 30 rapid edits: final text correct, `staleReady=0`, zero new canvas
  allocations, zero new WebGL contexts, one shader canvas.
- Text `NULLWORX` → `ATLAS/01` changes the mask key and visual, without
  remounting the material (canvas marker survives).
- 24-character `ABCDEFGHIJKLMNOPQRSTUVWX` fits; ink bbox remains inside the
  frame and the boundary check reports no clipping.
- The same behavior passes full Chromium, Firefox and WebKit runs for both
  consumers.
- Aspect/weight/tracking/fit changes recompute the mask; colour/material edits do
  not. The demo colour edit keeps the mask key and canvas marker, and changes the
  visual.

---

## GATE 2 — PORTABLE FONT AND STYLING

- Font: **Unbounded Variable 5.3.0**, sourced from the official Fontsource
  latin variable WOFF2, subset to ASCII (`U+0020–007E`) with fontTools
  `pyftsubset`. Original WOFF2 SHA-256
  `22f9b928…f2289fd6`; embedded subset SHA-256
  `3e99d242…4721d2b`. Full OFL and copyright are installed.
- Asset transport: the shadcn registry carries text files, not decoded binaries.
  The 27 KB subset is embedded as a base64 WOFF2 in `living-type-font.css`
  (36,582 CSS bytes). This is documented, not a hidden workaround. No font CDN,
  no external font request, no font npm dependency.
- Styling: one CSS Module, scoped, no global reset, no `:root`, no `@import`, no
  Tailwind. The only global rule is the item's own `@font-face` in its required
  font CSS.
- Portability: the component imports only React, Paper, its local CSS/font CSS
  and two local TS modules. No `next/font`, `next/*`, Nullworx global CSS,
  `@/lib` alias, route, lab or editor dependency.
- Accessibility: the wordmark is real DOM text in a visually hidden node. The
  canvas, mask and static fallback visual are `aria-hidden`. The accessibility
  tree contains the word exactly once. Reduced motion follows the OS and stops
  the Paper loop. Context loss shows a static fallback and an accessible retry.
- Font failure: Chromium with `--disable-remote-fonts` yields
  `data-font-state=fallback`; the shader/mask still render with system type.
- CSS mask failure: a feature test (`mask-image`/`-webkit-mask-image`) routes to
  a static fallback instead of exposing an unclipped shader rectangle.
- WebGL2 failure: explicit static fallback, no canvas, no fake gradient.

Pass evidence: both clean consumers build and render with no Nullworx website.
The source in the demo is the same registry file; the installed files are
byte-identical in both consumers (12/12 source parity).

---

## GATE 3 — SOURCE-FIRST EXPORT

### Registry approach

The existing shadcn registry infrastructure is used for source distribution.
The shared repository index feeds the preserved three-component UI Forge gallery,
which assumes `ComponentName` is exactly one of those three. Adding the G5-A
block to that index broke the gallery prerender. The scoped solution is:

- `registry.json` remains the three-item UI Forge index.
- `registry.g5a.json` contains only `living-type-01`.
- The build writes `public/r/living-type-01.json`; the public UI Forge index
  remains three items.
- Consumers install the item by direct URL, not by a shared search index.

This limitation is documented. It preserves the original foundation rather than
editing its gallery assumptions.

### Consumer evidence

Both consumers are outside the Nullworx source tree:

- Next: `/home/swirky/Documents/deepseek-harness/default-workspace/g5a-consumers/next`
- Vite: `/home/swirky/Documents/deepseek-harness/default-workspace/g5a-consumers/vite`

Commands/evidence:

```sh
npx shadcn@4.23.0 add http://127.0.0.1:3102/r/living-type-01.json --yes
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run build
```

Results:

| Consumer | Install | Frozen install | Typecheck | Build | Installed source parity |
| --- | --- | --- | --- | --- | --- |
| Next 15.5.28 / React 19.1.10 | 12/12 files | pass | pass | pass | 12/12 byte-identical |
| Vite 8.3.5 / React 19.1.10 | 12/12 files | pass | pass | pass | 12/12 byte-identical |

The Next consumer's global CSS sentinel is unchanged. The Vite consumer has no
Next runtime and resolves `@` to its own `src`. No undeclared package, source
directory, alias, style or asset is required. The Vite consumer uses a standard
`vite-env.d.ts` for CSS Module types; that is a consumer-template requirement,
not a hidden item dependency.

### Installer finding (critical)

`shadcn@3.0.0` (the preserved root dev dependency) transforms every installed
file as TSX. In a clean install it stripped comments, mangled Markdown
apostrophes, and changed `join(" ")` to `join("")`. That would have broken the
class-name join and documentation. The fix is to install G5-A with
`npx shadcn@4.23.0`, which preserved all 12 files byte-for-byte. The root UI
Forge CLI/dependency and its 3.0.0 install string are untouched; the product
README states the 4.23.0 minimum.

### Packaging limitation

The registry has no decoded binary-asset transport. The single required asset
(font) is embedded and documented; all code, styles, recipes, schema, docs and
licences are transported as text. No npm publication or public registry
admission was performed.

---

## GATE 4 — RECIPE REPRODUCIBILITY

- Schema: `nullworx` Living Type recipe, schema version **1.0.0**, effect id
  `living-type-01`, effect version **1.0.0**, recipe `id`/`version`, pinned font
  family/version.
- Example: `living-type.recipe.example.json`; JSON Schema:
  `living-type.recipe.schema.json`.
- Strict validation rejects unknown fields, unsupported schema/effect/font
  versions, non-hex colours, out-of-range material parameters, unsupported
  Unicode/markup, leading/trailing spaces and overlong text with path-specific
  errors. A canonical object is rebuilt; no arbitrary object is spread into CSS.
- Configuration, static capture and animation are separated: the recipe has no
  time value; paused mounts use Paper frame 0; animated output is live. There is
  no frame-perfect animation replay claim.
- 45/45 contract checks pass.
- Paused round-trip against the demo's saved recipe:
  - Export → import → mount A and reload/mount B.
  - Settings/attributes exactly equal (`data-text`, preset, paused, reduced,
    mask key, mask dimensions, renderer, stage size).
  - Visual comparison: max channel delta **1**, **13 / 276,480** pixels changed,
    visually equivalent under the same browser/font/viewport.
  - No console errors or failed requests.

Artifacts: `docs/g5a/evidence/recipe-roundtrip.json`,
`docs/g5a/evidence/recipe.json`, `docs/assets/g5a/recipe-paused.png`.

---

## GATE 5 — REAL CONSUMER VERIFICATION

### Browser matrix

| Engine | Version | Checks | Result |
| --- | --- | ---: | --- |
| Chromium | 156.0.8078.47 | **137/137** | PASS |
| Firefox | 157.0 (Playwright) | **124/124** | PASS |
| WebKit | 27.2 (Playwright WebKitGTK) | **124/124** | PASS |

Full mode in all three engines, both Next and Vite consumers. Chromium additionally
runs no-WebGL2, no-CSS-mask, blocked-font and heap-bound checks. Firefox/WebKit show
WebGL2 and full shader rendering. Firefox emits expected context-lost warnings
during deliberate unmount/context-loss tests.

Covered: initial render; desktop/tablet/mobile; DPR2 mobile; 30 rapid text edits;
rapid presets; pause/resume; reduced motion; resize; 24-char fit; mask boundary;
mount/unmount; context loss; fallback; console/network/external requests;
accessibility tree; bundle/resource timing.

### Screenshots and motion

- Product demo desktop:
  [docs/assets/g5a/demo-desktop-1440.png](docs/assets/g5a/demo-desktop-1440.png)
- Product demo mobile:
  [docs/assets/g5a/demo-mobile-390.png](docs/assets/g5a/demo-mobile-390.png)
- Preset sheet:
  [docs/assets/g5a/preset-comparison-sheet.png](docs/assets/g5a/preset-comparison-sheet.png)
- Clean Next consumer:
  [docs/assets/g5a/consumer-next-desktop.png](docs/assets/g5a/consumer-next-desktop.png)
- Clean Vite consumer:
  [docs/assets/g5a/consumer-vite-desktop.png](docs/assets/g5a/consumer-vite-desktop.png)
- Mobile DPR2 stage:
  [docs/assets/g5a/consumer-mobile-dpr2-stage.png](docs/assets/g5a/consumer-mobile-dpr2-stage.png)
- No WebGL2:
  [docs/assets/g5a/fallback-no-webgl.png](docs/assets/g5a/fallback-no-webgl.png)
- No CSS mask:
  [docs/assets/g5a/fallback-no-css-mask.png](docs/assets/g5a/fallback-no-css-mask.png)
- Font failure:
  [docs/assets/g5a/fallback-font.png](docs/assets/g5a/fallback-font.png)
- Context lost:
  [docs/assets/g5a/fallback-context-lost.png](docs/assets/g5a/fallback-context-lost.png)
- Motion demonstration (7.0 s WebM):
  [docs/assets/g5a/living-type-01-motion.webm](docs/assets/g5a/living-type-01-motion.webm)

### Lifecycle / resources

- One shader canvas, one reusable offscreen mask canvas.
- Five unmount/remount cycles: live contexts return to 0 and 1; no leak.
- 30 rapid edits: zero new canvases/contexts.
- Heap ~6–8 MB after cycles; no unbounded growth (Chromium only).
- Object URLs revoked on replacement/unmount.
- Paused and reduced-motion stills are stable; rAF calls stop.
- No application console errors, page errors, failed requests or external
  requests in the final full browser runs.

### Performance

Headed, same browser/viewport/display, NVIDIA RTX 4060, 143 Hz display target:

- Baseline G3-A.1 D median frame interval **7.0 ms**.
- Exported D-equivalent median **7.0 ms**.
- **0.0% median regression**; no sustained long frames; zero frames >50 ms in
  the final three-round run.
- One earlier exported round had a single 51.4 ms frame; recorded, not sustained.
- These are rAF frame intervals, not GPU frame time; no 60/120/143 fps claim.

Full detail: [docs/G5A_PERFORMANCE.md](docs/G5A_PERFORMANCE.md).

### Bundle weight

- Next consumer: 197.5 KB JS transfer (including ~83 KB lazy Paper chunk),
  30.0 KB CSS; route first-load JS 111 KB.
- Vite consumer: 75.0 KB JS transfer (including ~8.5 KB lazy Paper chunk),
  29.5 KB CSS.
- 36.6 KB CSS is the embedded font; no font request. Registry item JSON 139 KB
  includes source/docs/licences/font.
- Acceptable for a WebGL wordmark; not a minimal text-only component.

### Preserved foundation

Against the same G5-A build:

| Check | Result |
| --- | --- |
| UI Forge gallery | 43/43 |
| G2 effects lab | 62/62 |
| G3-A composition | 149/149 |
| Effect contract | 24/24 |
| Composition contract | 26/26 |
| Lint / typecheck / production build / registry validation | pass |
| UI Forge component source edits | none |

---

## GATE 6 — PRODUCT QUALITY

Demo route: `/living-type` (noindex, unlinked from the preserved gallery).

The demo includes:

- A distinctive default: near-black Night Bloom wordmark with live Paper
  material inside the glyphs, a soft field halo and a slight sheen.
- Three curated directions: Night Bloom (dark/violet/apricot/cyan, 700 weight),
  Kiln (warm paper, fired earth, 800 weight, coarse grain), Low Tide (sea-glass
  paper, cold teal/cobalt, 400 weight, wide tracking). They differ in type
  metrics, aspect, motion, grain and palette — not just recolouring.
- Live text, weight, aspect, fit, tracking, four colours, speed, distortion,
  swirl, grain, scale, rotation, pause/resume, reduced motion and preview width.
- Validated export (copy/download), validated import and reset.
- No pricing UI, checkout, testimonials, customer counts, sales activation or
  fake approvals. Everything is marked EXPERIMENTAL / OWNER_REVIEW.
- The exported component itself needs no Nullworx chrome; the demo is a
  consumer-facing shell around the same installed source.

The product story is honest: the shader is the ink; the type is the page. It
does not claim chrome, glass or liquid metal.

---

## HOSTILE REVIEW — FOOTGUNS

| # | Attack | Result |
| --- | --- | --- |
| 1 | Stale text masks | **PASS.** Content-addressed key; pending layer hidden; stale tasks aborted; 30-edit test. Same-key reuse is correct. |
| 2 | Font metric drift | **PASS.** Pinned embedded subset; Canvas letter-spacing path used in all engines; fallback state explicit. Cross-machine can still vary at the raster edge. |
| 3 | Next dependencies leaking into Vite | **PASS.** Clean Vite build/typecheck/render with no Next. |
| 4 | Missing CSS/assets | **PASS.** 12/12 source parity; no global injection; embedded font; CSS-mask fallback. |
| 5 | GPU/context loss | **PASS.** Native context-lost capture, static fallback, retry, recovery; tested in Chromium full and in Firefox/WebKit lifecycle. |
| 6 | Canvas memory growth | **PASS.** Reused offscreen canvas; 30 edits create no canvas/context; 5 cycles release contexts; heap bounded. |
| 7 | Misleading deterministic export | **PASS.** Docs/schema explicitly separate config and paused still from animated output. |
| 8 | Reduced motion | **PASS.** OS media query + force; rAF stops; stable stills; all engines. |
| 9 | Invisible/repeated accessible text | **PASS.** One accessible wordmark; ARIA-hidden visual; fallback accessible; status role. |
| 10 | Unsupported Unicode | **PASS.** Rejected with explicit errors; no silent transliteration; markup creates no node. |
| 11 | Mask edge leakage | **PASS.** 3,704 fully transparent outside samples, 0 violations, max delta 2/255 (capture/AA noise); no clipping. |
| 12 | Third-party licence omissions | **PASS with owner decision.** Paper Apache-2.0 + NOTICE; Unbounded OFL; source licence unassigned and disclosed. |
| 13 | Different source/preview visuals | **PASS.** Demo imports the registry source; installed files byte-identical 12/12 in both consumers. |
| 14 | Hidden Nullworx dependency | **PASS.** No Next/`@/lib`/global/lab dependency; direct item. |
| 15 | Excessive bundle weight | **PASS with note.** 197.5 KB Next / 75 KB Vite JS transfer; 30 KB CSS incl. font. Not minimal, justified by WebGL. |
| 16 | Generic-looking presets | **PASS for technical differentiation; visual approval pending.** Three distinct treatments verified in the sheet. |

### Critical/High findings fixed in scope

- **H-01 (High, distribution):** shadcn `3.0.0` corrupted every installed file
  as TSX (`join(" ")` → `join("")`, stripped comments, mangled Markdown).
  Fixed by installing with `npx shadcn@4.23.0`; all 12 files preserved in both
  consumers. Root UI Forge CLI left untouched.
- **H-02 (High, fallback):** unsupported CSS `mask-image` could expose the full
  shader rectangle. Fixed with a feature test and static fallback; Chromium
  no-mask test passes.
- **H-03 (High, portability):** binary font transport was not directly
  supported. Fixed with a documented embedded OFL subset; licence/provenance
  included; CSP caveat documented.
- **H-04 (Medium):** DPR-only changes were not observed by resize alone. Added a
  `matchMedia("(resolution: …dppx)")` listener and mobile DPR2 evidence.
- **H-05 (Medium):** no-WebGL path was already explicit; added dedicated
  no-WebGL, no-mask, font-failure and context-loss checks to the product suite.

### One targeted hostile re-review

After the fixes above, the same attacks were re-run. Final results:
Chromium **137/137**, Firefox **124/124**, WebKit **124/124**, recipe round-trip
pass, demo interactions 12/12, preserved foundation 43/62/149 pass. No remaining
Critical or High technical failure was found within G5-A scope.

Residual risks are owner decisions or documented limits: source licence,
visual approval, registry hosting/index policy, strict-CSP font delivery, and
the fact that rAF cadence is not GPU frame time.

---

## KNOWN LIMITATIONS

1. **Source licence:** Nullworx-authored source has no assigned project licence.
   Local verification is allowed by the owner task; public redistribution needs
   an owner licence decision.
2. **Visual approval:** technical acceptance is not visual approval. The owner
   must approve the three presets and default.
3. **Registry index:** the item is not in the shared UI Forge index; it installs
   by direct item URL. This preserves the existing three-item gallery.
4. **Font scope:** ASCII subset only; no multilingual typography, custom font
   families, SVG/HTML type or arbitrary CSS. Recipes pin the family/version.
5. **CSP:** an embedded `data:` font can be blocked by a strict `font-src`; the
   component falls back, but strict-CSP deployments should self-host the WOFF2.
6. **Animation determinism:** paused stills compare; animations are live. No
   frame-perfect replay claim.
7. **Performance metric:** headed comparison is rAF frame-interval cadence, not
   GPU frame time. No display-refresh or FPS claim.
8. **Installer:** shadcn 4.23.0+ required for this item; 3.0.0 corrupts files.
9. **No deployment/npm/public registry:** not performed.
10. **One item:** no effect marketplace, editor, compositor, video/PNG export or
    uploader.

---

## ROLLBACK

See [docs/G5A_ROLLBACK.md](docs/G5A_ROLLBACK.md). The G3-A source worktree
remains untouched at the verified HEAD.

---

## FINAL VERDICT

**`G5A_READY_FOR_OWNER_REVIEW`**

The one installable composition is technically verified in clean Next and Vite
applications, in Chromium, Firefox and WebKit, with editable text, three
coherent presets, validated recipes, accessible text, responsive sizing,
pause/reduced motion, explicit fallbacks and a measured headed median
frame-interval regression of **0.0%** against the G3-A.1 D baseline.

This is not visual approval and not a publication decision. The owner should
review the preset sheet and motion clip, assign a source licence before public
distribution, and decide whether to host/index the registry item.
