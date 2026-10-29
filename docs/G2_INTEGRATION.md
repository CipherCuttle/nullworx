# G2 integration notes

## What is implemented

- `lib/effects/types.ts` — a metadata-only `EffectDefinition<TParams>` contract:
  stable ID, version, title, status, render technology, summary, Zod runtime validator,
  defaults, lazy preview loader + route, capabilities, reduced-motion behavior, supported
  export targets, license and provenance.
- `lib/effects/schemas.ts` — Zod schemas for HoloType, Paper MeshGradient and Motion
  behavior parameters.
- `lib/effects/definitions.ts` — three definitions. The loaders are dynamic imports, so
  importing metadata does not pull the renderers into the lab shell bundle.
- `lib/effects/validate.ts` — `validateEffectParams` returns typed data or issue strings.
- Three self-contained adapters under `components/labs/`:
  - `holotype-preview.tsx` — imports the existing effect; owns preset, tone, motion,
    sliders and validation.
  - `paper-mesh-preview.tsx` — imports `MeshGradient` directly; owns presets, speed,
    distortion, swirl, pause, WebGL probe and reduced-motion speed.
  - `motion-behavior-preview.tsx` — uses `motion/react` `motion`, `AnimatePresence`,
    `useReducedMotion`; owns mode selection, layout indicator, entry transitions and replay.
- `app/labs/effects/page.tsx` — experimental, `noindex` route. The existing `/` gallery is
  untouched.

## Deliberate non-goals

- No universal renderer, effect props interface, plugin API, composition graph or
  per-combination renderer switch.
- No registry item for the three lab effects (G5 is design-only).
- No PNG/video export, marketplace, newsletter, payment or deployment.
- No vendored Paper Shaders/Motion source and no fork of their renderers.

## Runtime choices

- Paper: `minPixelRatio={1}`, `maxPixelCount={1_200_000}`. The shader pauses when
  `speed=0`; Paper's own `dispose()` clears the context and observers on unmount.
- Motion: discrete interactions plus one small repeating pulse only in `scan` mode. Reduced
  motion sets transitions to 0 ms and stops the pulse. Unmount tears down Motion's rAF work.
- HoloType: the source CSS handles `prefers-reduced-motion`; the adapter also resolves
  `motion="auto"` + OS preference to `motion="reduced"` and exposes an explicit still state.
- All previews are client components. Paper's WebGL probe runs in `useEffect`, so the
  server-rendered markup never touches `window`, `canvas` or WebGL.

## Verification entry points

```sh
pnpm lint
pnpm typecheck
pnpm registry:validate
pnpm build
pnpm verify:contract
```

The browser harness is `scripts/verify-effects.mjs`. It is not part of the production
bundle. Run it against `pnpm start --hostname 127.0.0.1 --port 3100`. Evidence is written
outside the committed tree (default `evidence/`, gitignored).

## Rollback

Delete the branch (`feat/forge-foundation-g2`) or revert its commits. The base repository
had only `README.md`; no migration, runtime data or production resource needs rollback.
The source roots remain byte-identical to the G0 snapshots.
