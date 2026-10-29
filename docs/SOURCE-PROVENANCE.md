# Source provenance inventory

Generated for the Nullworx V0.1 foundation. The original experiments were treated as
read-only inputs. No source experiment was rewritten, moved, deleted or normalized.

## Preserved source directories

| Source | Role | Git HEAD | Files (baseline) | Baseline tree SHA-256 | Status |
| --- | --- | --- | --- | --- | --- |
| `~/DevHub/experiments/ui-forge` | Original UI Forge gallery and registry shell | `906f859db0125965cba71c51da1707c0a4c6d045` | 81 | `ea017baf4e90903201a044853d8b64d8ab88026cc9901bbae345e3083af2485d` | Unchanged |
| `~/DevHub/experiments/ui-forge-flower-integration-01` | Reviewed Flower integration; direct effect source | `906f859db0125965cba71c51da1707c0a4c6d045` | 158 | `74d607a897d94d53887119267e405dfa7f8534e3f651a486ede6b18fd4180367` | Unchanged |
| `~/DevHub/experiments/ascii-waves-react-01` | Standalone React review build; Gate E evidence | no Git repository | 115 | `7cd1e697a51ac60b49552f4961ebed90933098a15caa5f7b862c4f1d18e9c100` | Unchanged |
| `~/DevHub/experiments/living-stencils-proof01` | Living Stencils / Terminal Rain review build, not migrated | no Git repository | 159 | `d027c81c7d0ad0a76264c129818940da68fae60b14c58ce220a684b7cd76be51` | Unchanged |

Receipt: `evidence/provenance/preservation.json`. Method the source script uses:

```text
sha256(join(sorted(relativePath + NUL + byteSize + NUL + fileSha256 + LF)))
```

Excluded from fingerprints: `node_modules`, `.next`, `dist`, `.git`, `.turbo`, `.cache`,
`.tmp-tests`, `coverage`, `*.tsbuildinfo`. The baseline and current fingerprints agree;
the generator exits non-zero if any source directory changes. See
`scripts/source-provenance.mjs`.

`.git` HEAD is recorded even where the repository had uncommitted worktree changes. The
head is not a claim that the copied files are committed in the source repository.

## What was migrated

Only the five reviewed Flower component files and two CC0 media files were copied.

| File | SHA-256 | Role |
| --- | --- | --- |
| `components/effects/ascii-waves/ascii-waves.tsx` | `b679afe2693c3bdc207a41bd0f28907ffaa4da5ef2b257bfce36b7ff0c4d2d03` | React wrapper |
| `components/effects/ascii-waves/ascii-waves.module.css` | `4784f3b073a15bb84bff14e18d5ca5bd1448f4d5cd94e4097ec209789733475b` | Styles |
| `components/effects/ascii-waves/renderer.ts` | `edd2ab3a049ed2c2a70b8cd62043134163463246516ba06cdf7d6fe9e12aafd7` | WebGL renderer/shader |
| `components/effects/ascii-waves/glyphAtlas.ts` | `eb002aa7ce2875db3afeafebb596d0e32633acd4a4fdeb10ab95886c5be950f2` | Glyph atlas |
| `components/effects/ascii-waves/presets.ts` | `f4418e448209e0176c019f95dde35e42f1a9ae6d0381bb1540d91918ed666de3` | Flower preset |
| `public/media/flower.mp4` | `0cd83d944a6ca7822b4a8306cecc60a36e859b041f6702c6a1ad9ead78924451` | CC0 source video |
| `public/media/motifs/flower-poster.jpg` | `fb34be9b63ad42c7b13dae6c507e683c09f623cc7380ca6717959d54554e919a` | CC0 poster derivative |

The five component files were compared byte-for-byte against
`~/DevHub/experiments/ui-forge-flower-integration-01/registry/new-york/ascii-waves/`:

```sh
for f in ascii-waves.tsx ascii-waves.module.css renderer.ts glyphAtlas.ts presets.ts; do
  sha256sum \
    "$HOME/DevHub/experiments/ui-forge-flower-integration-01/registry/new-york/ascii-waves/$f" \
    "components/effects/ascii-waves/$f"
done
```

All pairs match. The shader text, defaults, font stack, glyph ramp, CSS and Flower preset
are unchanged. Packaging differences (double-quoted literals, explicit `"use client"`)
were already present in the source integration registry item, as documented in the
integration review log.

### Component tree digest

The manifest now records a reproducible digest over the five non-media files, relative to
`components/effects/ascii-waves/`:

```text
algorithm: sha256(join(sorted(relativePath + NUL + byteSize + NUL + fileSha256 + LF)))
value:     0eeaf099c210b601664398519d92d1201506ced1c293cd802e3891958f2200a1
```

It is recomputed from disk by `scripts/validate-effects.ts` on every build. The previous
foundation draft displayed an unverified digest (`ebc6…`) that could not be reproduced
from the reviewed tree. It was replaced with the computed value; the file hashes and
source bytes were not changed.

## Original review status

The source trail is explicit:

- `ascii-waves-react-01/docs/OWNER-REVIEW.md` says Gate E approval is owner-only and open.
- The source review log confirms technical checks but ends with **Gate E — owner approval:
  open**.
- The Flower integration review confirms the original Proof 03 renderer and the registry
  source, but does not turn the React extraction into a release approval.

Nullworx therefore records the candidate as `OWNER_REVIEW` with `releaseApproval: null`.
No page at `/effects/ascii-waves` exists, no sitemap entry is generated, and the homepage
labels the field `OWNER REVIEW / NOT RELEASED`.

## Preserved visual baselines

The source review retained three exact A/B/C still pairs at 1440×900 DPR 1 and 390×844
DPR 2. The preserved comparison receipt reports `exactPixelPercent: 100` for each pair
and byte-identical comparison images. Key preserved files:

| Evidence | SHA-256 |
| --- | --- |
| `ascii-waves-react-01/evidence/comparisons/original-1440-flower.png` | `29ef63952500e4aba602951941f4bd43b1ea987d88a52f0fc326c4629917f59e` |
| `ascii-waves-react-01/evidence/comparisons/react-1440-flower.png` | `29ef63952500e4aba602951941f4bd43b1ea987d88a52f0fc326c4629917f59e` |
| `ascii-waves-react-01/evidence/comparisons/comparison-1440-flower.png` | `6857012d25e3e3023bdcc72d9f58b445f15a96c98524b392efcb3ab885b6cf54` |
| `ascii-waves-react-01/evidence/comparisons/original-390-flower.png` | `85db29e3355205bbaaf979cd1e17925c8a1fd2931bc3ea3adf605be21a140636` |
| `ascii-waves-react-01/evidence/comparisons/react-390-flower.png` | `85db29e3355205bbaaf979cd1e17925c8a1fd2931bc3ea3adf605be21a140636` |
| `ascii-waves-react-01/evidence/comparisons/comparison.json` | `e521ad2cf648db037f569a16aa3b19fd4aa5b5808482a222e096564a7b179bd2` |

These are source-review baselines. The Nullworx lab and homepage add page chrome, use
different crops and intentionally are not claimed as new pixel-approval evidence. What is
verified here is the stronger static property that the effect source bytes and renderer
tree are unchanged, plus the browser smoke and reduced-motion captures in
`evidence/screenshots/`. The current build has not been declared visually approved.

## Excluded assets and reasons

- Pexels jellyfish, koi and smoke reels: redistribution rights were not independently
  verified.
- Orion/NASA reel: source review says cleared, but it is outside the Flower-only V0.1
  vertical slice.
- Additional posters, recordings, review pages and evidence from the source experiments:
  not required to ship the single reviewed effect.
- `node_modules`, `.next`, build output, caches, browser profiles, secrets and local-only
  test pages.
- The three pre-existing UI Forge components and gallery: reviewed as context, not
  migrated because they are not Nullworx release candidates.

## License and ownership disposition

- Site code and the copied effect code: MIT, copyright 2026 CipherCuttle. The source
  experiments remain their own trees and are not re-licensed by this repository.
- Flower video: MDN sample media, CC0 1.0.
- Poster: derivative of the CC0 Flower clip, retained as CC0 1.0.
- Fonts: SIL OFL 1.1 via Fontsource.
- No React Bits, Pexels, NASA or unlicensed stock asset is distributed.

See `app/licenses/page.tsx`, `evidence/dependencies/` and `public/media/credits/flower.md`.
