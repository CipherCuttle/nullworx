# UI Forge v0.1 — verification record

Date: 2026-10-23. Root: `/home/swirky/DevHub/experiments/ui-forge`.

**Verdict: ready for local use.** Exactly three original, independently reusable registry items. All required checks pass; 43 gallery assertions and 53 clean-consumer assertions pass. No remaining functional failures or Critical/High findings. No deployment, publishing, push, merge, or production changes.

## PLAN

Inspected the template before changes: Next.js 15.5.9, React 19.1.0, Tailwind 4, TypeScript 5.9.2, ESLint 9, and shadcn CLI 3.0.0. Preserved the existing dependencies, aliases, font setup, global stylesheet, and template utility/example source. Used the existing registry schema and `shadcn build`; no separate component distribution architecture.

The working tree already contained a modified `pnpm-lock.yaml` and untracked `pnpm-workspace.yaml`. Both were hashed before implementation and match those hashes after verification. They are excluded from the Forge changeset manifest. See [preservation evidence](../evidence/checks/preserved-inputs.txt).

Applied context-budget-router, React best-practices review, and flow-verification guidance. Relevant React and shadcn APIs were checked through Context7 and the official shadcn schema. MemPalace tools were unavailable. No agent delegation, infrastructure tools, or external write tools were used.

Visual language: warm paper and graphite, copper/teal/violet accents, inherited typography, a 4px spacing rhythm, 1px borders, 8px controls, 14px surfaces, restrained shadows, and 180/220ms interactions. Component fallbacks are scoped to CSS Modules. Token values and overrides are documented in [README](../README.md#visual-foundations).

## CHANGESET

| Files | Purpose |
| --- | --- |
| `registry/new-york/command-button/command-button.tsx`, `command-button.module.css` | Native button; variants, accents, sizes, loading, disabled, focus and hover; forwarded ref |
| `registry/new-york/signal-card/signal-card.tsx`, `signal-card.module.css` | Labeled metric article; optional status, description, children and actions; quiet hover |
| `registry/new-york/reveal-heading/reveal-heading.tsx`, `reveal-heading.module.css` | Semantic heading; word reveal, duration/delay, accessible full text and reduced motion |
| `components/forge-gallery.tsx`, `forge-gallery.module.css` | Responsive gallery, live controls, keyboard tabs, source/usage copying, installation information, composition and foundations |
| `lib/forge.ts`, `lib/usage.ts` | Gallery metadata, shared preview settings, executable prop-driven usage examples |
| `app/page.tsx`, `app/layout.tsx` | Load real source files on the server and render the gallery; replace template metadata |
| `registry.json`, `public/r/registry.json` | Index of exactly three Forge items |
| `public/r/command-button.json`, `signal-card.json`, `reveal-heading.json` | Standard shadcn artifacts containing TSX and CSS Modules |
| Removed `public/r/hello-world.json`, `example-form.json`, `complex-component.json`, `example-with-css.json` | Remove the four generated demo payloads from the active registry output; template source remains |
| `package.json`, `eslint.config.mjs`, `tsconfig.json` | Direct ESLint script, typecheck and registry scripts; ignore generated declarations and clipboard evidence in repository checks |
| `scripts/registry.mjs` | Installed shadcn schemas, source parity, file pairs, scoped CSS and dependency verification; synchronize the public index |
| `scripts/browser-gallery.mjs`, `browser-consumer.mjs`, `smoke-consumer.mjs` | Reproducible browser callbacks and clean-project fixture |
| `README.md`, `docs/VERIFICATION.md` | Installation, APIs, token contract, limitations and actual verification |
| `evidence/` | Exact clipboard payloads, browser reports, final command logs, screenshots and file manifest |

The complete file-by-file list, including evidence, is [changed-files.txt](../evidence/changed-files.txt). The pre-existing lockfile/workspace changes are not part of this implementation.

## VERIFY

Environment: Node `v24.20.0`, pnpm `12.6.0`, headless Chromium `155.0.8059.39`.

| Actual command | Final result | Evidence |
| --- | --- | --- |
| `pnpm lint` | Exit 0; no lint errors/warnings | [lint.log](../evidence/checks/lint.log) |
| `pnpm typecheck` | Exit 0; `tsc --noEmit` | [typecheck.log](../evidence/checks/typecheck.log) |
| `pnpm registry:build` | Exit 0; all 3 shadcn artifacts and index pass | [registry.log](../evidence/checks/registry.log) |
| `pnpm registry:validate` | Exit 0; installed shadcn schemas, parity, scope, dependencies | [registry-validate.log](../evidence/checks/registry-validate.log) |
| `pnpm build` | Exit 0; optimized static gallery built, including lint/type checks | [build.log](../evidence/checks/build.log) |
| `pnpm start --hostname 127.0.0.1 --port 3100` | Local production build serves gallery and `/r/*.json` | Browser report below |
| `FORGE_ORIGIN=http://127.0.0.1:3100 node scripts/smoke-consumer.mjs` | Exit 0; fresh consumer install, CLI add, source checks, build and TypeScript | [consumer.log](../evidence/checks/consumer.log) |
| `git diff --check` | Exit 0 | Final local check |
| `sha256sum -c /tmp/ui-forge-session/user-files.sha256` | Both original user files match | [preserved-inputs.txt](../evidence/checks/preserved-inputs.txt) |

Browser callbacks were actually executed through the connected Playwright `browser_run_code_unsafe` tool, passing each file's content after removing its leading `export default` with `/^export default /m`. This requires no added test or runtime dependency in the repository. The callbacks contain the exact actions/assertions. This session used Playwright's real clipboard permissions and `navigator.clipboard.readText()`; clipboard behavior was not mocked.

### Gallery: 43 passing assertions

[Machine-readable results](../evidence/gallery-results.json); [callback](../scripts/browser-gallery.mjs).

- CommandButton: native type; Enter and Space; visible focus; solid/outline/ghost, size and accent controls; native loading/busy and disabled behavior; optional arrow.
- SignalCard: editable heading, metric and description; readable positive/neutral/warning status and no-status option; optional actions; keyboard activation and visible focus.
- RevealHeading: semantic level and accessible heading name; duration/delay controlled with the keyboard; normal timing; immediate reduced-motion content; replay.
- Preview/Code/Usage tabs: ArrowRight, Home, End, focus and selection.
- Real clipboard parity for six source files and three usage examples; selected-item installation command uses the live local origin.
- Unique label/panel IDs; composed primary/card actions; registry endpoint HTTP 200 and exactly three items.
- No horizontal overflow at 1440, 768, 390 or 320px.
- No uncaught runtime errors or failed network requests through Playwright/CDP. Final Playwright console query: 0 errors, 0 warnings.

### Clean consumer: install + build + 53 passing assertions

Fixture: `/tmp/ui-forge-consumer-0Xe3yC`. [CLI/build log](../evidence/checks/consumer.log); [browser results](../evidence/consumer-results.json); [callback](../scripts/browser-consumer.mjs).

The fixture installed fresh Next.js/React/TypeScript dependencies using `npm install --ignore-scripts --no-audit --no-fund`. The real installed shadcn CLI then ran `add` against all three generated local HTTP registry URLs, creating exactly six component files.

The fixture has **no Tailwind, gallery stylesheet, gallery tokens, icon library, animation package, or shared component helper**. Its only runtime dependencies remain Next, React and React DOM. Its global CSS sentinel is byte-for-byte unchanged after installation and build.

The script compiled and built:

- `/command-button`, `/signal-card`, `/reveal-heading`: real copied usage running against CLI-installed files.
- `/copied-command-button`, `/copied-signal-card`, `/copied-reveal-heading`: the same examples running against actual manually copied TSX and CSS files.
- `/composed`: all three working together outside the gallery, plus disabled/loading/native-style sentinels.

Examples intentionally contain quotes, ampersands and angle brackets to validate JSX serialization. All six standalone examples render, have working keyboard actions, and retain their own styles without the gallery. Both installation paths verify normal hover and reduced-motion behavior. The composed route confirms that native loading/disabled buttons are skipped by keyboard focus and that loading spinner motion stops under reduced motion. Unrelated consumer text and native button styling remain unchanged.

Next's first build initializes `next-env.d.ts`; the fixture's standalone `tsc --noEmit` runs after that initialization. Repository TypeScript excludes the raw clipboard evidence folder; the independent consumer compiles those exact examples instead. A final byte comparison confirmed the captured usage/source still matches the final registry and the tested consumer files.

### Screenshots

PNG dimensions and SHA-256 hashes are recorded in [manifest.json](../evidence/screenshots/manifest.json).

| Screenshot | Actual dimensions | Path |
| --- | --- | --- |
| Requested desktop viewport | 1440 × 900 | [desktop-1440x900.png](../evidence/screenshots/desktop-1440x900.png) |
| Requested mobile viewport | 390 × 844 | [mobile-390x844.png](../evidence/screenshots/mobile-390x844.png) |
| Full desktop gallery | 1440 × 2031 | [desktop-full.png](../evidence/screenshots/desktop-full.png) |
| Full mobile gallery | 390 × 2691 | [mobile-full.png](../evidence/screenshots/mobile-full.png) |
| Independent composed consumer | 1440 × 900 | [consumer-composed.png](../evidence/screenshots/consumer-composed.png) |

### Targeted review and resolved failures

Performed **one targeted review** of component APIs, native semantics/focus, motion, prop/usage serialization, scoped CSS, registry payloads, consumer independence, the implementation diff, and desktop/mobile screenshots. No Critical or High findings remain. No additional review cycle or scope expansion followed.

Verification found and corrected ambiguous implicit prop-field labels (replaced with explicit `htmlFor`/`useId` associations) and a decorative hero mark causing 4px of overflow at 320px (hidden below 360px). The requested 390px view was already within its viewport; the corrected 320px check now passes as well.

Test setup failures were corrected before the final run: generated Next declarations needed an ESLint exclusion; the initial evidence writer added a trailing newline and was replaced with exact-byte recording; a fresh Next fixture needed its first build before standalone CSS Module typechecking; an action selector needed to include its visible arrow; and the gallery callback now resets reduced-motion emulation left by the consumer callback. Final reports contain zero failed assertions.

### Remaining warnings and coverage limits

- **No remaining functional/check failures.**
- Next emits the existing multiple-lockfile/workspace-root inference warning, selecting `/home/swirky` for tracing. Build succeeds. Ancestor files and the pre-existing user lock/workspace files were preserved.
- Port 3000 was occupied at initial startup; verification uses loopback ports 3100 and 3101.
- The Chrome DevTools connector could not launch its headful browser without an X server. Runtime/network verification used a real Chrome DevTools Protocol session from Playwright instead.
- Browser evidence covers Chromium, not Firefox/WebKit or a manual screen-reader session. Actual consumer installation was tested with React 19.1.0 and Next 15.5.9; the source uses React 18-compatible APIs.
- Manual copying requires **both** TSX and the colocated CSS Module. Clipboard writes need localhost/HTTPS or another secure context; failure feedback and selectable text are provided.

## VERDICT

All three components are reusable outside the gallery, through both generated shadcn artifacts and manual copying. This was verified in a clean consumer without gallery dependencies or global CSS changes. Exactly three Forge registry items are exposed. No new runtime dependencies were added to the original project.

The local gallery remains available at `http://127.0.0.1:3100`. The consumer fixture is retained for inspection; its temporary server is stopped after testing.

**Rollback risks:** local files and generated registry artifacts only. Revert the specific Forge changes in the file manifest, restore the four original generated demo artifacts if restoring the template index, and rebuild the registry/app. Do not use a blanket reset or delete the user's existing lock/workspace changes. Generated `.next` output is disposable; a development server sharing that output may need restarting after a production build. The clean fixture lives under `/tmp` and has no production data. There are no database, deployment, infrastructure, or published-package changes to roll back.
