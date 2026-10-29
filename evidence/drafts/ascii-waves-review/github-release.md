> **INTERNAL REVIEW DRAFT — NOT FOR DISTRIBUTION.** This effect is not released and has no public effect page or sitemap entry. Do not send, post or publish this copy.

# ASCII Waves / Flower field

A video is sampled cell by cell, translated into a living field of characters, and pushed through a slow wave of light.

## Status

- Manifest status: **OWNER_REVIEW**
- Release approval: not recorded
- Public page: withheld
- Version: 0.1.0
- License: MIT code / CC0 1.0 media

## Technical note

One WebGL 2 fragment shader samples an muxed video texture on a monospaced character grid. Rec.601 luma selects from the ordered glyph ramp ` .:-+*=%@#`; the video's RGB feeds the ink. Sampling UVs are warped by a low-frequency noise and wave function. A native-resolution glyph atlas keeps punctuation crisp at each device-pixel ratio. The React wrapper owns lifecycle, responsive cell measurement, visibility pausing, pointer input, reduced-motion freezing, context-loss recovery and a poster fallback.

## Requirements

- React 19 (the component uses React 18-compatible APIs).
- A browser with WebGL 2 and H.264 video decoding.
- A parent element with an explicit height or aspect ratio.
- The CC0 Flower MP4 and poster served from /media, or custom src and fallbackImage URLs.

## Install

```sh
unzip ascii-waves-0.1.0.zip -d .
```

Download artifact: https://nulllworx.site/downloads/ascii-waves-0.1.0.zip

## Provenance

- Source tree SHA-256: `0eeaf099c210b601664398519d92d1201506ced1c293cd802e3891958f2200a1`
- Upstream HEAD: `906f859db0125965cba71c51da1707c0a4c6d045`
- Source path: `/home/swirky/DevHub/experiments/ui-forge-flower-integration-01`

## Media

Flower video and poster are CC0 1.0. Source: MDN sample media. The reviewed usage mutes the video; keep it muted unless the integrator provides a user-initiated audio path.

---

Generated 2026-10-29 by `pnpm drafts`. No external publication action was taken.
