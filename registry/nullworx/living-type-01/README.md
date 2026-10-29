# NULLWORX / LIVING TYPE 01

**EXPERIMENTAL · OWNER_REVIEW · not published · no npm package · no public registry admission.**

One installable animated wordmark. Editable text, three art-directed Paper
Shaders treatments, validated recipes, accessible DOM text, and a static
fallback when WebGL2 is unavailable.

The type is the mask. The Material renders inside the letterforms — it is not a
gradient panel placed behind a heading.

## What is installed

The shadcn item `living-type-01` writes this folder to
`components/living-type-01/`:

| File | Purpose |
| --- | --- |
| `living-type.tsx` | The client component and its public props. |
| `living-type.module.css` | Scoped styling, presets, fallback, error and focus states. |
| `living-type-font.css` | Embedded Unbounded ASCII subset (WOFF2 data URI) and its `@font-face`. |
| `living-type-recipe.ts` | Presets, complete recipe builder, strict validator, serialiser. |
| `living-type-mask.ts` | Font readiness, content-addressed mask cache key, Canvas 2D rasteriser. |
| `living-type.recipe.schema.json` | JSON Schema 2020-12 for recipes. |
| `living-type.recipe.example.json` | Valid recipe fixture. |
| `README.md` | This file. |
| `THIRD_PARTY_NOTICES.md` | Dependency and fingerprint provenance. |
| `PAPER_SHADERS_LICENSE.txt` / `PAPER_SHADERS_NOTICE.txt` | Apache-2.0 license and required notice. |
| `UNBOUNDED_OFL.txt` | Font license and copyright. |

Runtime dependency installed by the registry:

- `@paper-design/shaders-react@0.0.82` (Apache-2.0)

The font is **not** an npm dependency and is **not** fetched from a CDN. An ASCII
subset of Unbounded Variable 5.3.0 is embedded as a WOFF2 data URI in
`living-type-font.css`. The shadcn registry transports text files, not binary
assets, so this keeps the install to one item while preserving the font licence
and exact provenance.

No Nullworx route, global CSS, `next/font`, `@/lib` alias, lab UI or composition
editor is required. The only aliases in sample imports are the consumer's own
component path.

## Install

```sh
npx shadcn@4.23.0 add <registry-url>/r/living-type-01.json --yes
```

For the local G5-A review build the registry is served at
`http://127.0.0.1:3102/r/living-type-01.json`. There is no public registry URL in
this task.

The CLI installs the source, docs, licences and the one runtime dependency. The
item does not inject global CSS, Tailwind, theme tokens or a reset. When the
consumer's `components.json` uses a `src/` directory, shadcn resolves the same
target under `src/components/living-type-01/`; both layouts are tested.

**Installer requirement:** use `shadcn@4.23.0` or newer. shadcn `3.0.0` parses
every installed file as TSX, which strips comments and can corrupt string
literals and Markdown (observed in G5-A: `join(" ")` became `join("")`).
`4.23.0` preserved all 12 files byte-for-byte in both consumers.

## Use

```tsx
"use client";

import { LivingType } from "@/components/living-type-01/living-type";

export function Wordmark() {
  return (
    <LivingType
      text="NULLWORX"
      preset="night-bloom"
      paused={false}
      reducedMotion="auto"
    />
  );
}
```

If your project does not use the `@/` alias, import the folder relatively:

```tsx
import { LivingType } from "./components/living-type-01/living-type";
```

The component fills its parent's width and owns its aspect ratio (from the
recipe). Wrap it in a width-constrained element to size it:

```tsx
<div style={{ maxWidth: 960 }}>
  <LivingType text="ACME" preset="kiln" />
</div>
```

### Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `recipe` | `LivingTypeRecipe` | — | Complete recipe. Takes precedence over convenience props. |
| `text` | `string` | `"NULLWORX"` | Up to 24 ASCII characters; see limits. |
| `preset` | `"night-bloom" \| "kiln" \| "low-tide"` | `"night-bloom"` | Art direction defaults. |
| `paused` | `boolean` | recipe value | Freezes the current shader frame. |
| `reducedMotion` | `"auto" \| "force"` | `"auto"` | `auto` follows the OS; `force` is static. |
| `weight` | `200–900`, step 100 | preset value | Self-hosted Unbounded Variable. |
| `fit` | `0.55–0.94` | preset value | Fraction of frame width used by the ink. |
| `tracking` | `-0.04–0.14` em | preset value | Applied in the canvas mask. |
| `aspect` | `2–5` | preset value | Frame width / height. |
| `colors` | `[hex, hex, hex, hex]` | preset value | Four `#RGB`/`#RRGGBB` shader colours. |
| `material` | partial material params | preset value | `speed`, `distortion`, `swirl`, `grainMixer`, `grainOverlay`, `scale`, `rotation`. |
| `className` / `style` | React values | — | Scoped wrapper styling. `aspect-ratio` is enforced from the recipe. |
| `onRendererStateChange` | callback | — | Observe `loading`, `shader`, `static-fallback`, `context-lost`, `mask-error`, `mask-unsupported`, `shader-error`. |

When `recipe` is present, its configuration wins. `paused` and
`reducedMotion` remain explicit runtime overrides.

### Presets

| Preset | Treatment |
| --- | --- |
| **Night Bloom** | Near-black field, ultraviolet/apricot/cyan currents, tight 700 display weight, soft bloom, restless movement. |
| **Kiln** | Warm paper field, fired earth palette, heavy 800 weight, low distortion and coarse grain. |
| **Low Tide** | Sea-glass paper field, cold teal/cobalt palette, light 400 weight, wide tracking and lateral drift. |

The presets differ in weight, tracking, frame ratio, material parameters,
grain and palette — not only hue.

## Recipes

A recipe stores **configuration**, not a timeline. It contains no time value.
Re-importing a recipe restores the same supported settings and, when mounted
paused, the same initial static frame under the same browser, font and viewport.
Animated output is live and is **not** a frame-perfect replay.

```ts
import {
  DEFAULT_LIVING_TYPE_RECIPE,
  createLivingTypeRecipe,
  parseLivingTypeRecipe,
  stringifyLivingTypeRecipe,
  updateLivingTypeRecipe,
} from "@/components/living-type-01/living-type-recipe";

const recipe = createLivingTypeRecipe({
  text: "ACME",
  preset: "kiln",
  paused: true,
  reducedMotion: "auto",
});

const json = stringifyLivingTypeRecipe(recipe); // includes a trailing newline
const loaded = parseLivingTypeRecipe(json);
if (!loaded.ok) {
  console.error(loaded.issues);
} else {
  // <LivingType recipe={loaded.recipe} />
}
```

Strict validation rejects unknown fields, unsupported schema/effect/font
versions, out-of-range values, non-hex colours and unsupported characters. The
validator rebuilds a canonical object; it never spreads arbitrary JSON into CSS.

### Limits

- Single line, Latin only: `A–Z`, `a–z`, `0–9`, space, `.`, `&`, `'`, `!`, `?`,
  `+`, `-`, `/`. Maximum 24 characters. No Unicode, SVG, HTML, CSS or JS.
- The font family and ASCII subset are pinned. Customer-supplied font families
  are not supported in this build, so cross-machine metric drift is limited to
  browser Canvas rasterisation differences.
- Recipes restore configuration and paused stills, not deterministic animation
  frames.
- WebGL2 is required for the Paper material. Without it, the component displays
  real static type and a status label; it does not fake the shader.
- CSS `mask-image` alpha support is required. If the feature test fails, the
  component shows the same real static fallback instead of an unmasked shader
  rectangle.

## Accessibility

- The readable wordmark is a visually hidden DOM text node, so assistive
  technology receives the actual word once.
- The canvas/mask/fallback visual layers are `aria-hidden`.
- Loading and fallback states use `role="status"`; recipe rejection uses
  `role="alert"`.
- `reducedMotion="auto"` follows `prefers-reduced-motion`. When reduced, the
  Paper loop is set to speed 0 and stops requesting animation frames.
- A lost WebGL context shows a static fallback and an accessible retry button.
- No keyboard interaction is required to use the effect. The only focusable
  control is the recovery button in an error state.

## Browser and runtime requirements

Tested on the G5-A evidence run:

- Chromium (system Chrome 156, hardware ANGLE/GL)
- Firefox (Playwright build)
- WebKit (Playwright WebKitGTK build)
- React 19.1.10, Next.js 15.5.28 and Vite + React 19
- WebGL2, Canvas 2D, CSS `mask-image` with `mask-mode: alpha`, `ResizeObserver`
- Node 20+ for the consumer build (evidence used Node 24.20.0)

The Paper package peer range is React 18/19; only React 19 was verified here.
CSS mask alpha is required for the effect. Check your target browser's support
before shipping; the fallback is not the shader.

## Font

Unbounded Variable 5.3.0, ASCII subset (U+0020–007E, variable weight 200–900),
is embedded in `living-type-font.css` as a WOFF2 data URI. The component imports
that CSS. No external font request is made and there is no font package
dependency. The full OFL licence is in `UNBOUNDED_OFL.txt`; the original and
subset SHA-256 hashes are recorded in the CSS header and
`THIRD_PARTY_NOTICES.md`. The subset was produced with fontTools `pyftsubset`
from the official Fontsource latin variable build. The upstream licence declares
no reserved font name; the family name is used unmodified.

## Performance notes

- Paper is dynamically imported after the component is on screen; the shader is
  not part of the first route chunk.
- The shader canvas is bounded with `minPixelRatio={1}` and
  `maxPixelCount={1_500_000}`.
- Mask rasters are capped at 4096 px wide and 2× effective DPR, debounced 90 ms,
  and serialised through one reusable canvas per component. Rapid edits abort
  stale tasks and hide the mask until the current key is ready.
- Object URLs are revoked when a mask is replaced or the component unmounts.

## License

Paper Shaders is Apache-2.0; required NOTICE included. Unbounded is OFL-1.1.
Nullworx-authored source has **no assigned project license** in this
experimental build and is provided for owner review/local verification only.
See `THIRD_PARTY_NOTICES.md` and the license files.
