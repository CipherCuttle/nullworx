# Unbounded Variable — embedded ASCII subset

- Upstream font: Unbounded by The Unbounded Project Authors.
- Source package: `@fontsource-variable/unbounded@5.3.0`, latin variable WOFF2.
- Source file: `unbounded-latin-wght-normal.woff2`
  SHA-256 `22f9b928aa3928a896340422b54d690fbb5875c30eae4c106f029c61f2289fd6`
- Subset file: `unbounded-living-type-ascii.woff2`
  SHA-256 `3e99d2422c4a5c962cbd13889295e0d7d5273c844aeff1a2b35f9c54c4721d2b`
- Subset range: `U+0020–007E`, variable weight axis 200–900, 136 glyphs.
- Tool: `pyftsubset` from fontTools, with `--layout-features='*' --flavor=woff2`.
- License: SIL Open Font License 1.1, full text in `OFL.txt`.
- The subset is embedded as a base64 WOFF2 in
  `registry/nullworx/living-type-01/living-type-font.css` because the shadcn
  registry transports text files only. The OFL permits embedding and
  redistribution; no reserved font name is declared in the upstream license.
