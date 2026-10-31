# ASCII Fidelity Proof 01 — bounded review candidate

**Date:** 2026-10-31  
**Branch:** `experiment/ascii-fidelity-proof-01`, isolated from `review/jellyfish-webkit-01` at `c1d29b7` and canonical draft PR #6.  
**Status:** **IMPLEMENTED BUT NOT VISUALLY OR BROWSER VERIFIED**. No merge, deploy, release, asset publication or original shader change.

## Owner goal

- Jellyfish is the chosen homepage motif. Its existing fine/brighter glyph treatment is retained.
- Enlarge the desktop preview to roughly 1080 CSS px maximum, with a widescreen 16:9 stage.
- Understand and remove the white burst at the Flower loop boundary *before* changing the renderer.
- Compare controlled hypotheses for better video recognition, detail, blue-subject exposure and glyph gradation.
- Keep original Flower renderer, glyph atlas, source files and existing golden-master evidence unchanged.

## Small changes

1. `app/home.module.css`: on desktop, allow one-column hero with the real ASCII stage centered at up to 1080 CSS px instead of keeping it in a narrow right column. Leave <=940 px breakpoints alone apart from lifting the tablet max stage to 900 px.
2. `components/effects/home-field.module.css`: use 16:9 presentation above 760 px. Mobile retains its previous aspect ratio.
3. `scripts/ascii-fidelity/compare-stills.mjs`: uses the actual local video file in the running app and holds one decoded frame to render four **Canvas2D cell-selection mock-ups**. It holds source time, display dimensions and glyph pitch constant. These do not replace the WebGL renderer and are **not** exact copies of baseline shader behavior or coverage calibration.
4. `scripts/ascii-fidelity/probe-flash.mjs`: records readiness, source video and canvas pixel statistics, playback phase, events and timeline across approximately three source cycles. The on-screen WebGL canvas may not permit reliable readback when its drawing buffer is not preserved, so a zero-flash result **cannot** be treated as proof of a seamless visible loop.

## Known suspect, not yet established cause

The preserved renderer currently chooses `uVideoEnabled = 0` whenever the video has `readyState < 2`. That makes the shader draw its *procedural* field rather than the last good video texture; the procedural field can be bright white. A brief readiness drop is one credible explanation for the owner's white burst.

An alternate explanation is an actual bright/cut frame in the encoded cyclic Flower derivative. A third is WebGL/video upload or source-switch behavior. Do **not** patch the shader or smooth the footage until source-element versus ASCII-output evidence separates them.

Also note: an earlier owner diagnostic locally changed the app to disable MSE. Reconfirm whether the test is using `data-loop-mode=native` or `buffered` before comparing runs. The mode matters.

## Local commands

Start the **production** site on port 3200, with locally preserved Jellyfish/Flower media and uncommitted adapters available:

```bash
pnpm build
pnpm exec next start --hostname 127.0.0.1 --port 3200
```

In another terminal:

```bash
# Compare one held source frame, initially Jellyfish on homepage
BASE_URL=http://127.0.0.1:3200 TIME=1.5 PITCH=8 node scripts/ascii-fidelity/compare-stills.mjs

# Compare another frame to avoid overfitting to one pose
BASE_URL=http://127.0.0.1:3200 TIME=3 PITCH=8 OUTPUT_DIR=evidence/ascii-fidelity-proof-01/stills-t3 node scripts/ascii-fidelity/compare-stills.mjs

# Diagnose Flash on Flower in the lab
BASE_URL=http://127.0.0.1:3200 ROUTE=/lab/ascii-waves node scripts/ascii-fidelity/probe-flash.mjs

# Diagnose Jellyfish on homepage independently
BASE_URL=http://127.0.0.1:3200 ROUTE=/ OUTPUT_DIR=evidence/ascii-fidelity-proof-01/flash-jellyfish node scripts/ascii-fidelity/probe-flash.mjs
```

Review `evidence/ascii-fidelity-proof-01/stills/REVIEW.html` and `flash/SUMMARY.md`. Never label the mock-ups as production rendering.

## Next admissible changes — only after observations

- If the output flashes while the decoded video remains dark, build an **opt-in** retained-video-texture probe. Preserve original Flower shader source and compare nine golden frames; do not rewrite the approved implementation before isolation.
- If the video itself flashes, inspect encoded tail/head frames and seek a better cyclic segment. A crossfade cannot magically make different endpoint motion continuous.
- For fidelity: select at most one isolated winner among area sampling, exposure-separated color and glyph ramp. Measure perceptual recognition, actual color error, GPU cost and mobile behavior. Then test the combined winner against baseline.
- Restore development-mode WebGL context lifecycle separately if the production-only workaround continues to be necessary.

## Blockers for a claimed PASS

The experiment branch inherits an incomplete parent: `components/effects/field-media.ts`, `components/effects/cyclic-media-source.ts`, the derived video assets and Jellyfish poster were **not pushed** with `c1d29b7`. A fresh checkout cannot fully build or visually reproduce this branch. The owner's local worktree may contain those files. Do not fabricate or overwrite them.

No browser automation, golden-image comparison, source-loop footage inspection, performance check or clean-consumer install was run from this chat. No existing verification receipt is transferable to these CSS changes.

**Verdict:** `ASCII_FIDELITY_EXPERIMENT_READY_FOR_LOCAL_REVIEW` (not PASS).
