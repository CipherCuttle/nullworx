# G0 — Reconciliation and source preservation

Date: 2026-10-29 Europe/Stockholm
Target: `feat/consolidation-01`, isolated worktree at
`/home/swirky/Documents/deepseek-harness/default-workspace/nullworx-consolidation-01`.
Base: `feat/nullworx-v0-1-foundation` at `4884b2b` (the branded Nullworx website).
No merge, deploy, publication, marketplace or G5-A work was performed.

## 1. The two actual applications

| | Branded website | UI Forge / effect lineage |
| --- | --- | --- |
| Repository clone | `~/DevHub/experiments/nullworx-site-preview` | `~/Documents/.../nullworx` and `nullworx-g3a` worktrees |
| Branch | `feat/nullworx-v0-1-foundation` | `feat/forge-foundation-g2` / `feat/g3a-composition-proof` |
| Framework | Next.js 16.4.3, React 19.3.1, Zod 4.6.7 | Next.js 15.5.28, React 19.1.10, Zod 3.25.76 |
| Product shell | Nullworx brand: homepage, release gate, effect pages, Drops, legal, `/lab/ascii-waves` | UI Forge gallery at `/`, `/labs/effects`, `/labs/composition` |
| Role | **Target shell** | **Source library / composition lineage** |

The mission references also resolve as follows:

- `feat/nullworx-v0-1-foundation` exists in `nullworx-site-preview` and is the branded website.
- `docs/creative-roadmap-01` exists as a remote branch (`7e43c61`) on the same repository. Its `docs/ROADMAP.md` was read; it is a product hypothesis/roadmap, **not** an implementation approval.
- `feat/g3a-composition-proof` exists at `e5e4119` in the `nullworx-g3a` worktree.
- The workspace `nullworx` clone is a second, older UI Forge lineage. It is not the branded website and was not merged.

The branded website was chosen as the target shell because it already owns the public release
gate, the truthful public catalogue, the tested ASCII Waves homepage and the brand system.
No concrete blocker to that choice was found.

## 2. Source roots and preservation baseline

Read-only fingerprints were taken **before any copy**:
`evidence/g0/source-preservation-baseline.json`.

Method: `sha256(join(sorted(relativePath + NUL + byteSize + NUL + fileSha256 + LF)))`,
excluding `node_modules`, `.next`, `dist`, `.git`, `.turbo`, `.cache`, `.tmp-tests`,
`coverage`, `test-results`, `playwright-report`, `blob-report` and `*.tsbuildinfo`.
The script is `scripts/source-preservation.mjs`. It never writes inside a source root.

| Root | Files | Baseline tree SHA-256 | Git state |
| --- | ---: | --- | --- |
| `ui-forge` | 81 | `32ccabb110bc914cdd2fb1878f4079ce67ad964e3c4c3599dea08c92a12bc365` | `906f859`, 27 dirty WIP entries |
| `ui-forge-flower-integration-01` | 158 | `e1d8c4465a9636e9187a4b0b65a8f4d9418f56bf87981b38a8458de3c468fc54` | `906f859`, 31 dirty WIP entries |
| `ascii-waves-react-01` | 115 | `24529540d438a4f71651babef8ae052dd7546f2267984e7acf14bd523bcbdc02` | no Git |
| `ui-forge-expansion-02` | 83 | `54303a549ad1162b5647ccba7efc5ed5d7b1ad88fe1b1b9ff1dbdca83fa3348a` | `847b85d`, 1 dirty entry |
| `ui-forge-pearl-caustics-proof02` | 125 | `37aef7ba2abf1c9a58fa31e8980cb5d5d1e2d899f7f496ce7be49ab38f60c68b` | no Git |
| `living-stencils-proof01` | 159 | `c2ddc1da36717b922cdbd4c925920181876599dc5b6718c0a8acc8254d2527f0` | no Git |
| `nullworx-g3a` | 647 | `f6e3f79a91a0424adb168762d32e30a421d6c82e285865dd8a6e6e43d3d1dfb5` | `e5e4119`, 3 dirty entries |
| `nullworx-branded-baseline` | 176 | `9e7849ca97939d7df78f154e3c1cca0f3c768f1a53c83be112a81b02928ee216` | `4884b2b`, clean |

The baseline includes historical evidence directories where present; it is a
preservation fingerprint, not a source-only manifest. Final re-hash after implementation is
`evidence/g0/source-preservation-final.json`. The original roots were never written to.

## 3. Source-to-destination inventory

Only cleared, existing source was copied. Renderer implementations were not rewritten.
Adapters and lab wrappers are new.

| Candidate | Source (unchanged) | Destination in this worktree | Copy treatment |
| --- | --- | --- | --- |
| ASCII Waves / Flower | `ui-forge-flower-integration-01/registry/new-york/ascii-waves` | `components/effects/ascii-waves/` (already on base) | Already imported byte-for-byte; untouched |
| HoloType | `ui-forge-expansion-02/experiments/holotype` | `experiments/holotype/` | 8 files, byte-identical |
| CRT Material Lab | `ui-forge-expansion-02/experiments/crt-material-lab` | `experiments/crt-material-lab/` | 6 files, byte-identical |
| Pearl Caustics V2 | `ui-forge-pearl-caustics-proof02/src/pearl-caustics` | `experiments/pearl-caustics/` | 3 files, byte-identical |
| Terminal Rain | `living-stencils-proof01/src/materials` + `src/compositing/ascii.ts` | `experiments/living-stencils/src/...` | 4 files, byte-identical; relative import layout preserved |
| CommandButton / SignalCard / RevealHeading | `nullworx-g3a/registry/new-york` | `registry/new-york/` | 6 files, byte-identical |
| Material × Mask A–D | `nullworx-g3a/lib/composition` + `components/labs/composition` | `lib/composition/` + `components/labs/composition/` | Contracts and surfaces copied; imports and shell adapted; renderers unchanged |
| Paper Shaders | `node_modules/@paper-design/shaders-react@0.0.82` | direct import | No source vendored |
| Motion | `node_modules/motion@14.7.1` | direct import | No source vendored |
| Living Stencils full compositor | `living-stencils-proof01/src/components` etc. | not imported | Marked not integrated; requires CC BY 2.0 attribution surface and the preserved FlowerMaterial wrapper |

Paper Shaders and Motion notice/licence texts were copied to `third_party/`:
`paper-shaders/{LICENSE,NOTICE}`, `paper-shaders-core/{LICENSE,NOTICE}`, `motion/LICENSE.md`.

## 4. Dependency compatibility

| Item | Resolution |
| --- | --- |
| Next | Branded app stays on **16.4.3**. No downgrade to the G3-A 15.5.28 and no G3-A code copied wholesale. |
| React | **19.3.1** retained. HoloType/CRT/Pearl/Terminal Rain use React 18-compatible APIs and compile under 19.3. |
| Zod | Branded app stays on **4.6.7**. The copied composition `z.record(z.unknown())` was changed to the Zod 4 required `z.record(z.string(), z.unknown())`; `z.ZodIssueCode.custom` was replaced by the literal `"custom"`. No schema semantics changed. |
| Paper Shaders | `@paper-design/shaders-react@0.0.82` pinned exactly; peer range accepts React 18/19. Apache-2.0. Transitive `@paper-design/shaders@0.0.82`. |
| Motion | `motion@14.7.1` pinned exactly; peer range accepts React 18/19. MIT. |
| CSS | Each effect owns its CSS Module. The old UI Forge global stylesheet and gallery were not imported. The UI Forge primitives' `--forge-*` variables are mapped locally in the Signal UI wrapper only. |
| SSR | Browser-only previews load behind the client `LabPreview` dispatcher with `ssr: false`. The public pages remain server-rendered. |
| Media | Flower remains the reviewed CC0 H.264 source. A CC0 VP9 WebM derivative was added only as a source-selection fallback for browsers without H.264 (WebKit on Linux). The renderer is unchanged. |
| Fonts | Brand Space Grotesk (Fontsource) retained. The G3-A wordmark mask now uses `--font-sans` instead of the absent Geist variable; mask geometry/fitting logic is unchanged. |

## 5. Visual baselines

Preserved source baselines used for comparison (not re-captured as approvals):

- ASCII Waves React 01 comparisons: `evidence/comparisons/original-1440-flower.png`,
  `react-1440-flower.png`, `comparison.json`; the source record reports `exactPixelPercent: 100`.
- Expansion 02: HoloType/CRT desktop and mobile stills plus recordings under
  `ui-forge-expansion-02/evidence/`.
- Pearl Caustics Proof 02: contact sheet, loop recordings and 12 s seam evidence under
  `ui-forge-pearl-caustics-proof02/evidence/`.
- Living Stencils: screenshots, recordings and asset provenance under
  `living-stencils-proof01/evidence/`.
- G3-A: 149-check Chromium evidence, 62-check cross-browser evidence, GPU renderer receipts,
  boundary measurements and motion frame sequences under `nullworx-g3a/evidence/g3a1/`.

These are source-review artifacts. They are not owner approval of the consolidated shell.

## 6. Approval states

The source records distinguish technical verification from owner aesthetic approval:

- UI Forge primitives: accepted for local use, no release approval.
- ASCII Waves: `OWNER_REVIEW`; Gate E open.
- HoloType, CRT, Pearl: technically verified, owner visual approval absent.
- Paper/Motion adapters: experimental.
- G3-A composition: `READY_FOR_OWNER_VISUAL_DECISION`, not approved.
- Terminal Rain: `OWNER_ART_REVIEW_REQUIRED`.
- Living Stencils full compositor: not integrated; Terminal Rain standalone is.

The public catalogue remains empty. Every new route is noindexed and labelled as an
unreleased lab preview.

## 7. Constraints honoured

- No merge of existing branches or PRs.
- No replacement of the branded website with the UI Forge gallery.
- No old UI Forge global CSS in the branded app.
- No new rendering engine, Svelte migration, marketplace, payment, newsletter activation or
  public deployment.
- No G5-A monetization/export work.
- Original local UI Forge experiment roots preserved read-only.
