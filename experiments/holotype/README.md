# HoloType

An independent holographic-foil material for live text and SVG silhouettes. Part of
UI Forge Expansion 02. **Owner visual approval is pending; this is not stock-admitted and
has not been integrated into UI Forge.**

## Lineage gap

The brief refers to an existing approved HoloFoil implementation. No HoloFoil source,
registry item, branch, checkpoint, or approval record exists in
`/home/swirky/DevHub/experiments`, the UI Forge repositories, `/home/swirky/DevHub/repos`,
`/home/swirky/DevHub/artifacts`, or the available local agent records. The material here
is therefore an **independent optical study**, not a claimed adaptation of an approved
asset. It does not borrow paid or proprietary source.

## What it does

- Layers a directional metal body, narrow spectral reflection, moving specular crease,
  microtexture, and shallow depth. It is not one rainbow gradient clipped into text.
- Keeps real DOM text: the visible string is selectable, searchable, and available to
  assistive technology. Decorative layers are `aria-hidden`.
- Applies the same controls to real inline SVG paths through unique, per-instance
  gradient and texture IDs.
- Uses CSS gradients, masking, transforms, and inline SVG only. No canvas, WebGL,
  animation library, image, font request, or runtime network dependency.
- Stops all nonessential animation under `prefers-reduced-motion: reduce`, or when
  `motion="reduced"` / `animated={false}`.
- Pointer response is direct style writes on pointer events; there is no RAF loop and no
  shared global state. Each instance owns its variables and SVG IDs.

## API

```tsx
import { HoloText, HoloGlyph } from "@lab/holotype";

<HoloText as="h1" preset="platinum" tone="dark" variant="display">
  FORGE
</HoloText>

<HoloGlyph
  label="Moth silhouette"
  preset="aurora"
  tone="dark"
  viewBox="0 0 800 600"
  paths={[mothPath]}
/>
```

| Shared prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `preset` | `platinum \| aurora \| carbon \| HoloPreset` | `platinum` | Named material baseline. |
| `settings` | `Partial<HoloSettings>` | preset | `angle`, `spectral`, `metallic`, `grain`, `speed`, `pointer`, `animated`. |
| `tone` | `dark \| light` | `dark` | Chooses the metal ramp for the surrounding surface. |
| `motion` | `auto \| full \| reduced` | `auto` | `auto` honours the OS setting. |
| `style` / `className` | native | — | Applied to the material root. |

`HoloText` also accepts `as` (`span`, `h1`–`h3`, `p`, `div`), `variant`
(`display`, `title`, `accent`, `button`), and native attributes. The visible text must be a
single string so the four material layers align exactly.

`HoloGlyph` accepts `label`, `paths`, optional `strokes`, `viewBox`, and `strokeWidth`.
Each path is filled with the material. The component creates unique SVG gradient and
pattern IDs with React `useId`; multiple instances are safe.

## Limits

- Text is deliberately single-line. A future multi-line implementation needs per-line
  layers.
- The silhouette mask is generated from the supplied paths, so extremely long path data
  increases the inline style size.
- The material is tuned for large or medium type and short button labels. At very small
  sizes, reduce `grain` and `spectral` for legibility.
- Chromium was the review browser. Firefox/WebKit have not been visually reviewed.
