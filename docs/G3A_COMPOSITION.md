# G3-A — Material × Mask composition proof

Status: experimental proof on `feat/g3a-composition-proof`. No merge, deploy,
registry publication or export pipeline.
Route: `/labs/composition` (`noindex`, not linked from the gallery or the G2 lab).
Base: G2.1 commit `2d7d59e` on top of G2 HEAD `07f91b5`.

## Goal

Prove that two existing visual materials can be applied to two different masks
through reusable contracts, without a renderer branch per combination.

| | HoloType (`holotype-foil`) | Paper Shaders MeshGradient (`paper-mesh-gradient`) |
| --- | --- | --- |
| **Moth silhouette** (`nullworx-moth`) | **A** — native `HoloGlyph` with the mask paths | **B** — unmodified upstream canvas behind a container CSS alpha mask |
| **NULLWORX wordmark** (`nullworx-wordmark`) | **C** — native `HoloText` with live DOM text | **D** — unmodified upstream canvas behind a canvas-rasterized text alpha mask |

All four are mounted from the same `MaskDefinition` data. The material surface
is keyed by material family, not by recipe.

## Contracts

`lib/composition/types.ts` defines four contracts, separate from renderer
internals:

- **`MaskDefinition`** — id/version, kind (`svg-path` or `text`), geometry,
  explicit viewBox width/height and `preserveAspectRatio`, aspect ratio, fit
  (`contain`), alignment (`center`), alpha mode (`binary`), unsupported
  behaviour, notes, licence and provenance.
- **`MaterialDefinition`** — embeds the existing `EffectDefinition` (so status,
  technology, parameter schema/defaults, capabilities, licence and provenance
  are the same objects), plus the mask capability and the surface family.
- **`CompositionRecipe`** — mask and material references with versions, material
  params, and playback state. Params are validated by the material's own
  `EffectDefinition.params` schema.
- **Compatibility** — `checkCompatibility(mask, material)` is one rule: the
  material must advertise the mask kind. `validateRecipe` resolves ids and
  versions, applies that rule and parses params; `validateRecipeSet` also
  rejects duplicate recipe ids.

The contracts contain no React components, DOM nodes, shader source or
combination ids.

## Architecture

```
app/labs/composition/page.tsx                  noindex route
components/labs/composition/
  composition-lab.tsx                          selectors, params, presets, capability panel
  surface-registry.ts                          material family -> one surface
  surfaces/holotype-surface.tsx                HoloGlyph / HoloText adapter
  surfaces/paper-surface.tsx                   upstream MeshGradient + CSS mask
  surfaces/use-text-fit.ts                     DOM wordmark fit
lib/composition/
  types.ts / schemas.ts                        contracts + runtime validation
  masks.ts                                     original moth + wordmark definitions
  materials.ts                                 two materials, existing effects embedded
  recipes.ts                                   A–D preset data
  compatibility.ts                             resolution, compatibility, recipe sets
  mask-image.ts / use-mask-image.ts            canonical SVG or canvas mask source
fixtures/composition/                          valid and invalid recipe fixtures
scripts/composition-contract.ts                structural checks
scripts/verify-composition.mjs                 browser, boundary and performance checks
```

The only renderer-adjacent branches are:

1. `HoloTypeSurface` chooses `HoloText` or `HoloGlyph` because those are the two
   public interfaces of the material. This is a mask-type adapter, not a
   material × mask combination branch.
2. `PaperSurface` has no mask-kind branch. It consumes the canonical mask image
   for both kinds.
3. `CompositionLab` chooses the control set from `material.surface`; the stage
   uses `MATERIAL_SURFACES[material.surface]` and a single generic surface.

## Mask handling

- **Coordinate system**: viewBox origin is always `0 0`; width/height are
  explicit user units (`400×260` for the moth, `1200×240` for the wordmark).
  `preserveAspectRatio="xMidYMid meet"` is stored and used in the SVG source.
- **Aspect policy**: the stage's CSS `aspect-ratio` is the mask aspect. The CSS
  mask uses `mask-size: contain`, `mask-position: center`, `mask-repeat:
  no-repeat`, so an unexpected container aspect letterboxes instead of
  stretching. The moth is `1.538:1`; the wordmark is `5:1`.
- **Alignment**: both the stage and the mask are centred. The vector mask and
  the canvas mask share the same viewBox centring.
- **Alpha**: binary alpha, white shapes on transparency, consumed with
  `mask-mode: alpha`. No luminance mask is implemented.
- **Unsupported mask types**: rejected by `validateRecipe` before mount. The lab
  renders a rejection panel; it never substitutes another shape. A constrained
  material that advertises only `svg-path` is a contract test fixture.
- **SVG safety**: path data is validated against an SVG-path-only character
  grammar. The generated SVG has no `<script>`, `<image>`, external `href`,
  `url()` or HTML. The wordmark is restricted to uppercase/digits/space/dot/
  hyphen in the schema, even though the route only uses the fixed string.
- **No external media or network**: both masks are generated locally (SVG data
  URL or canvas PNG data URL). There is no runtime fetch.
- **Reduced motion**: OS `prefers-reduced-motion` or the lab's force toggle sets
  HoloType to its `reduced` motion mode with `animated=false`, and Paper to
  `speed: 0` (upstream static frame). Pause does the same without changing the
  reduced-motion preference.
- **Typography**: the wordmark uses the existing `next/font` Geist variable.
  `HoloText` renders live DOM text; the Paper mask is rasterized locally on a
  Canvas 2D at 2× the mask viewBox with the same resolved family, weight and
  90% fit. The lab reports whether the Geist variable was resolved and whether
  the font probe loaded. If the font is unavailable, the declared system
  fallback is used and the limitation is reported, not hidden. No font file is
  vendored and no rasterization service is called.

## Provenance and licensing

- **Moth**: original primitive geometry authored for G3-A
  (`lib/composition/masks.ts`). It is not traced from the licensed Living
  Stencils moth and contains no photograph or third-party SVG. Treated as
  owner-authored, redistribution-restricted until the owner assigns a licence.
- **Wordmark**: original live text using the existing Nullworx Geist font
  variable. No font file is added.
- **HoloType**: unchanged byte-for-byte from the captured Expansion 02 import;
  `REVIEW_PENDING`, redistribution-restricted. It remains lab-only and is not a
  registry item.
- **Paper Shaders**: upstream `@paper-design/shaders-react@0.0.82` /
  `@paper-design/shaders@0.0.82`, Apache-2.0. No source is vendored or modified;
  the NOTICE and licence text remain in `third_party/paper-shaders*`.
- **Motion** is not part of the G3-A matrix; the G2 adapter is unchanged.

## Export capability

The only truthful export statement is source-level React reuse
(`react-component`). G3-A does not implement PNG, video, shader or mask export.
The mask data URL is an internal browser source, not a user-facing asset.

## Verification

Structural:

```sh
pnpm verify:composition-contract
```

Browser (production build):

```sh
pnpm build
pnpm start --hostname 127.0.0.1 --port 3100
EVIDENCE_DIR=evidence/g3a pnpm verify:composition
```

The browser harness checks all four presets at 1440×900 and 390×844, reduced
motion on/off, paused and animated states, repeated switching, repeated
mount/unmount, resize and navigation. It compares the canonical mask alpha with
composited stage pixels at known inside/outside sample points and compares the
content bounding box with the mask bounding box. It records screenshots,
console/network logs, WebGL context counts, rAF activity, frame-time
distributions, heap and the renderer string.

Results are recorded in `evidence/g3a/` and summarized in the G3-A report.

## Known gaps

- Chromium-only evidence; Firefox/WebKit are unverified.
- WebGL runs on the host's software renderer (SwiftShader in the evidence
  environment). No GPU-backed 60 fps claim is made.
- HoloType's native depth/edge treatment is not pixel-identical to a CSS mask;
  boundary checks allow a small native-edge tolerance and document it.
- Canvas text rasterization depends on the browser's Canvas 2D implementation;
  the wordmark's glyph outlines can differ slightly across platforms even with
  the same font file.
- The moth is a proof silhouette, not a final brand asset.
- No 3×3 expansion, OGL/PixiJS/Three.js, export pipeline, node editor or
  registry publication is implemented.

## Rollback

```sh
git switch feat/forge-foundation-g2
git branch -D feat/g3a-composition-proof   # local only
# remote, if a stacked draft PR exists:
git push origin --delete feat/g3a-composition-proof
```

No data migration, deployment, package publication or production state is
involved. G2.1 is an independent commit and can be reverted without touching
G3-A.

## Visual review

1. Run the production build and open `/labs/composition` at 1440×900.
2. Click presets A–D. Each should show a visible moth or wordmark with the
   material's texture inside the silhouette; outside is the flat stage.
3. Toggle Pause: the material should stop; Resume restarts it.
4. Enable Force reduced motion: the stage should show a static frame and the
   effective state should read `REDUCED`.
5. Resize to 390×844: no horizontal scroll; the stage keeps the mask aspect.
6. Switch mask while Paper is mounted: the shader should stay the same material
   and the silhouette should change, without a full page reload.
7. Check the capability panel: mask kind, viewBox, mechanism, mask source,
   font state and compatibility message should describe the current pair.

## Results (2026-10-29, Europe/Stockholm)

### Structural

- `pnpm verify:composition-contract`: **26/26**.
- Valid fixtures: 4/4 accepted; invalid fixtures: unknown mask, unknown material,
  version mismatch, invalid params, malformed structure and duplicate-id set all
  rejected with the expected code.
- Constrained-material test: a Paper material advertising only `svg-path` rejects
  the wordmark recipe with `unsupported-mask-kind`.
- HoloType source: 8/8 files byte-identical to `docs/import-manifest.json`.
- Runtime dependencies: unchanged (13); no OGL, PixiJS or Three.js.

### Browser

Production build, Chromium 156 via playwright-core, system Chrome, 1440×900 and
390×844, reduced motion on/off, paused and animated, 20 repeated preset
switches, 5 cross-route unmount cycles, resize 1440→1024→390→1440.

`pnpm verify:composition`: **149/149**, 0 failed, 0 application console errors,
0 page errors, 0 failed requests, 0 external requests, 0 horizontal overflow.

A mask-only switch with Paper mounted keeps the same canvas element and creates no
additional WebGL context (`created 2 → 2`, `live 1`, `sameCanvas: true`). The
material is not remounted when only the mask changes.

Boundary method: pause the material, capture the stage, hide the material surface,
capture the empty stage, compare composited pixels at eroded inside / dilated
outside mask samples. This does not assume the material's colours.

| Preset | Inside samples visible | Mean inside delta | Outside violations | Max outside delta | Mask / content Y bbox |
| --- | ---: | ---: | ---: | ---: | --- |
| A moth × HoloType | 95.6% | 157.6 | 0 | 5 | 0.039–0.853 / 0.042–0.854 |
| B moth × Paper | 100% | 232.8 | 0 | 0 | identical |
| C wordmark × HoloType | 100% | 120.2 | 0 | 3 | 0.189–0.800 / 0.203–0.797 |
| D wordmark × Paper | 100% | 168.9 | 0 | 0 | identical |

Mobile B and D, and the post-resize D check, also pass with 0 outside
violations. The non-zero outside deltas for HoloType (5 and 3 of 255) are its
native depth/edge treatment on the flat stage, below the documented 9/255
tolerance; they are not material outside the silhouette.

Screenshots: `evidence/g3a/screenshots/` — four desktop stage captures, four
mobile stage captures, reduced-motion capture, two full-page desktop captures
(moth and wordmark) and a full-page mobile capture.

### Resources and performance

| Measure | Result |
| --- | --- |
| WebGL renderer | ANGLE / Vulkan 1.3 SwiftShader (software) |
| Contexts over 20 preset switches | created 20, lost 20, live 0 at the end |
| Max simultaneous live contexts | 1 |
| Heap after five 4-preset cycles | −0.08 MiB final run (−0.86 MiB earlier); bounded |
| DOM nodes after 20 switches | 254 → 255 |
| HoloType moth (final run) | 60.0 fps median, 16.7 ms median, 16.8 ms p95, 0 frames >50 ms |
| HoloType moth (earlier run) | 42.6 fps median, 16.7 ms median, 33.4 ms p95, 2 frames >50 ms |
| Paper moth | 60.0 fps median, 16.7 ms median, 16.8 ms p95, 0 frames >50 ms |
| Composition route bundle | 540,883 bytes (493,731 JS + 47,152 CSS) |
| vs `/labs/effects` | +86,124 bytes (+62,373 JS, +23,751 CSS) |
| vs `/` | +99,021 bytes |

No GPU-backed 60 fps claim is made. The final SwiftShader run held 60 fps for both
materials, but an earlier run measured HoloType at 42.6 fps on the same host. That
variance is recorded rather than averaged away; Paper held the display cadence in
both runs.

## Hostile review log

| Severity | Finding | Resolution |
| --- | --- | --- |
| HIGH | HoloType wordmark sat ~6.8% of the stage height above the canvas mask; two dilated outside samples saw 245/255 material spill. | **Fixed.** The text mask now centres the actual ink bounding box (`actualBoundingBoxAscent/Descent`) instead of the em box. Re-verified: 0 outside violations, content/mask bbox within 1.4%. |
| MEDIUM | The font probe reported "not confirmed" although Geist was rendered, because next/font's synthetic `Geist Fallback` face has status `error` and `document.fonts.check` on the full stack returns false. | **Fixed.** Probe the first family only (`"Geist"`); the capability panel now reports `Geist variable · loaded · weight 600`. |
| MEDIUM | Next 15.5.28 emitted an unused CSS preload warning on the G2 lab because in-viewport links prefetched the gallery route. | **Fixed in G2.1.** Both lab links use `prefetch={false}`; the zero-warning gate is unchanged. |
| MEDIUM | HoloType's native depth/shadow is visible a few pixels outside the nominal glyph alpha on a light background. | **Measured and bounded.** On the dark stage the maximum outside delta is 5/255; the check allows 9 and reports 0 violations. Documented as native material edge treatment, not compositor spill. |
| LOW | Text mask is rasterized at 2×; no vector text export. | Documented. The mask is an internal browser source, not an export format. |
| LOW | A hidden 1×1 `<img>` mask reference ships in the lab HTML for boundary evidence. | Documented as lab instrumentation; it is not user-facing, not linked, and adds no network request. |
| LOW | Chromium and SwiftShader only. | Documented; no cross-browser or GPU claim. |
| LOW | Four WebGL driver `ReadPixels` warnings during screenshots. | Classified as capture-induced and recorded separately; 0 application console warnings. |
| LOW | Bundle delta +86 KiB versus `/labs/effects`. | The route mounts both materials and their lab CSS; no new dependency was added. Reported for the owner's decision. |
| LOW | `zod@3.25.76` carries an audit high for oversized constrained collections. | Not reachable: schemas accept fixed enums and bounded numbers from local state, with no network input. A zod 4 migration is a separate decision. |
