# ASCII golden-master audit — finalization receipt

Date: 2026-10-30. Status: **ready for owner review**. PR #6 remains a draft. Nothing was
merged, deployed or published. The audit verdict is unchanged:
**FEATURE_PARITY_INCOMPLETE**.

This receipt records the maintainer verification performed after the audit. It is deliberately
**not** listed in `SHA256SUMS.txt`, because the instruction for this pass was to preserve the
original checksum manifest rather than regenerate it. The manifest is byte-for-byte unchanged.

## Baseline, backups and initial state

| Item | Value |
| --- | --- |
| Branch | `feat/consolidation-01` |
| Audit baseline commit (parent of the finalization commit) | `9926dbcb52f60348ddb5878eefe204451babd9d7` |
| Initial working tree | 4 modified tracked files, 185 untracked audit files, 0 staged |
| `HEAD` during verification | unchanged at `9926dbc` |
| `SHA256SUMS.txt` SHA-256 | `64525f6e1b47295b0e2d0dd5fc81f9d913bbafa3be156ffc252a29fd88c01f28` |

Binary backups were written outside the repository before any work:

| Backup | SHA-256 |
| --- | --- |
| `tracked-working-tree.binary.patch` (all tracked modifications vs `9926dbc`) | `0539f9b0db78c5103a02eef7423f0d37d611627e5f9a0308aaa199c2b86f19a7` |
| `untracked-audit-evidence.tar.gz` (report, 171 evidence files, 13 scripts) | `8778ac557c391ad8b39febae918832183cf22297b3869a301461fb361fbd68cf` |
| `nullworx-baseline-9926dbc.bundle` (complete branch history) | `8f087a0de524748e207ea59c2a8ae9411f0fc9b74d2a542e468dbd3ac803c493` |
| `initial-file-hashes.sha256` + `initial-status.txt` | `c9af8e7227a8970eba7d3798fefb70b2bccd3225e88e227f5a2c9d8e0247dd95` |

Location: `/home/swirky/Documents/deepseek-harness/default-workspace/nullworx-audit-backups/20261030T191538Z`

The archive round-trip was verified file-by-file against the live tree (171/171 hashes equal),
`gzip -t` passed, and `git bundle verify` reported a complete history. The 14 source-diff
filenames containing spaces required NUL-safe handling; they are present and correct.

## Gate 1 — checksum verification

The previously reported failure was **working-directory**, not content drift.

- The manifest is written in evidence-relative form, with repository files addressed as
  `../../scripts/...` and `../../ASCII_GOLDEN_MASTER_AUDIT.md`.
- Run from the repository root, even the evidence-relative entries (`REVIEW.html`,
  `logs/...`) cannot resolve, so the first lines fail before the `../../` entries are reached.
- Run from the evidence directory, the manifest resolves exactly as written.

Receipt (from `evidence/ascii-golden-master-2026-10-30`):

```text
sha256sum: 184 lines checked
184 OK, 0 FAILED
exit 0
```

No expected hash was regenerated, no manifest entry was edited, and no artifact was
re-created to satisfy the checksum. The two `../../scripts/ascii-golden-master/*.mjs` files
named in the earlier failure are present and match.

## Gate 3 — repository verification

All commands were executed against the production server (`pnpm build` output, served with
`pnpm start`); the golden-master scripts used the archived app on `:3217` and the production
consolidation on `:3220`.

| Command | Exit | Result |
| --- | ---: | --- |
| `pnpm verify` | 0 | lint, typecheck, effect manifest, **51/51 tests (7 files)**, production build, secrets |
| `pnpm verify:home` | 0 | **49/49** checks |
| `pnpm verify:labs` | **1** | **355/359** — four WebKit-only homepage assertions; see discrepancy below |
| `pnpm test:e2e` | 0 | **26/26** Playwright tests |
| `pnpm check:secrets` | 0 | no credential patterns in source or built client assets |
| `git diff --check` | 0 | no whitespace errors |

The WebKit failure is recorded rather than hidden. It is reproducible on the audit baseline
and is attributed to the engine, not to this changeset (details below).

## Golden-master reproduction

Reproduction was run in a scratch mirror (`/tmp/nullworx-audit-repro-…`, node_modules
symlinked) so that the committed receipts and screenshots were not overwritten. The mirror
read the same production origins; every run exited 0.

| Script | Exit | Result |
| --- | ---: | --- |
| `verify-flows.mjs` | 0 | **46/46** checks; the two native background-window observations remain explicitly inconclusive |
| `visibility.mjs after` | 0 | 2/2 routes pause on the labelled visibility event and resume |
| `final-extras.mjs` | 0 | 2/2 forced-VP9 decode+2.2 s offset branches; 2/2 final smoke; DPR1 pair 1440×900 |
| `mobile-controls.mjs` | 0 | 2/2 mobile routes hold video/clock, apply lab density/quality, no overflow |
| `capture.mjs after` | 0 | 20 cases from three origins (`:3217`, `:3220/`, `:3220/lab/ascii-waves`), 0 errors |
| `device-pixels.mjs` | 0 | native 2880×1800 DPR2 pair |
| `performance.mjs` | 0 | 143.63 fps on all four ABBA samples and both native placements |
| `motion.mjs` | 0 | 4 clips, 587–594 screencast frames, 862–863 observed render ticks each |
| `preservation.py` | 0 | 5/5 original trees unchanged; 90/90 historical Proof 03 hashes; 5/5 preserved component files match UI Forge |

`consolidatedHeadUnchanged` is `false` in the mirror receipt only because the mirror is not a
Git repository; the real worktree HEAD was verified separately as `9926dbc` throughout.

### Nine controlled comparisons

| Scene | Size | MAE | Changed pixels |
| --- | --- | ---: | ---: |
| desktop 2.2 s / clock 0 | 1440×900 | 0 | 0 |
| desktop 2.7 s / 0.5 | 1440×900 | 0 | 0 |
| desktop 3.2 s / 1 | 1440×900 | 0 | 0 |
| desktop 4.2 s / 2 | 1440×900 | 0 | 0 |
| desktop 3.2 s / 1 + pointer | 1440×900 | 0 | 0 |
| mobile 2.7 s / 0.5 | 390×844 | 0 | 0 |
| mobile 4.2 s / 2 | 390×844 | 0 | 0 |
| DPR1 neutralized | 1440×900 | 0 | 0 |
| native device pixels | 2880×1800 | 0 | 0 |

**Independence control.** The archived pairs are byte-identical across variants, which is
expected for a deterministic renderer under held inputs but is also the signature of a
self-comparison. It was falsified by re-capturing from separately restarted servers: all 18
fresh images (golden and consolidated) reproduced the archived PNGs **byte-for-byte**,
including the 2880×1800 pair, and the nine fresh comparisons are again MAE 0. The golden and
consolidated sides come from different origins (`:3217` Vite Proof 03 vs `:3220` Next
production) with distinguishable markup; native-mode canvas sizes also differ (1440 vs
485.7 CSS px) before the controlled expansion. The pairs are two real renders, not one file
copied twice.

The CSS-size comparisons cannot by themselves exclude sub-pixel differences hidden by PNG
resolution, which is why the native 2880×1800 device-pixel pair is retained. The device pair
is also MAE 0.

## Recorded discrepancy — Playwright WebKit and the VP9 loop

`pnpm verify:labs` fails four assertions, all WebKit homepage state checks:
`webkit/desktop: homepage live`, `webkit/desktop: readout is LIVE`, and the two mobile
equivalents. All 355 other checks pass (all routes, the ASCII lab, Firefox, Chromium).

Observed in the failing receipt: `playback=blocked`, `videoTime=5.005` (equal to the WebM
duration), `paused=true`, `ended=false`, `loop=true`, no console or page errors.

- An isolated page using the same `flower.webm` reproduced the engine behaviour without the
  app: with `loop=true` the element never wraps; `currentTime` stays at `5.005` while
  `paused` and `ended` both remain false. Playback works for the first pass.
- The consolidation wrapper latches `blocked` when neither the video time nor the renderer
  frames advance for 650 ms after a 1200 ms settling window. That latch is truthful and
  recoverable through the visible Start/Motion control; the renderer keeps running.
- The audit baseline `9926dbc` behaves the same way, reaching `blocked` at about 7 s. The
  current tree reaches it at about 5.2 s because the documented 2.2 s start offset shortens
  the time to the end of the clip. The audit fix did not create the stall; it moved a
  pre-existing engine limitation into `verify:labs`' fixed 3.5 s sample window.

Consequences recorded for the owner:

1. The stale statement in `docs/CONSOLIDATION_VERIFICATION.md` that WebKit reaches LIVE is
   not edited in this changeset (outside the audit scope) but should be corrected.
2. A real fix would require either a wrapper/component end-of-media recovery or a
   test-harness allowance. Both change live behaviour or tests beyond the audited scope, so
   neither was done here.
3. In browsers whose media engines loop correctly, the 2.2 s opening is the reviewed golden
   behaviour and is unaffected.

## Performance caveat

143.63 fps is the 144 Hz panel's requestAnimationFrame cadence, not GPU execution time. The
receipts demonstrate no missed presentation frames for this workload on this host; they do
**not** measure GPU headroom, and they are not a guarantee for other hardware.

## Commit hygiene

The commit contains only the audit and the preserved local work:

- 4 modified tracked files: two audit edits (`ascii-waves-canvas.tsx` start offset,
  `effect-lab-preview.tsx` labels/help) and two **pre-existing** High-quality edits
  (`home-field.tsx`, `lib/effects/manifest.ts`) that predate the audit and are preserved
  byte-for-byte. `preservation/pre-existing.patch` and `preservation/pre-audit-files/` prove
  the split; the quality change is not attributed to this audit.
- `ASCII_GOLDEN_MASTER_AUDIT.md`, 13 scripts under `scripts/ascii-golden-master/`, the 171
  audit evidence files plus this receipt (~52 MiB total, largest single file 5.4 MiB). The
  motion clips are included
  because the report and `REVIEW.html` link them; no linked artifact is left missing.
- Not committed: `test-results/`, `.next/`, `tsconfig.tsbuildinfo`, `evidence/g4/` and the
  other ignored verification directories.
- `pnpm test:e2e` regenerated 12 tracked evidence screenshots and
  `evidence/tests/playwright-results.json`. Those generated changes were backed up and
  restored to `HEAD` so they do not enter this commit.
- No secrets: `check:secrets` passed and a manual scan of the evidence text found no
  credential patterns. `REVIEW.html` is a 6 KiB local page with no external requests.

## Rollback

Full pre-work state is in the backup directory above. To undo only this audit's two product
edits while keeping the preserved High defaults:

```sh
cd ~/Documents/deepseek-harness/default-workspace/nullworx-consolidation-01
git apply --reverse --check evidence/ascii-golden-master-2026-10-30/preservation/audit-only.patch
git apply --reverse evidence/ascii-golden-master-2026-10-30/preservation/audit-only.patch
pnpm build
```

The first command was re-verified (exit 0). To undo the whole finalization commit, use
`git revert` on it (or reset the branch to `9926dbc` only if no other work exists), or restore
from `nullworx-baseline-9926dbc.bundle` after `git bundle verify`. Do not blanket-reset: the
pre-existing quality edits and any later work must be preserved.

## Owner review still required

1. Compare the six-second side-by-side motion and the native homepage/lab presentation.
2. Decide whether the smaller embedded field (41×37 homepage glyphs at 1440×900) preserves the
   loved flower's legibility, and whether a Flower-only focus view is wanted.
3. Decide the follow-up for missing original controls, the mobile tray and full-screen review.
4. Confirm the pre-existing High-quality defaults now carried by the commit.
5. Decide whether to correct the WebKit documentation and whether the end-of-media behaviour
   needs a product fix.
6. No art approval, release approval or experimental-reel approval is implied by any of the
   automated checks above.
