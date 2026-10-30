# Third-party notices

Nullworx itself is MIT-licensed for owner-authored site code. The following third-party
packages and assets are used under their own terms.

## Paper Shaders

- Packages: `@paper-design/shaders-react@0.0.82`, `@paper-design/shaders@0.0.82`
- Licence: Apache-2.0
- Required notice and licence text:
  [`third_party/paper-shaders/NOTICE`](third_party/paper-shaders/NOTICE),
  [`third_party/paper-shaders/LICENSE`](third_party/paper-shaders/LICENSE),
  [`third_party/paper-shaders-core/NOTICE`](third_party/paper-shaders-core/NOTICE),
  [`third_party/paper-shaders-core/LICENSE`](third_party/paper-shaders-core/LICENSE)
- Use: direct import of the published React MeshGradient component. No vendor source is
  bundled or modified.

## Motion

- Package: `motion@14.7.1` (with transitive `framer-motion@14.7.1`, `motion-dom@14.7.1`,
  `motion-utils@14.7.0`, `tslib@2.8.1`)
- Licence: MIT
- Text: [`third_party/motion/LICENSE.md`](third_party/motion/LICENSE.md)
- Use: public Motion React API for the signal behaviour. No source is vendored or modified.

## Fonts

- `@fontsource-variable/space-grotesk@5.3.0`
- `@fontsource/instrument-serif@5.3.0`
- `@fontsource/space-mono@5.3.0`
- Licence: SIL Open Font License 1.1. The font files are self-hosted; no remote font service
  is contacted.

## Media

- `public/media/flower.mp4`, `public/media/motifs/flower-poster.jpg`: CC0 1.0, MDN sample
  media and its poster derivative.
- `public/media/flower.webm`: CC0 1.0 VP9 derivative of the same MP4, used only when the
  browser cannot decode H.264.
- See [`public/media/credits/flower.md`](public/media/credits/flower.md).

## Owner-authored source with no assigned licence

The following are preserved from the owner's experiments and are **not** covered by the
site's MIT licence. They are redistribution-restricted until the owner assigns terms:

- HoloType (`experiments/holotype/`)
- CRT Material Lab (`experiments/crt-material-lab/`)
- Pearl Caustics V2 (`experiments/pearl-caustics/`)
- Terminal Rain (`experiments/living-stencils/`)
- UI Forge primitives (`registry/new-york/`)
- Material × Mask definitions and surfaces (`lib/composition/`, `components/labs/composition/`)
- The original moth and wordmark geometry

No React Bits, Pexels, Theatre.js/AGPL, or other unlicensed/paid source is present.

## Node/tooling notices

Playwright (`@playwright/test@1.64.1`, Apache-2.0), Vitest (`4.1.12`, MIT), TypeScript
(`5.9.3`, Apache-2.0), ESLint (`9.39.5`, MIT) and `fflate` (`0.8.3`, MIT) are development
or evidence-only tools and are not part of the production browser runtime.
`sharp@0.35.5` (Apache-2.0) and optional `@img/sharp-libvips-*` (LGPL-3.0-or-later) are
present through Next image optimization; no effect imports them. Review before
redistributing a bundled product.
