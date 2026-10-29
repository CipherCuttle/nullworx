# G5-A rollback

The G5-A work is isolated on branch `feat/g5a-living-type-01` and worktree
`nullworx-g5a`. The G3-A source worktree was not cleaned, reset, committed or
overwritten.

## After commit, before merge

```sh
# From the source repository:
git worktree remove /home/swirky/Documents/deepseek-harness/default-workspace/nullworx-g5a
git branch -D feat/g5a-living-type-01
```

Only do this after confirming no G5-A commits are wanted and the draft PR is
closed. The consumers are outside the source tree and can be removed separately:

```sh
rm -rf /home/swirky/Documents/deepseek-harness/default-workspace/g5a-consumers
```

## Revert the commit

```sh
git switch feat/g3a-composition-proof
git revert <g5a-commit-sha>   # after the branch has been merged or cherry-picked
```

The G5-A commit does not modify existing UI Forge component source, the
preserved G3-A evidence, the source worktree, or PRs #1/#3/#4.

## Remove only the product surface

If the demo/build is unwanted but the registry item is wanted:

- Delete `app/living-type/` and `components/living-type-demo/`.
- Remove the G5-A scripts from `package.json`.
- Remove `registry.g5a.json`, `registry/nullworx/living-type-01/`, and
  `public/r/living-type-01.json`.
- Restore `scripts/registry.mjs` and `public/r/registry.json` from the base
  commit.
- Restore `README.md`, `THIRD_PARTY_NOTICES.md` and `docs/` as desired.

The G3-A source worktree remains at
`/home/swirky/Documents/deepseek-harness/default-workspace/nullworx-g3a`, branch
`feat/g3a-composition-proof`, HEAD
`e5e4119e791e7815b8b6e8efe4439b123fc61225`, with its original uncommitted
G3-A.1 harness changes and evidence intact.
