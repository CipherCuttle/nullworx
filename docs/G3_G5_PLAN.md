# G3–G5 proposed expansion plan (design only)

No G3–G5 code is implemented in this pass. This plan is constrained by the G0–G2 evidence:
one existing effect (HoloType) is review-pending, two upstream libraries are pinned, and the
only verified performance data is Chromium/SwiftShader.

## G3 — Material × Mask × Motion composition

### Goal

Compose 3 masks × 3 materials × 2–3 motion recipes without a renderer switch per
combination.

### Proposed contracts (separate from `EffectDefinition`)

- `MaskDefinition` — stable ID/version, mask source (`svg-path`, `alpha-image`, `text`),
  intrinsic aspect, safe-area rule, contrast/luminance behaviour, provenance/license.
- `MaterialDefinition` — stable ID/version, renderer technology, a **mask capability**
  (`none`, `css-mask`, `texture-alpha`, `geometry`), parameter schema, reduced-motion
  behaviour and provenance. Paper/WebGL materials expose a texture-alpha or CSS-mask
  capability; HoloType exposes CSS-text masking; they are not forced into one renderer.
- `MotionDefinition` — stable ID/version, timeline/phase, pause/reduced-motion semantics,
  and whether it drives CSS variables, a shader uniform, or a DOM transform.
- `CompositionRecipe` — references material/mask/motion IDs + versions, parameter overrides
  and a compatibility assertion. Validation rejects a recipe when the material does not
  advertise the mask mode.

### Proposed matrix (small, evidence-driven)

| Mask | Type | Material candidates |
| --- | --- | --- |
| Vector silhouette (hexagon/monogram) | SVG path | HoloType CSS, Paper MeshGradient (CSS mask), Motion surface |
| Text wordmark | DOM text | HoloType CSS, Motion surface |
| Alpha bitmap (licensed or original) | PNG/WebP alpha | Paper MeshGradient (texture alpha), optional Pearl Caustics |

Motion recipes: `still` (no animation), `sweep` (existing HoloType/specular behaviour),
`ambient` (Paper shader time). Avoid a third continuous animation until GPU evidence exists.

### G3 acceptance criteria

- 9 combinations mount/unmount without cross-imports or per-combination renderer branches.
- One recipe manifest validates all 9 combinations at runtime.
- Desktop/mobile screenshots for the full matrix; reduced-motion and resize checks.
- Each material keeps its own lifecycle and parameter schema.
- Performance is measured per material, not per combination; no universal 60 fps claim.

## G4 — OGL, PixiJS, Three.js additions

Only add a library when it supplies a capability the current set cannot:

- **OGL** (MIT) — a small WebGL2 full-screen pass for a custom material shader. Justify only
  if Paper Shaders' public components cannot express the required material; otherwise use
  Paper Shaders.
- **PixiJS** (MIT) — 2D scene graph, sprite batching, filters and text for multi-layer raster
  masks. Justify only for a genuine multi-object raster composition; not for a single
  full-screen gradient.
- **Three.js** (MIT) — real 3D geometry/camera/lighting. Justify only for a 3D mask or
  material; not for 2D typography or gradients.

For each addition, record exact version/integrity/license, SSR boundary, React 19
compatibility, bundle delta, context/leak test, reduced-motion behaviour and a
control-versus-candidate performance run. Do not add all three speculatively.

## G5 — React registry export and clean-room consumer

- Add lab effects to `registry.json` only after owner admission and a packaging decision.
- Registry items must declare runtime dependencies (`@paper-design/shaders-react@0.0.82`,
  `motion@14.7.1`) and any peer requirements; Paper Shaders' Apache NOTICE must travel with
  the distributed item or its documentation.
- Keep UI Forge's three items unchanged; add new items rather than rewriting existing ones.
- Clean-room consumers: Next.js and Vite, React 19, no gallery CSS, no Tailwind requirement
  for CSS-Module effects, and a real shadcn CLI install.
- Verify SSR/hydration, reduced motion, resize, repeated mount/unmount, console/network,
  desktop/mobile rendering and a license/notice audit.
- No publishing, deployment, marketplace or newsletter work in G5.

## Admission gates carried forward

1. Owner visual approval for HoloType (and any other effect) before stock admission.
2. A GPU-backed performance pass on the owner's hardware; the G2 numbers are software
   compositing only.
3. Firefox/WebKit pass if those browsers are in the support matrix.
4. License decision for the owner-authored source in this repository.
5. Media-rights verification for any non-CC0 asset; no Pexels media in a distributable pack
   without separate clearance.
