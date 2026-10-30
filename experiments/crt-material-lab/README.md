# CRT Material Lab

An independent, configurable CRT treatment for live UI content. Part of UI Forge
Expansion 02. **Owner visual approval is pending; this is not stock-admitted and has not
been integrated into UI Forge.**

## What it is

A content wrapper that layers a phosphor palette, scanlines, aperture grille, bloom,
signal noise, chroma separation, a slow beam, tube curvature, and intermittent tearing over
real DOM. It is original CSS/inline-SVG work. No React Bits, paid component, shader, image
pack, or runtime dependency is used.

The base content stays sharp and selectable. Scanlines and noise are overlays; no
`filter: blur()` is applied to content. Chromatic separation uses directional
`drop-shadow` fringes rather than channel-smearing the source. Tearing is intermittent and
brief, not a full-screen flicker loop.

## Presets

| Preset | Character |
| --- | --- |
| `green` | P1 monochrome terminal, fine scanlines, restrained afterglow. |
| `amber` | Warm P3 phosphor, darker glass, slower persistence. |
| `broken` | RGB separation, hard horizontal tear bands, carrier-loss jitter. |

Each preset exposes: `scanlines`, `glow`, `chromatic`, `curvature`, `noise`, `distortion`,
and `animation`. Values are `0–1`; numeric values are clamped in the control layer.

## API

```tsx
import { CRTScreen } from "@lab/crt-material-lab";

<CRTScreen
  preset="green"
  motion="auto"
  settings={{ scanlines: 0.7, glow: 0.45 }}
>
  <div className="terminal">…real DOM text…</div>
</CRTScreen>
```

| Prop | Type | Default |
| --- | --- | --- |
| `preset` | `green \| amber \| broken \| CRTPreset` | `green` |
| `settings` | `Partial<CRTSettings>` | preset |
| `motion` | `auto \| full \| reduced` | `auto` |
| `children` | ReactNode | required |
| native div attributes | `className`, `style`, `aria-*`, `data-*` | passed through |

The component adds nine decorative overlay layers, all `aria-hidden` and
`pointer-events: none`. The consumer owns the content padding, typography, and semantics.
Media inside `.content` receives the preset's phosphor grade via `--crt-media-filter`.

## Operation

- CSS animations only. No JS RAF, observer, timer, canvas, WebGL context, or global state.
- Every instance is self-contained in CSS custom properties. There are no generated IDs.
- `motion="reduced"`, `animation: 0`, or `prefers-reduced-motion: reduce` stops the beam,
  noise, tearing, and jitter. Scanlines, glow, and the static grade remain intentional.
- `animation: 0` is a first-class still state, not a paused broken state.
- Curvature is edge/radius/vignette treatment. It is not a geometric barrel-warp shader;
  this keeps live text undistorted and readable.

## Limits

- Chromium was the review browser. Firefox/WebKit are unverified.
- Drop-shadow bloom is compositor work; long lists of CRT screens should be capped.
- The material is designed for dark screens. It is not offered as a light-mode surface.
