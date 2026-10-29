# G5-A security and licensing review

**Status: EXPERIMENTAL / OWNER_REVIEW.**

## Advisory snapshot (2026-10-29)

Commands: `pnpm audit --prod`, `npm audit --omit=dev` in each fresh consumer.
No external advisory search service was available in this session; the npm
registry audit and the preserved G2.1 advisory review are the recorded sources.

| Tree | Critical | High | Moderate | Low | Triage |
| --- | ---: | ---: | ---: | ---: | --- |
| Nullworx host production tree | 0 | 7 | 2 | 1 | Build-time Next chains (`postcss`, `nanoid`, `source-map-js`) and the existing lab `zod` schema path; not in the exported component's runtime |
| Clean Next consumer (`omit=dev`) | 0 | 1 | 1 | 0 | Next's build-time `postcss` chain; no `postcss` found in `.next/static/chunks` |
| Clean Vite consumer (`omit=dev`) | 0 | 0 | 0 | 0 | None |
| `@paper-design/shaders-react@0.0.82` | 0 | 0 | 0 | 0 | No advisory returned |

The exported Living Type item imports only React and the published
`@paper-design/shaders-react` package. Its recipe validator is hand-written and
has no `zod` runtime dependency. The font is embedded; there is no font package
and no runtime font request. The `iframe`/SVG/HTML injection surface is absent:
the wordmark is a validated fixed alphabet, rasterised with `fillText`.

G2.1's patched framework versions remain in place: Next 15.5.28, React 19.1.10,
and the `sharp@0.35.5` override.

## Installer supply-chain finding

The repository's existing `shadcn@3.0.0` CLI parsed **every** installed registry
file as TSX and corrupted non-code files. Observed in a clean Next install:
comments were stripped, Markdown apostrophes became `"'s"`, and
`join(" ")` became `join("")` (which would concatenate class names without a
space). This is a distribution defect, not just cosmetic.

G5-A installs its item with `npx shadcn@4.23.0`, which preserved all 12 files
byte-for-byte in both consumers. The existing UI Forge CLI dependency and its
3.0.0 install string were intentionally left untouched. The product README
states the 4.23.0 minimum.

## Third-party licences

- Paper Shaders `0.0.82`: Apache-2.0; full licence and required NOTICE are in
  the installed folder and root `third_party/paper-shaders/`.
- Unbounded Variable 5.3.0: SIL Open Font License 1.1. The original Latin WOFF2
  and the ASCII subset are in `third_party/unbounded/`, with source and subset
  SHA-256 values. The installed item includes the full OFL and provenance.
- The Nullworx-authored source has **no assigned project licence**. This build
  is for owner review and local consumer verification. The owner must assign a
  source licence before public registry admission or redistribution.

## Distribution limits

- No npm publication, public registry admission or deployment was performed.
- The G5-A item is served at `/r/living-type-01.json`; it is not in the shared
  three-item UI Forge index because that index feeds the preserved gallery.
- The embedded font is a `data:` URL. A strict `font-src` CSP may block it; the
  product falls back to system type and remains usable. Self-host the WOFF2
  separately for a strict-CSP deployment that requires the exact face.
- The `shadcn` registry transports text files only. The embedded WOFF2 is the
  documented asset transport; it is not a silent workaround.

## Browser/runtime checks

No application console errors, page errors, failed requests or external requests
were observed in the final Chromium/Firefox/WebKit full runs. See
`docs/G5A_BROWSER_MATRIX.md`.
