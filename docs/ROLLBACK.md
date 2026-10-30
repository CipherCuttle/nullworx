# Rollback plan

There is no database migration, account state, checkout or permanent subscriber store in
this repository. Rollback is therefore a code/configuration/deployment action, not data
surgery. The preserved experiments are outside this repository and are never reset by
these steps.

## Fast rollback (deployment)

1. Stop or roll back the host to the previous known-good deployment revision. Do not edit
   production files in place.
2. Confirm `/`, `/effects`, `/drops` and `/privacy` return the expected version.
3. Confirm the canonical origin, HTTPS and redirects.
4. If the newsletter was enabled for the bad release, set
   `NEWSLETTER_PROVIDER=disabled` in the host environment and redeploy. This stops new
   collection immediately without deleting provider data.
5. Record the bad SHA, rollback SHA, time and symptoms in the incident log.

```sh
git log --oneline --decorate -10
git revert <bad-commit>       # on a new branch; do not force-push or rewrite history
pnpm install --frozen-lockfile
pnpm verify
# deploy the verified revert through the normal host process
```

## Local rollback

If the branch is not deployed, the safest rollback is to leave `main` untouched and reset
the working branch to its last reviewed commit **after checking that no owner WIP would be
lost**:

```sh
git status
git log --oneline --decorate -5
# Do not run a destructive reset while untracked/owner work exists.
git switch feat/nullworx-v0-1-foundation
git restore --source=<known-good-sha> --worktree -- .
```

Never use `git reset --hard`, `git clean -fd`, or force-push on a shared branch without
explicit owner approval and a verified backup. The original experiments live at
`~/DevHub/experiments/`; do not touch them.

## Rollback a released effect

If a release was recorded but must be withdrawn:

1. Set `status` back to `OWNER_REVIEW` (or `APPROVED` if only release packaging is wrong).
2. Set `publication.releasedAt` to `null`.
3. Set `releaseApproval` to `null` unless a corrected approval record is separately
   recorded.
4. Remove the archive from `public/downloads/` if it should no longer be distributed.
5. Rebuild and redeploy. `/effects/<slug>` returns 404; the sitemap drops the URL on the
   next generated build.
6. Remove or unpublish the GitHub release manually if one was created.
7. Do not send a “withdrawn” newsletter without an owner decision.
8. Notify anyone who downloaded the release if the reason is legal, security or data
   correctness, using the owner-approved channel only.

The schema intentionally rejects `RELEASED` without the approval/date pair, so a partial
rollback fails loudly.

## Rollback a newsletter configuration

- **Unexpected collection / provider outage:** set `NEWSLETTER_PROVIDER=disabled` and
  redeploy. The form returns a clear unavailable message and the API does not store new
  addresses.
- **Wrong redirect/domain:** the configuration refuses non-canonical redirects. If a live
  deployment is already misconfigured, disable collection, fix the env value, test DOI,
  then re-enable.
- **Provider credential exposure:** disable provider mode, revoke/rotate the API key in
  Brevo, rotate `NEWSLETTER_IP_HASH_SECRET`, inspect access logs, and follow the owner’s
  incident/privacy process. Do not paste the credential into an issue.
- **Bad DOI template:** disable the DOI template/list flow, fix in Brevo, test with a
  seed inbox, then re-enable. The app does not send campaign email itself.
- **Suppression/unsubscribe bug:** keep collection disabled and handle affected requests
  manually in Brevo. Do not delete suppression records or resume sending until resolved.
- **Mock accidentally enabled publicly:** set `NEWSLETTER_ALLOW_MOCK` to unset/0 and
  redeploy. Mock data is in-memory; restart clears it. This is not a real list.

No real subscribers exist in this repository. If a live deployment has them, provider-side
export/deletion remains an owner procedure; do not “clean up” by deleting the Brevo
account or suppression history.

## Rollback an archive / source change

The manifest hashes are the gate. Revert the source file and manifest hash together, rebuild
the archive, recalculate `installation.archiveSha256`, and run:

```sh
pnpm validate:effects
pnpm test
pnpm build
```

A hash mismatch is a failure, not a warning. Do not weaken the validator to ship.

## Rollback SEO / domain changes

- Revert the deploy to the previous revision.
- Restore host redirects/DNS only with owner approval.
- Do not remove old released URLs without a 301 plan.
- Keep `/robots.txt` and `/sitemap.xml` generated from code; do not hand-edit them.
- Search Console changes are external and should be recorded separately.

## Post-rollback verification

```sh
pnpm verify
pnpm test:e2e
pnpm verify:seo
```

- Public pages load and canonical URLs are correct.
- `/lab/ascii-waves` is noindex.
- No released effect remains public unless explicitly intended.
- Newsletter disabled or fixed; no accidental sends.
- Evidence and incident notes record what was observed, not assumed.

## What cannot be rolled back automatically

- emails already sent;
- a subscriber record already created at Brevo;
- search-engine crawls already performed;
- social posts already published;
- third-party caches/snippets.

Those require owner/provider action and clear communication. Prevention is why V0.1 stops
before merge, deployment, real subscriber collection and live email delivery.
