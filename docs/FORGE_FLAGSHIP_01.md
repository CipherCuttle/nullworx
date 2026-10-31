# Forge Flagship 01 — isolated visual proof

**Status:** SOURCE_PROOF_PENDING_CI_AND_ART_APPROVAL. Unreleased, no public manifest entry, no checkout.
**Base:** PR #8 at 53d2a0b97c509ef2bf593b9fb81411639f1b6a91
**Branch:** experiment/forge-flagship-shaders-01
**Preview:** /lab/forge-flagship-01 (noindex)

## Components
- Spectral Field: authored GLSL atmospheric ribbons. Configurable speed, intensity and presets.
- Liquid Refraction: authored GLSL optical lens warping a **procedural plate**, not arbitrary DOM pixels.
- Refraction Card: semantic React article with scoped CSS backdrop blur, highlight and specular rim. **Not physical DOM refraction**; do not sell as such.

Raw WebGL2 is sufficient for a proof; no extra runtime library. A minimal shared renderer handles resize, reduced motion, page visibility, intersection offscreen suppression, context loss/restoration and GL object cleanup without forcibly calling loseContext(). WebGL2-unavailable fallback is labelled honestly. No source footage or third-party assets. No React Bits source.

## Required gates
1. Actual commit: pnpm verify, clean source diff, CI browser assertions and animated evidence; shader fallback must not count as a shader PASS.
2. Review desktop/mobile screenshots and watch browser motion. OWNER assigns KEEP / REVISE / KILL per effect.
3. Measure frame-time distribution and cleanup on real mobile hardware; do not invent 60 fps.
4. Run Firefox and WebKit, resize/remount/offscreen/keyboard/reduced-motion coverage.
5. Verify clean React TypeScript consumer import with CSS Modules, then document packaging and assets.
6. Explicit resale/distribution rights and owner visual approval before any release.
7. Existing Flower golden master and historical WebKit VP9 failures remain independent and open.

## Kill criteria
- Spectral Field: if it looks like generic wallpaper, REVISE.
- Liquid Refraction: if the lens distortion is invisible, REVISE or KILL.
- Refraction Card: if it is merely standard CSS glass with no reusable advantage, KILL rather than overclaim physical refraction.

Preserve all local UI Forge and Jellyfish WIP. No merge, deployment, license changes or paid packaging.
