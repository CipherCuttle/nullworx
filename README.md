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
- G5-A **NULLWORX / Living Type 01**, a separate experimental product demo at `/living-type`
  and one installable shadcn item, `living-type-01`, with editable wordmark, three art
  directions and validated recipes.

The home gallery is unchanged. The experimental labs are **`/labs/effects`** and
**`/labs/composition`**; the G5-A demo is **`/living-type`**. None is linked from the gallery
and all are `noindex`. Nothing here is owner visually approved, merged to a release branch,
deployed, or published.

## Status

| Area | Status |
| --- | --- |
| UI Forge v0.1 foundation | Preserved; build, typecheck, lint and registry checks pass |
| HoloType | `REVIEW_PENDING` — imported byte-for-byte, not a registry item |
| Paper Shaders adapter | `EXPERIMENTAL` — upstream `@paper-design/shaders-react@0.0.82` (Apache-2.0) |
| Motion adapter | `EXPERIMENTAL` — upstream `motion@14.7.1` (MIT) |
| Owner visual approval | **Not granted** |
| Effect registry | **`living-type-01`** only, G5-A, local direct install; no public admission |
| Framework security | `next@15.5.28`, `react@19.1.10`, `sharp@0.35.5`; production audit triaged |
| G3-A composition proof | **Experimental** — 2 masks × 2 materials, four presets, lab-only |
| G5-A Living Type 01 | **EXPERIMENTAL / OWNER_REVIEW** — one installable effect item; embedded OFL font; 137/124/124 browser checks; 0% headed median frame-interval regression |
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
- `/living-type` — the G5-A product demo and recipe workbench (`noindex`, not in navigation).
- `/living-type/recipe-proof` — noindex paused-recipe evidence route, not linked from the demo.

## Verify

```sh
pnpm lint
pnpm typecheck
pnpm registry:validate
pnpm build
pnpm verify:contract     # 24 runtime EffectDefinition assertions, no browser needed
pnpm verify:composition-contract  # 26 composition contract assertions
pnpm verify:living-type-contract  # 45 recipe/mask/security contract assertions
```

Existing UI Forge checks and browser evidence run against a production server:

```sh
pnpm start --hostname 127.0.0.1 --port 3100
# in another terminal
EVIDENCE_DIR=evidence pnpm verify:gallery   # 43 gallery assertions + clipboard fixtures
EVIDENCE_DIR=evidence pnpm verify:effects   # 62 G2 browser assertions
EVIDENCE_DIR=evidence/g3a pnpm verify:composition  # 149 G3-A browser assertions
```

G5-A has its own clean-consumer setup and evidence path:

```sh
# terminal 1: the local registry/demo build
pnpm build && pnpm start --hostname 127.0.0.1 --port 3102

# terminal 2: create the two consumers outside this repo
pnpm setup:living-type-consumers
# then build them and run the browser suites against ports 3201/3202
ENGINE=chromium MODE=full pnpm verify:living-type-browser
ENGINE=firefox MODE=full pnpm verify:living-type-browser
ENGINE=webkit MODE=full pnpm verify:living-type-browser
pnpm verify:living-type-recipe
DISPLAY=:0 pnpm measure:living-type
```

The install command is `npx shadcn@4.23.0 add <registry>/r/living-type-01.json --yes`.
shadcn 3.0.0 corrupts installed files (see `G5A_REPORT.md`); 4.23.0 is required for this
item. The existing UI Forge CLI dependency and install command are intentionally untouched.

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
registry.g5a.json            Separate one-item G5-A registry manifest (direct item URL)
registry/nullworx/           Shadcn-installable Living Type 01 source, assets, docs, licences
components/living-type-demo/ Product demo + paused recipe evidence route
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
| Unbounded Variable 5.3.0 ASCII subset | embedded WOFF2 | OFL-1.1 |
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

- Chromium, Firefox and WebKit browser evidence exists for G5-A; the G2/G3-A harness remains
  Chromium-first where documented.
- Headless Chrome uses SwiftShader software WebGL. Frame-time numbers are host/software
  cadence observations, not a universal 60 fps claim.
- HoloType is single-line by design.
- Paper Shaders is mounted with `minPixelRatio=1` and `maxPixelCount=1,200,000`; this is an
  adapter choice for bounded rendering, not an upstream default.
- No image/video/PNG export, composition graph, marketplace, newsletter or video pipeline is
  implemented.
- The repository has no assigned project license. Third-party licenses and notices still
  apply; do not redistribute the owner-authored source without the owner's decision. The
  G5-A item is local-verification-only until the owner assigns a source license.
- The G5-A registry item is not in the shared registry index because the existing gallery
  assumes exactly three UI Forge items. Install it by direct item URL.
- The embedded data-URI font can be blocked by a restrictive `font-src` CSP; the component
  falls back to system type. Self-host the WOFF2 separately if the consumer needs a strict
  CSP and the exact face.
- G5-A recipes restore configuration and paused stills, not frame-perfect animation.

## G5-A documentation

- [G5A_REPORT.md](G5A_REPORT.md) — gates, evidence, hostile review, verdict.
- [docs/G5A_BROWSER_MATRIX.md](docs/G5A_BROWSER_MATRIX.md)
- [docs/G5A_PERFORMANCE.md](docs/G5A_PERFORMANCE.md)
- [docs/G5A_SECURITY.md](docs/G5A_SECURITY.md)
- [docs/G5A_MANIFEST.md](docs/G5A_MANIFEST.md)
- [docs/G5A_ROLLBACK.md](docs/G5A_ROLLBACK.md)
- [registry/nullworx/living-type-01/README.md](registry/nullworx/living-type-01/README.md) — customer usage.

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
