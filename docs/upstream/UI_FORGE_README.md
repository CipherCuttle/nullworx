# UI Forge v0.1

Three original React + TypeScript components and a local, interactive gallery, built on the existing shadcn registry template. The interface and component implementations were authored for this project. No React Bits source or animation library is used.

## Local development

```sh
pnpm dev --port 3100
```

Use a free local port. The existing project uses Next.js 15.5.9, React 19.1, Tailwind 4, and the installed shadcn 3.0.0 CLI. The template utilities and example source files remain available; the published registry index contains exactly the three Forge items.

## Install in another project

Start the local gallery, then run this in a React project already configured with `components.json` for the shadcn CLI:

```sh
npx shadcn@3.0.0 add \
  http://localhost:3100/r/command-button.json \
  http://localhost:3100/r/signal-card.json \
  http://localhost:3100/r/reveal-heading.json
```

Each item installs one `.tsx` file and its colocated `.module.css` file into the project's configured UI alias. With the default alias, imports are:

```tsx
import { CommandButton } from "@/components/ui/command-button";
import { SignalCard } from "@/components/ui/signal-card";
import { RevealHeading } from "@/components/ui/reveal-heading";
```

**Consumer requirements:** React 18+ with its matching React DOM version, TypeScript, and a bundler that supports CSS Modules (for example, Next.js or Vite). These components do not require Tailwind, Next.js, shadcn at runtime, Lucide, a utility helper, or an animation package. The CLI needs a configured project; manual copying does not.

For manual installation, open **Code**, copy **both** source files into the same folder, then open **Usage** and copy the example. Adjust the usage import alias if needed. **Copy source** copies the selected source file. **Copy usage** copies the complete example, including imports and client directive. Examples follow the current controls, including loading and disabled states. Copying needs a secure context such as localhost or HTTPS; a clipboard failure is announced and the selectable code remains available.

## Component APIs

All three accept native element attributes, `className`, and `style`. Native event handlers pass through. Component styles use CSS Modules with no global selectors, stylesheet injection, or consumer-wide token changes.

| CommandButton prop | Values / default |
| --- | --- |
| `variant` | `solid` (default), `outline`, `ghost` |
| `accent` | `copper` (default), `teal`, `violet` |
| `size` | `sm`, `md` (default), `lg` |
| `loading`, `disabled` | `false`; both block activation using native `disabled` |
| `loadingLabel` | `Working…`; keep descriptive when supplying a custom `aria-label` |
| `showArrow` | `true`; the arrow is decorative |
| `type` | `button`; explicitly use `submit` for form submission |
| `ref` | Forwarded to the native button |

| SignalCard prop | Values / default |
| --- | --- |
| `heading`, `metric` | Required; string heading and ReactNode metric |
| `description` | Optional string |
| `status` | Optional `positive`, `neutral`, or `warning` |
| `statusLabel` | Optional replacement for `On track`, `Steady`, or `Needs attention` |
| `headingLevel` | `2`, `3` (default), `4` |
| `actions`, `children` | Optional ReactNode slots; supply accessible buttons/links |

SignalCard is a labeled article, with no extra tab stop. Its actions keep their native behavior. The card does not assume navigation or invent metric data.

| RevealHeading prop | Values / default |
| --- | --- |
| `text` | Required string; whitespace preserved |
| `as` | `h1`–`h6`; default `h2` |
| `duration` | Sequence time budget in milliseconds; default `700` |
| `delay` | Initial delay in milliseconds; default `0` |

Timing values are clamped to 0–10000ms and nonfinite values use defaults. The sequence runs on mount; change `key` to replay. Text stays available to assistive technology during the animation. `prefers-reduced-motion: reduce` shows it immediately, with no delay, translation, or blur. Button hover/loading and card hover also respect reduced motion. Choose the correct heading level for the consuming page.

## Visual foundations

The gallery uses warm paper, graphite, copper, and sage. Component tokens have built-in fallbacks, so they work without the gallery stylesheet.

| Foundation | Values |
| --- | --- |
| Color | paper `#faf9f6`, surface `#fffefa`, ink `#292924`, muted `#696960` |
| Accent | copper `#b54d2f`, teal `#246b62`, violet `#6b50a0` |
| Typography | gallery: existing Geist / Geist Mono; components: inherit consumer font |
| Spacing | 4px base rhythm; 8, 12, 16, 20, 24px component spacing |
| Border | 1px `#e3e0d9` |
| Radius | 8px controls, 14px surfaces |
| Shadow | restrained neutral shadow; hover `0 12px 32px #2929240b` |
| Motion | 180ms button, 220ms card, 700ms heading budget; reduced-motion overrides |

Optional inherited or element-scoped CSS custom properties: `--forge-font`, `--forge-accent` (button), `--forge-radius-control` (button), `--forge-radius-surface`, `--forge-surface`, `--forge-border`, `--forge-ink`, and `--forge-muted` (card), plus `--forge-ink` for headings. Set these on a component or a local wrapper. The files do not define `:root` variables. Maintain contrast when overriding colors.

## Registry and verification

The existing [shadcn registry item schema](https://ui.shadcn.com/docs/registry/registry-item-json) and `shadcn build` remain the distribution mechanism. No package distribution layer is added. `registry.json` is the source index; `public/r/*.json` contains the built items, including exact TSX and CSS content. The small registry script synchronizes the public index and checks schema validity, payload parity, scope, and dependency declarations.

```sh
pnpm lint
pnpm typecheck
pnpm registry:build
pnpm registry:validate
pnpm build
pnpm start --hostname 127.0.0.1 --port 3100
```

`scripts/browser-gallery.mjs` and `scripts/browser-consumer.mjs` are Playwright browser callbacks, executed through the connected Playwright tool. The gallery callback reads the **real system clipboard**, checks controls and keyboard behavior, and captures the requested desktop/mobile screenshots. Its returned source and usage strings are saved in `evidence/copied/` for the clean consumer test. Execute the callbacks with their leading `export default` removed, as function expressions; they require no extra project dependency.

With that clipboard evidence present and the registry server running:

```sh
FORGE_ORIGIN=http://127.0.0.1:3100 node scripts/smoke-consumer.mjs
```

This creates a temporary Next.js consumer outside the repository, installs fresh dependencies, uses the real shadcn CLI against the generated artifacts, compares installed/copied source, builds six copied-usage routes plus a composed route, and asserts no consumer global CSS or runtime dependencies were added. It deliberately has no Tailwind, gallery CSS, or shared component utility. The script prints its temporary path; start that consumer on port 3101 before running the consumer browser callback.

See [the verification record](docs/VERIFICATION.md) for actual commands, results, screenshots, review findings, known limitations, and rollback notes. No deployment or publishing is part of this project.
