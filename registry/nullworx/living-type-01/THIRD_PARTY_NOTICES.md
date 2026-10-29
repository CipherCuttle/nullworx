# Third-party notices — NULLWORX / Living Type 01

This item is **EXPERIMENTAL / OWNER_REVIEW**. It is not published to a public
registry and no package is published to npm.

## Paper Shaders — Apache-2.0

- Installed package: `@paper-design/shaders-react@0.0.82`
- Transitive package: `@paper-design/shaders@0.0.82`
- Copyright 2026 Paper
- Upstream: <https://github.com/paper-design/shaders>
- License: [PAPER_SHADERS_LICENSE.txt](./PAPER_SHADERS_LICENSE.txt)
- Required notice: [PAPER_SHADERS_NOTICE.txt](./PAPER_SHADERS_NOTICE.txt)

The NOTICE text, verbatim:

> Paper Shaders
> Copyright 2026 Paper
>
> Powered by Paper Shaders:
> https://shaders.paper.design

No Paper Shaders source is vendored, modified or reimplemented. Living Type 01
imports the published React `MeshGradient` component and sets documented props.
The image in the wordmark is produced by the upstream shader; the type mask is
built by this item with Canvas 2D and applied with CSS masking.

## Unbounded Variable — SIL Open Font License 1.1

- Face: Unbounded Variable, weight 200–900, ASCII subset (U+0020–007E)
- Copyright 2022 The Unbounded Project Authors
  (<https://github.com/googlefonts/unbounded>)
- License: [UNBOUNDED_OFL.txt](./UNBOUNDED_OFL.txt)
- Source package: `@fontsource-variable/unbounded@5.3.0`
- Upstream packaging: <https://fontsource.org/fonts/unbounded>
- Source WOFF2 SHA-256:
  `22f9b928aa3928a896340422b54d690fbb5875c30eae4c106f029c61f2289fd6`
- Embedded subset SHA-256:
  `3e99d2422c4a5c962cbd13889295e0d7d5273c844aeff1a2b35f9c54c4721d2b`
- Subset tool: fontTools `pyftsubset` (`--unicodes=U+0020-007E`,
  `--layout-features='*'`, `--flavor=woff2`)

The font is self-hosted inside the installed component as a base64 WOFF2 data
URI in `living-type-font.css`; no font CDN and no font npm dependency are used.
The shadcn registry transports text files, so embedding is the documented,
reproducible asset transport. The OFL permits bundling and redistribution of the
font with software; the upstream licence declares no reserved font name and the
family name is not modified by this item.

## Nullworx-authored source

The Living Type component, recipe contract, schema, documentation and presets
were authored for Nullworx G5-A. The Nullworx repository has **no assigned
project license**. This experimental item is provided for owner review and local
consumer verification only; it does not grant a redistribution or commercial
license for Nullworx-authored source. Third-party terms above apply regardless.

## Consumer runtime

The consumer supplies React and its framework (Next.js or Vite). Those packages
retain their own licenses. Living Type 01 does not bundle or license them.
