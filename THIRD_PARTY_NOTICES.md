# Third-party notices

This repository contains original Nullworx/UI Forge source plus direct dependencies on the
packages below. The repository itself has **no assigned license**; third-party terms apply
to the third-party material regardless.

## Direct runtime dependencies added by G2

### Paper Shaders — Apache-2.0

- `@paper-design/shaders-react@0.0.82`
- `@paper-design/shaders@0.0.82` (transitive, same release)
- Copyright 2026 Paper
- Upstream: <https://github.com/paper-design/shaders>
- License text: [third_party/paper-shaders/LICENSE](third_party/paper-shaders/LICENSE)
- Required NOTICE: [third_party/paper-shaders/NOTICE](third_party/paper-shaders/NOTICE)
- Core package license: [third_party/paper-shaders-core/LICENSE](third_party/paper-shaders-core/LICENSE)

The NOTICE text is reproduced verbatim:

> Paper Shaders
> Copyright 2026 Paper
>
> Powered by Paper Shaders:
> https://shaders.paper.design

No Paper Shaders source is vendored, modified or reimplemented. The adapter imports the
published React component and sets documented props.

### Motion — MIT

- `motion@14.7.1`
- `framer-motion@14.7.1` (transitive, same release)
- Copyright (c) 2024 Motion B.V.
- Upstream: <https://motion.dev>
- License text: [third_party/motion/LICENSE.md](third_party/motion/LICENSE.md)

No Motion source is vendored, modified or reimplemented. The adapter uses the public React
API (`motion`, `AnimatePresence`, `useReducedMotion`).

## UI Forge v0.1 foundation

The three UI Forge components (`command-button`, `signal-card`, `reveal-heading`), the
gallery, registry and tests were authored for UI Forge and imported from the owner's working
tree. No explicit license file exists in that source tree. They are treated as
**owner-authored / redistribution restricted** until the owner assigns a license. Original
verification record: [docs/upstream/UI_FORGE_VERIFICATION.md](docs/upstream/UI_FORGE_VERIFICATION.md).

The shadcn registry template that UI Forge was built on is MIT-licensed; template example
source was not imported.

## Other runtime dependencies (inherited)

| Package | Version | License |
| --- | --- | --- |
| `next` | 15.5.28 | MIT |
| `react` / `react-dom` | 19.1.10 | MIT |
| `@radix-ui/react-label` | 2.1.7 | MIT |
| `@radix-ui/react-slot` | 2.1.3 | MIT |
| `class-variance-authority` | 0.7.1 | Apache-2.0 |
| `clsx` | 2.1.1 | MIT |
| `lucide-react` | 0.487.0 | ISC |
| `tailwind-merge` | 3.3.1 | MIT |
| `tw-animate-css` | 1.3.6 | MIT |
| `zod` | 3.25.76 | MIT |
| `tailwindcss` (dev/build) | 4.1.11 | MIT |

The full resolved production tree also includes transitive MIT/ISC/BSD/Apache-2.0 packages
and an optional `sharp`/libvips chain reported as `LGPL-3.0-or-later`
(`@img/sharp-libvips-linux-x64@1.3.4` with `sharp@0.35.5`). The sharp version is forced by
`pnpm-workspace.yaml#overrides` to stay outside the range affected by
`GHSA-2464-fhr4-w9xw` / `CVE-2026-96889`. No deployment or binary distribution is part of
this pass. Re-run `pnpm licenses list --prod` before shipping a bundled artifact.

## Evidence-only devDependencies

| Package | Version | License |
| --- | --- | --- |
| `playwright-core` | 1.64.1 | Apache-2.0 |
| `tsx` | 4.23.15 | MIT |
| `shadcn` | 3.0.0 | MIT |
| `eslint-config-next` | 15.5.28 | MIT |

These are not included in the production bundle. `shadcn` is a build-time registry CLI and
was moved out of `dependencies` in G2.1; it is not imported by any application code.

## Media and fonts

No third-party media is imported or served. No font file is vendored in this repository.
UI Forge uses `next/font/google` at build time to fetch **Geist** and **Geist Mono** and
serves the generated font assets same-origin. Geist is distributed by Vercel under the
SIL Open Font License 1.1 (<https://github.com/vercel/geist-font>). G3-A's wordmark mask
uses that same Geist variable in DOM and Canvas 2D; it adds no font file and no external
font request. No Pexels, NASA, React Bits, Theatre.js or AGPL material is present.
