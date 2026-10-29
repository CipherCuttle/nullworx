import type { EffectManifest } from "./schema";

/**
 * Nullworx effect registry, schema 1.1.0.
 *
 * This is a candidate, not a released product. The source experiments describe
 * the original Flower renderer as owner-approved, but the React extraction was
 * explicitly left at Gate E for the owner to review. Nullworx does not convert
 * that history into a release approval. The only path into the public catalogue
 * is an explicit releaseApproval record plus RELEASED status.
 */
export const effectManifest = [
  {
    schemaVersion: "1.1.0",
    id: "nwx-ascii-waves",
    slug: "ascii-waves",
    name: "ASCII Waves",
    subtitle: "Flower field",
    version: "0.1.0",
    status: "OWNER_REVIEW",
    summary:
      "A video is sampled cell by cell, translated into a living field of characters, and pushed through a slow wave of light.",
    description: [
      "ASCII Waves turns a moving image into a field of characters. Each cell reads the source video's luminance, chooses a glyph from the ramp, and borrows the source colour. A domain-warped wave field continuously disturbs the sampling grid.",
      "The result is not a video with a type overlay. The image is rebuilt as a responsive mesh of whole characters, with an interactive eddy under the pointer and a static fallback when motion is reduced.",
      "Nullworx carries the Flower renderer from the UI Forge experiments. The effect code, shader and glyph atlas are preserved from the reviewed integration copy; the media is the original CC0 MDN Flower clip.",
    ],
    technicalDescription:
      "One WebGL 2 fragment shader samples an muxed video texture on a monospaced character grid. Rec.601 luma selects from the ordered glyph ramp ` .:-+*=%@#`; the video's RGB feeds the ink. Sampling UVs are warped by a low-frequency noise and wave function. A native-resolution glyph atlas keeps punctuation crisp at each device-pixel ratio. The React wrapper owns lifecycle, responsive cell measurement, visibility pausing, pointer input, reduced-motion freezing, context-loss recovery and a poster fallback.",
    categories: ["Glyph systems", "Video fields"],
    tags: ["ascii", "webgl2", "video", "typography", "procedural", "flower"],
    frameworks: ["React 19", "Next.js 16", "WebGL 2"],
    requirements: [
      "React 19 (the component uses React 18-compatible APIs).",
      "A browser with WebGL 2 and H.264 video decoding.",
      "A parent element with an explicit height or aspect ratio.",
      "The CC0 Flower MP4 and poster served from /media, or custom src and fallbackImage URLs.",
    ],
    sourceComponent: "components/effects/ascii-waves/ascii-waves.tsx",
    previewComponent: "components/effects/ascii-waves-canvas.tsx",
    sourceFiles: [
      {
        path: "components/effects/ascii-waves/ascii-waves.tsx",
        sha256: "b679afe2693c3bdc207a41bd0f28907ffaa4da5ef2b257bfce36b7ff0c4d2d03",
        role: "component",
      },
      {
        path: "components/effects/ascii-waves/ascii-waves.module.css",
        sha256: "4784f3b073a15bb84bff14e18d5ca5bd1448f4d5cd94e4097ec209789733475b",
        role: "style",
      },
      {
        path: "components/effects/ascii-waves/renderer.ts",
        sha256: "edd2ab3a049ed2c2a70b8cd62043134163463246516ba06cdf7d6fe9e12aafd7",
        role: "renderer",
      },
      {
        path: "components/effects/ascii-waves/glyphAtlas.ts",
        sha256: "eb002aa7ce2875db3afeafebb596d0e32633acd4a4fdeb10ab95886c5be950f2",
        role: "atlas",
      },
      {
        path: "components/effects/ascii-waves/presets.ts",
        sha256: "f4418e448209e0176c019f95dde35e42f1a9ae6d0381bb1540d91918ed666de3",
        role: "preset",
      },
      {
        path: "public/media/flower.mp4",
        sha256: "0cd83d944a6ca7822b4a8306cecc60a36e859b041f6702c6a1ad9ead78924451",
        role: "media",
      },
      {
        path: "public/media/motifs/flower-poster.jpg",
        sha256: "fb34be9b63ad42c7b13dae6c507e683c09f623cc7380ca6717959d54554e919a",
        role: "media",
      },
    ],
    sourceTreeSha256: "0eeaf099c210b601664398519d92d1201506ced1c293cd802e3891958f2200a1",
    sourceTreeHashMethod:
      "sha256(join(sorted(relativePath + NUL + byteSize + NUL + fileSha256 + LF))), non-media source files relative to sourceComponent's directory",
    provenance: {
      repository: "https://github.com/CipherCuttle/nullworx",
      upstreamHead: "906f859db0125965cba71c51da1707c0a4c6d045",
      capturedAt: "2026-10-28",
      sourcePath: "/home/swirky/DevHub/experiments/ui-forge-flower-integration-01",
      notes: [
        "Copied byte-for-byte from the UI Forge Flower integration registry item at registry/new-york/ascii-waves. The integration's git HEAD is 906f859db0125965cba71c51da1707c0a4c6d045; the integration files were uncommitted worktree state, so file hashes and a reproducible component-tree digest are recorded as well.",
        "The source integration records that the original Proof 03 Flower renderer is owner-approved and that Gate E (React extraction graduation) remained open. Nullworx records this effect as OWNER_REVIEW, not APPROVED or RELEASED.",
        "The shader and renderer are unchanged. The only packaging differences were already present in the source integration: the registry copy uses double-quoted literals and an explicit client directive.",
        "No Pexels, Orion or other experimental reels are included. Only the CC0 Flower MP4 and poster are redistributed.",
      ],
      excluded: [
        "Pexels jellyfish, koi and smoke reels: redistribution rights not independently verified.",
        "Orion/NASA reel: cleared in the source review but outside this Flower-only vertical slice.",
        "Node modules, build output, browser evidence, local-only review pages and node caches.",
      ],
    },
    installation: {
      archivePath: "/downloads/ascii-waves-0.1.0.zip",
      archiveSha256: "0e59f06f719e3ed624f8a3a902509473371798f260ebc8379509bdef02de7e5a",
      command:
        "unzip ascii-waves-0.1.0.zip -d .",
      usage: `"use client";

import { AsciiWaves } from "@/components/effects/ascii-waves/ascii-waves";

export function Field() {
  return (
    <div style={{ width: "100%", aspectRatio: "16 / 9" }}>
      <AsciiWaves
        preset="flower"
        cellSize="auto"
        speed={1}
        quality="balanced"
        muted
        loop
        reducedMotion="system"
        ariaLabel="ASCII wave field made from a flower video"
      />
    </div>
  );
}`,
      notes: [
        "The bundle preserves the reviewed five-file component layout and the CC0 media.",
        "The reviewed usage mutes the video and the component defaults to muted playback. Keep `muted` set unless you provide your own user-initiated audio path.",
        "Set an explicit parent height. A zero-height parent produces a zero-height field.",
        "Distribution remains gated: this archive is a review artifact until the effect is RELEASED.",
      ],
    },
    config: [
      {
        type: "select",
        key: "cellSize",
        label: "Cell pitch",
        description: "Character size in CSS pixels. Auto chooses 12, 14 or 16 by container width.",
        default: "auto",
        options: [
          { label: "Auto", value: "auto" },
          { label: "12 px", value: "12" },
          { label: "16 px", value: "16" },
          { label: "20 px", value: "20" },
        ],
      },
      {
        type: "range",
        key: "speed",
        label: "Wave speed",
        description: "Multiplier for the slow domain-warp clock. The default is the reviewed Flower timing.",
        default: 1,
        min: 0,
        max: 2,
        step: 0.1,
      },
      {
        type: "select",
        key: "quality",
        label: "Quality",
        description: "Caps render resolution against the browser's device-pixel ratio.",
        default: "balanced",
        options: [
          { label: "High · DPR 2", value: "high" },
          { label: "Balanced · DPR 1.5", value: "balanced" },
          { label: "Efficient · DPR 1", value: "efficient" },
        ],
      },
      {
        type: "toggle",
        key: "playing",
        label: "Motion",
        description: "Pause freezes the video frame, the wave clock and pointer response together.",
        default: true,
      },
      {
        type: "toggle",
        key: "pointerInteraction",
        label: "Pointer eddy",
        description: "Lets the pointer disturb nearby sampling cells. Disabled under reduced motion.",
        default: true,
      },
    ],
    performance: {
      summary:
        "The reviewed WebGL 2 path draws one fullscreen quad per frame and samples one live video texture. It pauses offscreen and when the page is hidden.",
      measurements: [
        {
          label: "Desktop",
          value: "65.2 fps",
          context: "1440 × 900, DPR 2, RTX 4060, one draw call, 90 × 57 cell grid, 2.9% CPU task time.",
        },
        {
          label: "Mobile viewport",
          value: "138.0 fps",
          context: "390 × 844, DPR 2, RTX 4060 host, 33 × 71 cell grid, 4.7% CPU task time.",
        },
        {
          label: "Video uploads",
          value: "~29/s",
          context: "Measured in the source integration review; the live texture is only marked dirty when a frame is available.",
        },
      ],
      caveat:
        "These are source-review measurements on a host with external GPU load, not a hardware guarantee or a fresh Nullworx benchmark. The field still depends on WebGL 2, video decode and the device GPU. The poster fallback is used when either fails.",
    },
    accessibility: {
      summary:
        "This is a decorative field, not a control. All essential page content remains available as text outside the canvas, and motion is optional.",
      notes: [
        "The canvas exposes role=\"img\" with a configurable accessible label.",
        "The source video is muted, has no controls and is hidden from assistive technology.",
        "Motion is reduced to a static frame when prefers-reduced-motion: reduce is set.",
        "Pointer interaction is never required to understand the effect and is disabled under reduced motion.",
        "WebGL and decode failures show a poster and a visible status message instead of a blank block.",
      ],
      reducedMotion:
        "With reduced motion enabled, the wave clock and video pause and pointer interaction is disabled. The field remains as a still image.",
    },
    license: {
      code: "MIT",
      media: "CC0 1.0",
      notes:
        "The Nullworx site and effect code are offered under the repository's MIT license. The Flower video and poster are CC0 1.0 from the MDN sample media. The component itself does not bundle fonts; it draws from the system monospace stack.",
      urls: ["https://opensource.org/license/mit", "https://creativecommons.org/publicdomain/zero/1.0/"],
    },
    previewMedia: {
      src: "/media/motifs/flower-poster.jpg",
      alt: "A still from the CC0 flower video used as the source for ASCII Waves.",
      width: 960,
      height: 540,
    },
    publication: {
      releasedAt: null,
      updatedAt: "2026-10-28",
    },
    releaseApproval: null,
    relatedSlugs: [],
  },
] satisfies EffectManifest[];

export default effectManifest;
