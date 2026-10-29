# G2.1 — framework security repair and deterministic CI

Status: implemented and locally verified. No merge, deploy or publication.
Base: G2 HEAD `07f91b50a7c0e108478dc0305c812b02a9a4ffc1`
Branch at the time of writing: `feat/g3a-composition-proof` (worktree based on G2 HEAD)
Date: 2026-10-29 Europe/Stockholm

This pass changes framework versions, the lockfile, CI configuration and one
prefetch behaviour in the G2 lab. It does not change the UI Forge gallery, the
registry items, any effect source or any effect contract.

## Advisories reviewed

### Next.js — 14 October 2026 update

Source: <https://nextjs.org/blog/nextjs-security-update-october-14-2026>

| Advisory | Severity | Affected range | Fixed in | Applies here? |
| --- | --- | --- | --- | --- |
| `GHSA-673q-mjm6-r5xr` — RCE in `use cache` functions returning typed arrays | Critical | Next.js `16.0.0`–`16.4.0` | `16.4.1` | **No.** This app is on 15.5 and does not use Cache Components. |
| `GHSA-2464-fhr4-w9xw` / `CVE-2026-96889` — RCE in the Image Optimization API with SVG, via `sharp` on glibc Linux | Critical | Next.js `10.0.0`–`15.5.27`, `16.0.0`–`16.4.0` | `15.5.28` / `16.4.1`, or `sharp >= 0.35.5` | **Yes** for the 15.5 line. Patched by both the Next bump and the `sharp` override. |
| `GHSA-p3m5-59mp-jv5r` / `CVE-2026-94482` — DoS in App Router Server Actions | High | Next.js `13.0.0`–`15.5.27`, `16.0.0`–`16.4.0` | `15.5.28` / `16.4.1` | **Applicable surface.** The app is App Router. It has no Server Actions, but the framework patch is still required. |

### React Server Components — 14 October 2026 update

Sources: <https://react.dev/blog>, <https://github.com/facebook/react/security-advisories>

| Advisory | Severity | Affected range | Fixed in | Applies here? |
| --- | --- | --- | --- | --- |
| `GHSA-xqc2-xf4c-x3h3` — RCE in RSC transport with multiple typed arrays | Critical | `react-server-dom-*` `19.0.0`–`19.0.8`, `19.1.0`–`19.1.9`, `19.2.0`–`19.2.8`, `19.3.0` | `19.1.10` (also `19.0.9`, `19.2.9`, `19.3.1`) | **Yes** for the React 19.1 line. `react`/`react-dom` were pinned at `19.1.0`. |
| `GHSA-h3gv-c5rc-p453` — DoS in Server Functions | High | `react-server-dom-*` `19.1.0`–`19.1.8` | `19.1.10` | **Yes** for the React 19.1 line. |

The December 2025 RCE (`CVE-2025-55182`, `GHSA-fv66-9v8q-g76r`) and the
January/May/July 2026 DoS advisories are superseded by the same `19.1.10`
patch level.

### Upcoming November release

On 27 October 2026 Next.js announced seven **medium** advisories for
**3 November 2026**, before patches are published:
<https://nextjs.org/blog/upcoming-nextjs-security-release-november-2026>.
They are not published yet and cannot be triaged. This is a tracked follow-up,
not a passed gate.

## Dependency changes

| Package | Before | After | Why |
| --- | --- | --- | --- |
| `next` | `15.5.9` | `15.5.28` | Patched 15.5 maintenance line; no Next 16 migration. |
| `react` | `19.1.0` | `19.1.10` | Patched 19.1 line for the RSC advisories. |
| `react-dom` | `19.1.0` | `19.1.10` | Must match `react`. |
| `eslint-config-next` | `15.3.1` | `15.5.28` | Match the framework line; lint behaviour is unchanged. |
| `sharp` (optional, via Next) | `0.34.3` | `0.35.5` | `GHSA-2464-fhr4-w9xw` requires `sharp >= 0.35.5`. Next 15.5.28 accepts `^0.34.3 \|\| ^0.35.5`, so the old range alone would keep resolving the vulnerable version. |
| `@img/sharp-libvips-linux-x64` | `1.2.0` | `1.3.4` | Pulled by the patched sharp release. |
| `shadcn` | `dependencies` | `devDependencies` | It is a build-time registry CLI. Moving it removes the whole MCP/express CLI chain from the production audit surface without changing runtime behaviour. |

`next` resolves `15.5.28` with tarball integrity
`sha512-JjhLBBY1PNnuwPtcZ7t8yxVeJVYvD2Jyp633J+gRCNbzSt7N0E+xqCf6uQiff3+3qmUkwcF/ksfSsK1xsZ76Tw==`.
`react`, `react-dom` and `eslint-config-next` resolve `19.1.10`, `19.1.10` and
`15.5.28`.

### pnpm 12 configuration move

pnpm 12 warns that `package.json#pnpm` is ignored. The previous lockfile recorded
the intended `@types/react` pins but the field was not being read. The overrides
now live in `pnpm-workspace.yaml`, where pnpm 12 reads them:

```yaml
overrides:
  '@types/react': 19.1.2
  '@types/react-dom': 19.1.2
  sharp: 0.35.5
```

`package.json#pnpm` was removed rather than left as dead configuration.

## Resolved RSC runtime

Next ships its own compiled RSC transport; the app does not install
`react-server-dom-webpack` directly. Both 15.5.28 compiled transports differ from
15.5.9 and include the "Improve Server Component transport protocol" change
(React PR #37843):

| File | 15.5.9 SHA-256 | 15.5.28 SHA-256 |
| --- | --- | --- |
| `dist/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-server.node.production.js` | `6763f738…35b0e2f` | `8a13f628…543f0a844` |
| `dist/compiled/react-server-dom-turbopack/cjs/react-server-dom-turbopack-server.node.production.js` | `def0c4c3…c6206f` | `4b9bb23c…18faac9` |

The bundled RSC peer version moved from `19.2.0-canary-7288a7d9-20251211` to
`19.2.0-canary-9aa4f723-20260123`; the application React runtime is pinned to
the patched stable `19.1.10` line.

## Production audit and triage

Commands:

```sh
pnpm audit --prod            # summary
pnpm audit --prod --json     # machine-readable triage input
pnpm why <package>           # confirm the actual path
```

Before (G2 HEAD plus the Next/React bump, before `shadcn` was classified and
before the sharp override): **47 findings — 1 critical, 26 high, 15 moderate,
5 low**. The only critical was `proxy-addr` through
`shadcn → @modelcontextprotocol/sdk → express`, a CLI that is never part of the
deployed application.

After: **12 findings — 0 critical, 9 high, 2 moderate, 1 low**.

| Severity | Package | Path | Reachability | Decision |
| --- | --- | --- | --- | --- |
| High | `postcss` (3 advisories) | `next > postcss` | Build-time CSS parser for repository-owned CSS. No runtime CSS input. | **Not applicable at runtime.** Next pins `postcss@8.4.31`; overriding a framework-pinned build dependency is not part of a minimal security repair. Track upstream. |
| High | `nanoid` (3 advisories) | `next > postcss > nanoid` | Build-time only; no runtime generator calls. | **Not applicable at runtime.** Same Next-pinned chain. |
| High | `source-map-js` | `next > postcss > source-map-js` | Build-time source maps only. | **Not applicable at runtime.** Same chain. |
| High | `browserslist` (2 advisories) | `next > styled-jsx > @babel/core > … > browserslist` | Build-time target resolution for repository-owned config. | **Not applicable at runtime.** Same chain. |
| High | `zod` | direct runtime dependency | Schemas accept only fixed enums, bounded numbers and booleans from app-owned defaults and local UI state. No untrusted network input, no unbounded collections. | **Not reachable in this app.** The fix is `zod >= 4.6.6`, a major upgrade; deferred as a separate decision. |
| Moderate | `postcss` (2 advisories) | `next > postcss` | Build-time. | Same as above. |
| Low | `@babel/core` | `next > styled-jsx > @babel/core` | Build-time. | Same as above. |

No **applicable** Critical or High finding remains. "Not applicable" here means
the vulnerable code path is not present in the deployed runtime, not that the
advisory is disputed. The residual build-time advisories are recorded as upstream
debt in `THIRD_PARTY_NOTICES.md`.

## CI

`.github/workflows/ci.yml` adds a deterministic static job:

1. `pnpm install --frozen-lockfile`
2. `pnpm lint`
3. `pnpm typecheck`
4. `pnpm registry:validate`
5. `pnpm verify:contract`
6. `pnpm build`

Pinned environment: Node `24.20.0`, pnpm `12.15.0`, Ubuntu runner.
`NEXT_TELEMETRY_DISABLED=1` and `CI=1`.

Browser tests are deliberately **not** in CI: no browser binary is pinned and no
server lifecycle is provisioned. The 43 gallery, 53 clean-consumer, 62 G2
browser and 24 contract checks were reproduced locally against the patched
build; remote CI is pending its first run.

The build uses `next/font/google` for Geist, so CI needs outbound network to
Google Fonts on a cold cache. This is inherited from the preserved UI Forge
layout and is not changed here.

## G2.1 regression fix

Next 15.5.28 began emitting a Chromium warning on `/labs/effects`:

> The resource `/_next/static/css/…css` was preloaded using link preload but not
> used within a few seconds from the window's load event.

The cause was the two in-viewport `Link href="/"` elements on the lab route
prefetching the gallery route and its CSS, which is then never applied. Both
links now use `prefetch={false}`. This removes an unnecessary prefetch and keeps
the harness's zero-console-warning gate intact. No gallery or registry file was
touched.

## Reproduction

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm registry:validate
pnpm verify:contract        # 24/24
pnpm build
pnpm start --hostname 127.0.0.1 --port 3100
EVIDENCE_DIR=evidence/g3a/g21/gallery  pnpm verify:gallery    # 43/43
EVIDENCE_DIR=evidence/g3a/g21/effects  pnpm verify:effects    # 62/62
# clean consumer: preserved smoke script, then upgrade the temp consumer to
# next@15.5.28 / react@19.1.10 before the 53 browser assertions
node scripts/smoke-consumer.mjs
node scripts/verify-consumer.mjs                              # 53/53
```

Visual regression: the home gallery screenshots and all reduced-motion lab
screenshots are byte-identical between the 15.5.9 baseline and 15.5.28.
Animated screenshots differ only by animation phase; dimensions and layout match.

## Residual risk and follow-ups

1. Next.js November 3, 2026 advisories (seven medium) are not published yet.
2. The audit's build-time advisories are upstream debt in Next's pinned
   `postcss`/`styled-jsx` chains. Re-check on each Next patch.
3. `zod@3.25.76` has an unreachable high; a zod 4 migration needs its own
   decision and tests.
4. CI has not run remotely yet.
5. Chromium-only evidence; no GPU-backed frame-rate claim.
6. No Next.js 16 migration was performed or implied.
