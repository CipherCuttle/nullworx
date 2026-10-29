# Consolidation 01 — rollback

This work is isolated on `feat/consolidation-01` in a separate worktree. There is
no database migration, deployment, package publication, subscriber collection or
remote state.

## Return to the branded foundation

```sh
cd /home/swirky/Documents/deepseek-harness/default-workspace/nullworx-consolidation-01

# Keep the branch for review:
git switch feat/nullworx-v0-1-foundation

# Or discard the consolidation commit(s) explicitly:
git switch feat/nullworx-v0-1-foundation
git branch -D feat/consolidation-01
```

If the branch was pushed to a remote (it was not in this session), delete it only
after the owner confirms no review is pending:

```sh
git push origin --delete feat/consolidation-01
```

Remove the disposable worktree after switching away:

```sh
cd /home/swirky/DevHub/experiments/nullworx-site-preview
git worktree remove /home/swirky/Documents/deepseek-harness/default-workspace/nullworx-consolidation-01
```

Remove the disposable baseline worktree used only for before recordings:

```sh
git worktree remove --force /home/swirky/Documents/deepseek-harness/default-workspace/nullworx-baseline-run
```

The preserved source roots were never modified and do not need restoration:

```sh
# Verification result: 8/8 roots byte-identical to the G0 baseline.
node scripts/source-preservation.mjs --output evidence/g0/source-preservation-final.json
```

## Revert only the homepage repair

The renderer source is untouched. The repair is confined to:

- `components/effects/ascii-waves-canvas.tsx`
- `components/effects/home-field.tsx`
- `components/effects/ascii-waves-canvas.module.css`
- `components/effects/home-field.module.css`
- `components/effects/effect-lab-preview.tsx` / `.module.css`
- `scripts/verify-home.mjs` (test only)

Reverting those files returns the old hardcoded LIVE badge and the old blocked/
reduced ambiguity. Do not describe that state as verified.

## Revert only a lab route

Remove the route directory under `app/lab/<slug>/` and its entry from
`lib/labs/catalog.ts` / preview dispatcher `components/labs/lab-preview.tsx`. The
preserved renderer copies under `experiments/`, `registry/new-york/`,
`lib/composition/` and `components/labs/composition/surfaces/` are independent and
can stay for audit. Do not delete the original experiment roots.

## Media and evidence

Generated clips, screenshots and JSON receipts are under `evidence/`. They are
review artifacts, not source. Removing them does not affect the app. Keep
`evidence/g0/branded-visual-baseline/` if the pre-consolidation screenshots are
needed for comparison.

## What must not be rolled back silently

- The `OWNER_REVIEW` status of ASCII Waves.
- The noindex headers on `/lab/*`.
- The release gate (`00 released`).
- The source/licence notices under `third_party/` and `public/media/credits/`.
