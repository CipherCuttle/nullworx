# Dependency and security report — consolidation 01

Date: 2026-10-29 Europe/Stockholm. Production build only unless stated.

## Runtime additions

| Package | Exact version | License | Why | Compatibility |
| --- | --- | --- | --- | --- |
| `@paper-design/shaders-react` | `0.0.82` | Apache-2.0 | Direct upstream MeshGradient material | Peer `react ^18 || ^19`; resolved against React 19.3.1 |
| `@paper-design/shaders` | `0.0.82` | Apache-2.0 | Required transitive runtime | Resolved by pnpm |
| `motion` | `14.7.1` | MIT | Public Motion React API for the signal behaviour | Peer `react ^18 || ^19`; resolved against React 19.3.1 |
| `framer-motion` | `14.7.1` | MIT | Transitive of `motion` | Resolved |
| `motion-dom` / `motion-utils` | `14.7.1` / `14.7.0` | MIT | Transitive | Resolved |
| `tslib` | `2.8.1` | 0BSD | Transitive | Resolved |

Existing pins were not changed: `next@16.4.3`, `react@19.3.1`, `react-dom@19.3.1`,
`zod@4.6.7`, the three Fontsource packages, `server-only@0.0.1`.

## Compatibility decisions

- **Next 16.4.3** retained. No downgrade to the G3-A 15.5.28. All copied components are
  client components and compile under the Next 16 App Router.
- **React 19.3.1** retained. HoloType, CRT, Pearl and Terminal Rain use hooks and
  `forwardRef` only; no legacy lifecycle or removed API.
- **Zod 4.6.7** retained. Composition schemas required two Zod 4 adjustments:
  `z.record(z.unknown())` → `z.record(z.string(), z.unknown())`, and
  `z.ZodIssueCode.custom` → `"custom"`. No validation semantics changed.
- **CSS Modules**: every copied effect keeps its own module. No old UI Forge global
  stylesheet or gallery CSS entered the branded app.
- **SSR**: browser-only effect previews are lazy client modules (`ssr: false`). Public
  pages remain server-rendered; no WebGL or canvas is emitted in the server HTML.
- **Media source selection**: the reviewed CC0 H.264 Flower clip remains the first choice.
  A CC0 VP9 WebM derivative (`public/media/flower.webm`, 5.005 s, 960×540, 495 KiB) is
  selected only when `canPlayType` reports no H.264 support. WebKit on Linux requires it.
  The renderer, shader and preset timing are unchanged.

## Audit

Command: `pnpm audit --prod --json` (2026-10-29).

```json
{
  "vulnerabilities": { "info": 0, "low": 0, "moderate": 0, "high": 0, "critical": 0 },
  "dependencies": 27,
  "devDependencies": 0,
  "optionalDependencies": 91,
  "totalDependencies": 118
}
```

Raw receipt: `evidence/g5/audit-prod.json`.

## Licences and notices

- Paper Shaders Apache-2.0 text and required NOTICE are preserved at
  `third_party/paper-shaders/` and `third_party/paper-shaders-core/`.
- Motion MIT text is preserved at `third_party/motion/LICENSE.md`.
- Full notices: `THIRD_PARTY_NOTICES.md`.
- Fontsource fonts are OFL-1.1; no remote font request is made.
- Flower video/poster: CC0 1.0 (MDN sample media). WebM derivative: CC0 1.0.
- HoloType, CRT, Pearl, Terminal Rain, UI Forge primitives, the moth and the wordmark are
  owner-authored and **redistribution-restricted** until the owner assigns terms. They
  remain lab-only and are not registry items.

## Residual observations

| Observation | Disposition |
| --- | --- |
| `sharp@0.35.5` brings optional `@img/sharp-libvips-*` under LGPL-3.0-or-later | Present through Next image optimization; not introduced by the effects. No effect imports sharp. Review before redistributing a bundled product. |
| `caniuse-lite` is CC-BY-4.0 | Attribution retained in the lockfile/licence inventory; standard Next dependency. |
| No CSP is configured | Out of scope for this pass. Security headers already include nosniff, referrer policy, frame denial and a restrictive Permissions-Policy. |
| No external network requests at runtime | Verified in the browser harness: zero external requests on the homepage and all lab routes. |
| Owner licence decision still absent | Documented; no source is relicensed. |
