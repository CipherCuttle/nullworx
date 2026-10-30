# Dependency and license inventory

Generated for Nullworx V0.1. This is an operational inventory, not legal advice. The
committed `pnpm-lock.yaml` is the authoritative resolution.

## Runtime dependencies

| Package | Version | License | Use |
| --- | --- | --- | --- |
| `next` | 16.4.3 | MIT | App Router, SSR/SSG, metadata, API routes |
| `react` | 19.3.1 | MIT | UI and effect runtime |
| `react-dom` | 19.3.1 | MIT | DOM renderer |
| `zod` | 4.6.7 | MIT | Manifest and request validation |
| `server-only` | 0.0.1 | MIT | Server-boundary guard |
| `@fontsource-variable/space-grotesk` | 5.3.0 | OFL-1.1 | Interface sans |
| `@fontsource/instrument-serif` | 5.3.0 | OFL-1.1 | Editorial display serif |
| `@fontsource/space-mono` | 5.3.0 | OFL-1.1 | Technical/mono labels |

Runtime license groups reported by the package manager: MIT 47, OFL-1.1 3, Apache-2.0 5,
ISC 5, BSD-3-Clause 1, 0BSD 1, LGPL-3.0-or-later 1, CC-BY-4.0 1. The LGPL entry is in the
optional `sharp`/libvips image path; the CC-BY entry is `caniuse-lite` browser-data
metadata. Neither is modified or statically linked by Nullworx application code. If the
site is distributed as a bundled artifact, generate a full notice file from the lockfile.

## Development dependencies

| Package | Version | License | Use |
| --- | --- | --- | --- |
| `typescript` | 5.9.3 | Apache-2.0 | Type checking |
| `eslint` | 9.39.5 | MIT | Lint |
| `eslint-config-next` | 16.4.3 | MIT | Next lint rules |
| `vitest` | 4.1.12 | MIT | Unit/integrity tests |
| `@playwright/test` | 1.64.1 | Apache-2.0 | Production-build browser tests and captures |
| `@axe-core/playwright` | 4.14.0 | MPL-2.0 | Accessibility scans |
| `tsx` | 4.23.15 | MIT | TypeScript scripts |
| `fflate` | 0.8.3 | MIT | Deterministic ZIP creation/verification |
| `@types/node` | 24.10.1 | MIT | Node types |
| `@types/react` | 19.3.0 | MIT | React types |
| `@types/react-dom` | 19.3.0 | MIT | React DOM types |
| `@eslint/eslintrc` | 3.3.7 | MIT | ESLint compatibility |

All-installed license groups include MPL-2.0 (dev axe), MIT, Apache-2.0, ISC, BSD, OFL,
LGPL, CC-BY, CC0, BlueOak, 0BSD and Python-2.0 (transitive tooling). No AGPL, SSPL or
Commons Clause dependency is installed in this project. React Bits is not installed and
none of its code is used.

## Security check

```sh
pnpm audit --prod --audit-level moderate
pnpm audit --audit-level moderate
```

On 2026-10-29 both reported **no known vulnerabilities** in the resolved tree. This is a
point-in-time package-manager result, not a code audit or a guarantee. Evidence:
`evidence/dependencies/audit-prod.json` and `audit-all.json`.

`pnpm check:secrets` scans tracked text files for common provider key formats, private
keys and registered environment-secret values, and also scans the built `.next/static`
client assets. It does not scan `evidence/` (generated test data/docs) by design. It is a
safety net, not a guarantee; server-only imports and review of anything using
`NEXT_PUBLIC_` remain the primary controls. `pnpm verify` builds before this scan so the
client assets are current.

## Supply-chain rules

- Use the committed lockfile with `pnpm install --frozen-lockfile`.
- Do not add a dependency for something the platform already provides.
- Pin versions in `package.json`; the lockfile captures transitive resolution.
- Check the license and maintenance before adding an effect dependency.
- Keep provider credentials server-only. Never use `NEXT_PUBLIC_` for a secret.
- A production deploy must build from a clean checkout, not from a developer’s dirty
  `node_modules`.

## Evidence files

- `evidence/dependencies/licenses-prod.json`
- `evidence/dependencies/licenses-all.json`
- `evidence/dependencies/audit-prod.json`
- `evidence/dependencies/audit-all.json`
- `evidence/dependencies/summary.json`
- `evidence/logs/dependency-inventory.log`

Regenerate with `node scripts/dependency-inventory.mjs` (see the script for the exact
package-manager commands) after a dependency change.

## Fonts and media

- Space Grotesk, Instrument Serif and Space Mono are self-hosted via Fontsource under SIL
  OFL 1.1. Their license texts travel in the installed packages. They are not sold
  separately.
- The ASCII Waves effect uses a system monospace stack and does not bundle a font.
- `public/media/flower.mp4` and `public/media/motifs/flower-poster.jpg` are CC0 1.0 from
  the MDN sample media / approved derivative. Credit text is in
  `public/media/credits/flower.md`.
- No Pexels, NASA/Orion or React Bits asset is distributed.
