# Provenance and import boundaries

This document records what entered Nullworx, from where, and under what terms. The
machine-readable file-level hashes are in [import-manifest.json](import-manifest.json).

## Target

- Repository: <https://github.com/CipherCuttle/nullworx>
- Base commit: `b1673f449394feb305a8e79625c535b01c902776` (initial commit, README only)
- Feature branch: `feat/forge-foundation-g2`
- Import date: 2026-10-29 Europe/Stockholm

## UI Forge v0.1 foundation

- Source: `/home/swirky/DevHub/experiments/ui-forge` **working tree**, not its Git HEAD.
- Git HEAD: `906f859db0125965cba71c51da1707c0a4c6d045` (the upstream shadcn registry
  template commit; the Forge work is 27 uncommitted entries on top of it).
- Captured tree: 81 files, SHA-256
  `1c0cffb0ef160043aa908ff422376f83331039c9ab259f38cb2495443e1caad3`.
- Imported byte-identically: the gallery, the three registry components and their CSS
  Modules, `registry.json`, `public/r/*.json`, `lib/forge.ts`, `lib/usage.ts`, the registry
  and browser scripts, app shell, Tailwind/global styling, and the original verification
  record.
- **Modified after import:** `package.json` (name, dependencies, scripts),
  `pnpm-lock.yaml` (new pins), `pnpm-workspace.yaml` (pnpm 12 `allowBuilds`),
  `next.config.ts` (`outputFileTracingRoot`), `.gitignore` (generated evidence).
- **Not imported:** the original `evidence/` directory, `.next/`, `node_modules/`,
  `tsconfig.tsbuildinfo`, template example blocks/components, and generated demo registry
  payloads.
- No UI Forge visual, component API, registry item or gallery file was edited.

## HoloType (existing effect)

- Source: `/home/swirky/DevHub/experiments/ui-forge-expansion-02/experiments/holotype`
- Expansion 02 commit: `847b85d8e74a2ca1d1eea9a55de320bbdc587059`
- Source tree: 8 files, SHA-256
  `b0b4f17307c22c1c5d37defecfd5363095aaa19e67e5b3ff126856b0d8bf7eb9`
- Imported **byte-for-byte** into `experiments/holotype/`; all eight hashes match.
- Status: `REVIEW_PENDING`. It is not a registry item, is not in the home gallery, and is
  mounted only on `/labs/effects`.
- Source is owner-authored; no license file exists. Treated as redistribution-restricted.
- The Expansion 02 report found no HoloFoil source or approval record; HoloType is an
  independent study, not an adaptation of an approved asset.

## Third-party packages

| Package | Version | License | Handling |
| --- | --- | --- | --- |
| `@paper-design/shaders-react` | `0.0.82` | Apache-2.0 | Direct import; no vendor source |
| `@paper-design/shaders` | `0.0.82` | Apache-2.0 | Transitive; no vendor source |
| `motion` | `14.7.1` | MIT | Direct import; no vendor source |
| `framer-motion` | `14.7.1` | MIT | Transitive; no vendor source |
| `playwright-core` | `1.64.1` | Apache-2.0 | Evidence-only devDependency |
| `tsx` | `4.23.15` | MIT | Evidence/contract-test devDependency |

Exact versions are pinned in `package.json` and `pnpm-lock.yaml`. Paper Shaders' required
NOTICE is preserved at `third_party/paper-shaders/NOTICE`; its Apache-2.0 license text is at
`third_party/paper-shaders/LICENSE`. Motion's MIT text is at
`third_party/motion/LICENSE.md`. Full notices: [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

## Media and fonts

- No media is imported. No Pexels, NASA, MDN Flower, Living Stencils, or Pearl Caustics asset
  enters this repository.
- The Flower lineage is CC0-cleared, but its integration is still owner-review-pending and is
  not used here.
- The Pexels reels in ASCII Waves React 01 remain development-only and are excluded.
- No font file is vendored. UI Forge's `next/font/google` fetches Geist at build time and
  serves it same-origin.

## What stayed outside

- The original six candidate roots and the additional Pearl Caustics proofs were not
  modified. G0 preserved 8 roots by tree hash and copied them outside the source roots.
- Expansion 02 evidence, screenshots, recordings and build outputs were not imported.
- `README.md` and CI/release configuration from any experiment were not imported; Nullworx
  has its own README and no deploy pipeline.
