# G5-A performance and lifecycle results

**Status: EXPERIMENTAL / OWNER_REVIEW.** No universal FPS claim is made.

## Headed GPU comparison

- Host: NVIDIA GeForce RTX 4060 Laptop GPU, driver 595.99.02, X11 `DISPLAY=:0`.
- Display target observed by rAF: ~142.9 Hz (7.0 ms median).
- Browser: headed Google Chrome 156.0.8078.47, identical launch flags.
- Viewport: 1440×900, DPR 1.
- Method: alternating rounds, 1 s warmup + 5 s rAF cadence, 3 rounds each.
- Renderer: `ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2)`.
- Baseline: G3-A.1 preset D (`d-wordmark-paper`), natural stage frame 745×166.6 px.
- Exported: shadcn-installed Living Type 01 with a D-equivalent recipe (same
  Paper MeshGradient parameters, 738×147.6 px frame, Night Bloom surface).
- rAF cadence is a frame-interval measurement, **not** GPU frame time. It does
  not by itself prove GPU cost.

| Metric | G3-A.1 D baseline | Exported D-equivalent | Result |
| --- | ---: | ---: | --- |
| Median frame interval (median of round medians) | 7.0 ms | 7.0 ms | **0.0% regression** |
| p95 | 7.1 ms | 7.0–7.1 ms | flat |
| p99 | 7.1–11.5 ms | 7.1–8.0 ms | flat/lower |
| Max | 14.7–48.6 ms | 7.2–27.7 ms | lower in this run |
| Frames > 50 ms | 0 | 0 | none |
| Sustained long frames | none | none | none |

Per-round detail (final run):

| Round | Baseline median / max / >50 ms | Exported median / max / >50 ms |
| --- | --- | --- |
| 1 | 7.0 / 20.8 / 0 | 7.0 / 27.7 / 0 |
| 2 | 7.0 / 14.9 / 0 | 7.0 / 13.9 / 0 |
| 3 | 7.0 / 48.6 / 0 | 6.9 / 7.2 / 0 |

An earlier headed run recorded one 51.4 ms frame in one exported round and none
in the baseline; it was not sustained. The final three-round run had zero frames
over 50 ms in either composition. This run-to-run variability is recorded rather
than smoothed away.

## Headless harness cadence

The browser harness recorded virtual-clock medians of 16.7 ms for Chromium,
~17.1 ms for Firefox and 16.0 ms for WebKit. Those are headless rAF cadence
values, not display FPS and not GPU time.

## Resources and lifecycle

- One shader canvas and one reusable offscreen mask canvas.
- 30 rapid text edits: **0 new canvas allocations, 0 new WebGL contexts**.
- Five mount/unmount cycles: live WebGL contexts return to **0** on every
  unmount and **1** on every remount; no accumulation.
- Heap after five cycles (Chromium): 7.57 MB and 6.11 MB for the two consumers;
  no unbounded growth observed. `performance.memory` is unavailable in
  Firefox/WebKit.
- Mask object URLs are revoked when replaced or unmounted (code path plus
  lifecycle evidence).
- Reset, preset and text edits do not remount the Paper material.

## Bundle weight

Measured from browser resource timing after the shader was ready, plus build
outputs:

| Consumer | JS transfer | CSS transfer | Notes |
| --- | ---: | ---: | --- |
| Next 15.5.28 | 197.5 KB | 30.0 KB | Includes ~83 KB lazy Paper renderer chunk; first-load route JS 111 KB |
| Vite 8.3.5 | 75.0 KB | 29.5 KB | Main + ~8.5 KB lazy Paper chunk; no Next runtime |
| Host demo | 205.6 KB | 37.6 KB | Includes app demo chrome and Geist; not the customer bundle |

The 36,582-byte embedded font CSS is most of the CSS transfer; the WOFF2 ASCII
subset itself is 27 KB. The complete registry item JSON is 136 KB because it
contains source, docs, licences and the embedded font. There is no font network
request and no external shader chunk.

Artifacts: `docs/g5a/evidence/performance.json`, browser JSON receipts, and the
local `evidence/g5a/` corpus.
