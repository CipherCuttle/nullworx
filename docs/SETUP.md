# Local setup and operator notes

## Prerequisites

- Node.js `>=22.12.0` (the verified runtime was Node 24.20.0)
- pnpm `12.15.0` via Corepack
- Google Chrome for the Playwright suite
- No global database, SMTP server, Brevo account or analytics account required

## Install

```sh
git clone https://github.com/CipherCuttle/nullworx.git
cd nullworx
git switch feat/nullworx-v0-1-foundation
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

The default env file has `NEWSLETTER_PROVIDER=disabled`. The app is fully viewable without
any secret. The newsletter form will show the unavailable state; this is correct.

## Newsletter modes for local work

### Disabled

Leave `NEWSLETTER_PROVIDER=disabled`. The API returns 503 and stores nothing. Use this for
normal UI work and any public preview.

### Mock

```sh
NEWSLETTER_PROVIDER=mock
NEWSLETTER_ALLOW_MOCK=1
NEWSLETTER_MOCK_SECRET="$(openssl rand -hex 32)"
```

Restart the dev server. Submit the form and use the generated “Exercise the confirmation
flow” link. No email is sent. Mock data disappears when the process restarts. Do not put
these values on a public host.

### Brevo

Do not configure this until the launch gates in `docs/NEWSLETTER.md` are complete. Use a
server-only env file. A production Brevo build requires:

- `BREVO_API_KEY`
- `BREVO_DROPS_LIST_ID`
- `BREVO_DOI_TEMPLATE_ID`
- `NEWSLETTER_CONFIRM_REDIRECT_URL=https://nulllworx.site/drops/confirmed`
- `NEWSLETTER_IP_HASH_SECRET` (32+ characters)
- `NEXT_PUBLIC_SITE_URL=https://nulllworx.site`

## Production build

```sh
pnpm verify
pnpm test:e2e
pnpm verify:seo
```

`pnpm test:e2e` uses port `3300` and starts a production server for you. `pnpm verify:seo`
needs a running server; use `--base-url=http://127.0.0.1:3300` when it is already running,
or run it from the Playwright process environment. It writes
`evidence/seo/report.json`.

The current build has no deployment configuration, no Dockerfile and no host-specific
`vercel.json`/`netlify.toml`. Adding a host is a deliberate owner decision after domain
confirmation. A standard Node host must run `pnpm build` and `pnpm start`; use a managed
process and HTTPS.

## Host deployment preflight

- [ ] Confirm ownership/control of the exact canonical origin (including three `l`s).
- [ ] Choose apex vs `www`; configure one canonical redirect at the host.
- [ ] Force HTTPS and HSTS after the certificate is stable.
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS origin at build time.
- [ ] Set provider secrets only in the host’s server-side environment.
- [ ] Keep `NEWSLETTER_PROVIDER=disabled` until real collection is approved.
- [ ] Install a durable rate-limit store if more than one app instance will run.
- [ ] Configure host access-log retention and a privacy mailbox.
- [ ] Build from a clean checkout with the frozen lockfile.
- [ ] Run the production smoke suite against the exact artifact.
- [ ] Do not submit sitemaps, send email or announce until the owner approves release.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Newsletter returns “not open yet” | `NEWSLETTER_PROVIDER` is disabled or incomplete; this is the safe default |
| Mock mode refuses in production | `NEWSLETTER_ALLOW_MOCK` must be explicit; never set it publicly |
| Brevo mode silently disabled | Missing list/template/key/redirect, redirect not canonical, or IP secret shorter than 32 |
| Canonical shows localhost | `NEXT_PUBLIC_SITE_URL` is read at build; rebuild with the production origin |
| WebGL field stays a poster | GPU/WebGL blocked, unsupported codec, or headless flags; check console and fallback |
| Playwright cannot launch | Install Google Chrome or adjust the `channel` in `playwright.config.ts` with owner approval |
| Screenshots fail to settle | The headless GPU is slow; inspect `test-results/` and the captured trace |
| Build fails on effect validation | Do not bypass; check source hashes, archive digest, component paths and schema version |
| Secret scan flags a placeholder | Remove or shorten the value; never commit a real key |

## Repository hygiene

- `drafts/`, `.env*`, `.next`, `node_modules`, test results and raw screenshots are ignored.
- `evidence/` is generated evidence, committed deliberately.
- The original experiments under `~/DevHub/experiments/` are read-only inputs. Do not
  format, refactor, move or delete them.
- Do not force-push, rewrite `main`, merge or deploy from this task.
