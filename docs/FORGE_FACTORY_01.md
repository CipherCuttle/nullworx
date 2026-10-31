# UI Forge Effect Factory 01 — initial independent proof

**Status:** EXPERIMENTAL / OWNER VISUAL REVIEW NEEDED. Not released, not a public catalog component, not offered for sale. Original white UI Forge is the aesthetic authority; **this white review gallery is an isolated approximation, not a rewrite or migration of the owner's local UI Forge app**.

- Source base: Nullworx consolidation PR #6, commit `059db3d13bd73d2a09f48d2060dd56014e0ab3fb`.
- Branch: `experiment/forge-effect-factory-01`.
- Preview: `/lab/forge-factory-01` (noindex), independent from existing nine-family lab index and public release manifest.
- Components: `components/forge-factory-01/glyph-morph.tsx`, `prism-text.tsx`, `magnetic-focus.tsx`.
- CSS Modules, React/TypeScript only; **zero new runtime dependencies**. Original implementation; no React Bits, Aceternity, or licensed effect source was copied.
- No images, external media, third-party videos, Rive runtime or user-supplied font artifacts are bundled.

## Proof properties

**Glyph Morph:** deterministic seeded glyph scrambling, adjustable duration, true semantic phrase for assistive technology, pause, reduced-motion freezing. React SSR does not require `window`.

**Prism Text:** real selectable DOM text, animated multi-stop spectral CSS gradient, speed/saturation controls, explicit pause, CSS reduced-motion stop.

**Magnetic Focus:** real keyboard-operable button, adjustable bounded pointer translation, cursor-position light, touch stays undisplaced, focus and disabled states, pause and reduced-motion stop. No WebGL/RAF/global listeners.

**Gallery:** white stage and controls, selects 3 independent effects, preset, speed, intensity, pause/replay, review-only labels, original-source file map. No effect routes added to public `/effects`, no sitemap, no public manifest, no licensing changes.

## Verify

1. `pnpm verify`: existing lint, TS, effect registry, unit tests, Next production build, secrets.
2. `pnpm exec playwright test tests/e2e/forge-factory-01.spec.ts`: 1440×900, 390×844, 320×720; 3 controls/switches, no horizontal overflow or page errors, keyboard button activation, reduced motion, noindex.
3. Dedicated workflow uploads actual screenshot artifacts for owner visual judgment.
4. No inherited WebKit/Flower claim: parent PR #6's `verify:labs` had 355/359 with WebKit VP9 loop failures. **Those remain open**, and this task does not weaken or falsely close them.
5. Recheck original protected-source preservation receipts before ever integrating or releasing. Local Jellyfish WIP does not exist in this remote snapshot and must not be touched.

## Gates before promotion

- Visual approval of both the effect behavior and white UI Forge gallery integration from the owner's actual desktop/mobile browsers.
- Clean fresh consumer React project copying only that effect's source files, with the documented required import and correct CSS handling.
- Cross-browser Chromium, Firefox, WebKit functional and visual checks, at minimum Safari/WebKit reduced-motion, context/CPU resource behavior.
- Performance baseline at declared desktop/mobile hardware; interaction and shader performance measured, no fabricated 60fps claims.
- Explicit original component and redistribution license, docs, release approval, package checksum and commercial rights decisions.
- Restore the canonical local white UI Forge WIP safely before any actual integration; **do not use this isolated route to overwrite it**.

## Next batches

- B: Spectral Field, Liquid Refraction, Refraction Cards (shader/material); separate source/runtime, WebGL fallback/quality scaling.
- C: Dither Reactor, Particle Morph, Condensation Reveal.
- D: Depth Theatre, Frame Scrub, Synthetic Organisms.
- V0.1 commercial test: 2–3 genuinely useful free components and 3–6 paid components, priced only after actual visual approvals and portability checks. Checkout and actual sales remain unimplemented.

## Rollback / protected state

Delete isolated branch and new paths. No existing app, global CSS, public home, registry/manifest, Flower renderer, Jellyfish WIP, CRT, Pearl, Terminal Rain, old white gallery or original experiment is edited by this proof. No merge, deploy or release.
