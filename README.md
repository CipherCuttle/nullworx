# Nullworx — integration foundation

This repository is the first Nullworx integration foundation, not a finished studio. It
contains:

- the accepted-for-local-use **UI Forge v0.1** gallery, registry, three components, styling
  and tests;
- one existing but **owner-review-pending** effect, **HoloType**, imported unchanged from
  UI Forge Expansion 02;
- two third-party adapters behind a small typed `EffectDefinition` contract: one
  **Paper Shaders** MeshGradient and one **Motion**-driven behavior;
- a G3-A experimental **material × mask composition proof** at `/labs/composition`: the
  existing HoloType material and the Paper Shaders MeshGradient applied to an original moth
  silhouette and the NULLWORX wordmark.

The home gallery is unchanged. The experimental labs are **`/labs/effects`** and
**`/labs/composition`**; neither is linked from the gallery and both are `noindex`. Nothing
here is owner visually approved, merged to a release branch, deployed, or published.

## Status

| Area | Status |
| --- | --- |
| UI Forge v0.1 foundation | Preserved; build, typecheck, lint and registry checks pass |
| HoloType | `REVIEW_PENDING` — imported byte-for-byte, not a registry item |
| Paper Shaders adapter | `EXPERIMENTAL` — upstream `@paper-design/shaders-react@0.0.82` (Apache-2.0) |
| Motion adapter | `EXPERIMENTAL` — upstream `motion@14.7.1` (MIT) |
| Owner visual approval | **Not granted** |
| Registry item for effects | **None** (G5 is design-only) |
| Framework security | `next@15.5.28`, `react@19.1.10`, `sharp@0.35.5`; production audit triaged |
| G3-A composition proof | **Experimental** — 2 masks × 2 materials, four presets, lab-only |
| Deploy / publish / merge | **None** |

## Security

G2.1 patches the October 2026 Next.js and React Server Components advisories without
migrating to Next.js 16. The advisory review, the production-audit triage and the sharp
override are recorded in [docs/G21_SECURITY.md](docs/G21_SECURITY.md).

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
- `/labs/composition` — the G3-A material × mask proof (`noindex`, not in navigation).

## Verify

```sh
pnpm lint
pnpm typecheck
pnpm registry:validate
pnpm build
pnpm verify:contract     # 24 runtime EffectDefinition assertions, no browser needed
pnpm verify:composition-contract  # 26 composition contract assertions
```

Existing UI Forge checks and browser evidence run against a production server:

```sh
pnpm start --hostname 127.0.0.1 --port 3100
# in another terminal
EVIDENCE_DIR=evidence pnpm verify:gallery   # 43 gallery assertions + clipboard fixtures
EVIDENCE_DIR=evidence pnpm verify:effects   # 62 G2 browser assertions
EVIDENCE_DIR=evidence/g3a pnpm verify:composition  # 149 G3-A browser assertions
```

After `node scripts/smoke-consumer.mjs` prints a consumer path, start it on port 3101 and
run `EVIDENCE_DIR=evidence pnpm verify:consumer` for the 53 clean-consumer assertions.

`pnpm verify:effects` and `pnpm verify:composition` use `playwright-core` against the system
Chrome (no browser download) and write screenshots, console/network logs, boundary samples,
mount/unmount checks and performance samples to the evidence directory. They are not part of
the production bundle. Evidence lives outside the committed tree under `evidence/`.

The G3-A design, provenance and known gaps are recorded in
[docs/G3A_COMPOSITION.md](docs/G3A_COMPOSITION.md).

## Architecture

```
app/                         Next.js App Router; gallery + /labs/effects + /labs/composition
components/forge-gallery.*   Existing UI Forge gallery (unchanged)
registry/new-york/           3 accepted UI Forge registry items
experiments/holotype/        Existing effect, imported unchanged (REVIEW_PENDING)
lib/effects/                 EffectDefinition metadata, schemas, validators
lib/composition/             MaskDefinition, MaterialDefinition, recipe + compatibility contracts
components/labs/             G2 preview adapters + G3-A composition surfaces
fixtures/composition/        Valid and invalid recipe fixtures
third_party/                 Paper Shaders and Motion license/notice texts
```

Each adapter owns its own rendering lifecycle and local controls. There is no universal
renderer, no shared effect prop interface and no per-combination renderer switch. The
`EffectDefinition` describes metadata, validation, a lazy preview loader, capabilities,
reduced-motion behavior, export targets and licensing/provenance; it does not impose a
renderer.

G3-A adds one seam: a material surface receives a `MaskDefinition`, the canonical mask
image, its own validated params and playback flags. HoloType maps the two mask kinds to its
existing `HoloGlyph` / `HoloText` interfaces; Paper consumes the same mask image through a
container CSS alpha mask. Compatibility is one advertised-capability check, not a branch per
material × mask pair.

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
