# Effect inventory and admission matrix

The machine-readable source of truth is `lib/labs/catalog.ts`. Every integrated route is
noindexed, labelled as unreleased and mounted in the branded shell. The public manifest
(`lib/effects/manifest.ts`) remains release-gated and unchanged in status.

## Integrated previews

| Candidate | Source | Source digest / commit | Dependencies | Licence | Technical verification | Approval | Runtime compatibility | Disposition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **ASCII Waves / Flower** | UI Forge Flower integration `registry/new-york/ascii-waves` | `906f859`; component tree `0eeaf0…` | none | MIT site; CC0 media | Temporal video/canvas receipts, pause/reduced/fallback, 3 engines | `OWNER_REVIEW` | WebGL 2 + H.264 or VP9 | `/lab/ascii-waves`, homepage |
| **HoloType** | `ui-forge-expansion-02/experiments/holotype` | `847b85d`; 8-file digest `c0eb3a…` | none | Proprietary / restricted | Expansion 02 checks + new cross-browser | `REVIEW_PENDING` | DOM/CSS, 3 engines | `/lab/holotype` |
| **Paper MeshGradient** | npm `@paper-design/shaders-react` | `0.0.82` | Paper Shaders 0.0.82 | Apache-2.0 | G2 62 checks + new WebGL/cross-browser | `EXPERIMENTAL` | WebGL 2, 3 engines | `/lab/paper-mesh` |
| **Motion Signal Behavior** | npm `motion` + original adapter | `14.7.1` | Motion 14.7.1 | MIT | G2 scan/hold/release + reduced motion | `EXPERIMENTAL` | DOM/Motion, 3 engines | `/lab/motion-signal` |
| **CommandButton / SignalCard / RevealHeading** | `nullworx-g3a/registry/new-york` | `906f859`; 6-file digest `80d5e6…` | none | Owner-authored / restricted | UI Forge verification; new keyboard/reduced checks | `LOCAL_APPROVED` | DOM/CSS, 3 engines | `/lab/signal-ui` |
| **Material × Mask A–D** | `nullworx-g3a/lib/composition` + `components/labs/composition` | `e5e4119` | Paper Shaders; Zod 4 | Proprietary + Apache-2.0 | G3-A.1: 149 browser, 62 cross-browser, 26 structural, GPU receipts | `EXPERIMENTAL` | HoloType DOM/CSS; Paper WebGL 2; 3 engines | `/lab/composition` |
| **CRT Material Lab** | `ui-forge-expansion-02/experiments/crt-material-lab` | `847b85d`; 6-file digest `ccd75d…` | none | Proprietary / restricted | Expansion 02 four surfaces + new still/cross-browser | `REVIEW_PENDING` | CSS only, 3 engines | `/lab/crt-material` |
| **Pearl Caustics V2** | `ui-forge-pearl-caustics-proof02/src/pearl-caustics` | 3-file digest `8b6527…` | none | Proprietary / restricted | Source: 53/53 browser, 11/11 loop, 144 Hz GPU; new shell checks | `VISUAL_AND_TECH_PASS_OWNER_REVIEW` | WebGL 1, 3 engines; software still path | `/lab/pearl-caustics` |
| **Terminal Rain** | `living-stencils-proof01/src/materials` + `ascii.ts` | 4-file digest `4d5fba…` | none | Proprietary / restricted | Source technical pass; standalone material re-verified | `OWNER_ART_REVIEW_REQUIRED` | Canvas 2D, 3 engines | `/lab/terminal-rain` |

## Blocked or not integrated

| Candidate | Why it is not a working preview | Disposition |
| --- | --- | --- |
| **HoloFoil** | No source, registry item, branch, tag, checkpoint or approval record exists. Treating HoloType as HoloFoil would be a false adaptation claim. | `BLOCKED` |
| **Pexels Jellyfish / Koi / Smoke** | Media redistribution rights were not independently re-verified; source review excluded them from Flower. | `BLOCKED` |
| **React Bits source** | MIT + Commons Clause; resale/redistribution scope not cleared. No source imported. | `BLOCKED` |
| **Theatre.js Studio** | AGPL, outside the approved dependency surface. No package imported. | `BLOCKED` |
| **Pearl Caustics Proof 01** | Rejected predecessor; V2 replaced its light model. Historical evidence only. | `BLOCKED` |
| **Pearl Caustics Proof 03** | Later direction trial with unresolved photographic plate rights. No asset imported. | `BLOCKED` |
| **Living Stencils full compositor** | Vite-specific six-combination compositor needs the preserved FlowerMaterial wrapper and a CC BY 2.0 attribution surface (James St. John). Terminal Rain is integrated standalone. | `NOT_INTEGRATED` |
| **G5-A Living Type** | Owner paused monetization/export until this foundation is accepted. The worktree was not read for import or merged. | `NOT_INTEGRATED` |

## Release status truth

- Public catalogue: **00 released**.
- One `OWNER_REVIEW` manifest entry: ASCII Waves (unchanged).
- `/effects/[slug]` remains generated only for released effects; no new public effect page was
  created.
- Every `/lab/*` route carries `X-Robots-Tag: noindex, nofollow`, is absent from the sitemap
  and is not linked from the primary navigation.
- The homepage continues to label the field `OWNER REVIEW / NOT RELEASED` and now reports
  the actual live/reduced/paused/blocked state rather than a hardcoded LIVE badge.

## What was deliberately not done

- No merge of PR #1, PR #2 or PR #3; no branch wholesale merge.
- No new shader, canvas, motion or composition engine.
- No visual rewrite of an existing renderer. Wrapper adaptations are listed in the source
  notes and the changeset.
- No old UI Forge gallery or global stylesheet.
- No marketplace, checkout, newsletter activation, export pipeline or deployment.
