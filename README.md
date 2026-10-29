# Nullworx — integration foundation

This repository is the first Nullworx integration foundation, not a finished studio. It
contains:

- the accepted-for-local-use **UI Forge v0.1** gallery, registry, three components, styling
  and tests;
- one existing but **owner-review-pending** effect, **HoloType**, imported unchanged from
  UI Forge Expansion 02;
- two third-party adapters behind a small typed `EffectDefinition` contract: one
  **Paper Shaders** MeshGradient and one **Motion**-driven behavior.

The home gallery is unchanged. The experimental preview lives at **`/labs/effects`** and is
not linked from the gallery. Nothing here is owner visually approved, merged to a release
branch, deployed, or published.

## Status

| Area | Status |
| --- | --- |
| UI Forge v0.1 foundation | Preserved; build, typecheck, lint and registry checks pass |
| HoloType | `REVIEW_PENDING` — imported byte-for-byte, not a registry item |
| Paper Shaders adapter | `EXPERIMENTAL` — upstream `@paper-design/shaders-react@0.0.82` (Apache-2.0) |
| Motion adapter | `EXPERIMENTAL` — upstream `motion@14.7.1` (MIT) |
| Owner visual approval | **Not granted** |
| Registry item for effects | **None** (G5 is design-only) |
| Deploy / publish / merge | **None** |

## Run

Requires Node `>=20` (evidence used Node 24.20.0) and pnpm 12.

```sh
pnpm install
pnpm dev                 # http://localhost:3000
pnpm build && pnpm start # production build on http://localhost:3000
```

Routes:

- `/` — the existing UI Forge gallery, unchanged.
- `/labs/effects` — the experimental adapter lab (`noindex`, not in navigation).

## Verify

```sh
pnpm lint
pnpm typecheck
pnpm registry:validate
pnpm build
pnpm verify:contract     # 24 runtime EffectDefinition assertions, no browser needed
```

Existing UI Forge checks and browser evidence run against a production server:

```sh
pnpm start --hostname 127.0.0.1 --port 3100
# in another terminal
EVIDENCE_DIR=evidence pnpm verify:gallery   # 43 gallery assertions + clipboard fixtures
EVIDENCE_DIR=evidence pnpm verify:effects   # 62 G2 browser assertions
```

After `node scripts/smoke-consumer.mjs` prints a consumer path, start it on port 3101 and
run `EVIDENCE_DIR=evidence pnpm verify:consumer` for the 53 clean-consumer assertions.

`pnpm verify:effects` uses `playwright-core` against the system Chrome (no browser download)
and writes screenshots, console/network logs, mount/unmount checks and performance samples
to the evidence directory. It is not part of the production bundle. The G2 evidence and the
full report live outside this repository's committed tree.

## Architecture

```
app/                         Next.js App Router; gallery + /labs/effects
components/forge-gallery.*   Existing UI Forge gallery (unchanged)
registry/new-york/           3 accepted UI Forge registry items
experiments/holotype/        Existing effect, imported unchanged (REVIEW_PENDING)
lib/effects/types.ts         Minimal EffectDefinition metadata contract
lib/effects/schemas.ts       Zod runtime parameter validators
lib/effects/definitions.ts   Stable IDs, versions, loaders, capabilities, licenses
lib/effects/validate.ts      Runtime validation helper
components/labs/             Three self-contained preview adapters + lab shell
third_party/                 Paper Shaders and Motion license/notice texts
```

Each adapter owns its own rendering lifecycle and local controls. There is no universal
renderer, no shared effect prop interface and no per-combination renderer switch. The
`EffectDefinition` describes metadata, validation, a lazy preview loader, capabilities,
reduced-motion behavior, export targets and licensing/provenance; it does not impose a
renderer.

## Dependencies

Runtime additions are pinned exactly:

| Package | Version | License |
| --- | --- | --- |
| `@paper-design/shaders-react` | `0.0.82` | Apache-2.0 |
| `@paper-design/shaders` (transitive) | `0.0.82` | Apache-2.0 |
| `motion` | `14.7.1` | MIT |
| `framer-motion` (transitive) | `14.7.1` | MIT |

Evidence-only devDependencies: `playwright-core@1.64.1` (Apache-2.0) and `tsx@4.23.15`
(MIT). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

No React Bits source, Pexels media, paid component, remote font, image CDN or AGPL/Theatre.js
integration is present. No media is imported by this pass.

## Provenance

- UI Forge v0.1 source tree: SHA-256
  `1c0cffb0ef160043aa908ff422376f83331039c9ab259f38cb2495443e1caad3`, captured from the
  uncommitted working tree at Git HEAD `906f859` (the shadcn template commit).
- HoloType source: Expansion 02 commit `847b85d8e74a2ca1d1eea9a55de320bbdc587059`, tree
  SHA-256 `b0b4f17307c22c1c5d37defecfd5363095aaa19e67e5b3ff126856b0d8bf7eb9`.
- Original UI Forge verification record: [docs/upstream/UI_FORGE_VERIFICATION.md](docs/upstream/UI_FORGE_VERIFICATION.md).
- Full file manifest and restrictions: [docs/PROVENANCE.md](docs/PROVENANCE.md).

## Known limits

- Chromium-only browser evidence; no Firefox/WebKit pass.
- Headless Chrome uses SwiftShader software WebGL. Frame-time numbers are host/software
  cadence observations, not a universal 60 fps claim.
- HoloType is single-line by design.
- Paper Shaders is mounted with `minPixelRatio=1` and `maxPixelCount=1,200,000`; this is an
  adapter choice for bounded rendering, not an upstream default.
- No image/video/PNG export, composition graph, marketplace, newsletter or video pipeline is
  implemented.
- The repository has no assigned project license. Third-party licenses and notices still
  apply; do not redistribute the owner-authored source without the owner's decision.

## Rollback

This work is isolated on branch `feat/forge-foundation-g2`. To return the target to its
pre-import state:

```sh
git switch main
git branch -D feat/forge-foundation-g2   # only after confirming no commits are wanted
```

The original UI Forge and Expansion 02 roots are untouched. Their byte-level snapshots and
Git bundles are outside this repository (see the G0 preservation record in the integration
workspace).
