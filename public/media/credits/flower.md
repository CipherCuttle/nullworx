# Flower media

| File | Source | License | SHA-256 |
| --- | --- | --- | --- |
| `flower.mp4` | [MDN sample video](https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4) | CC0 1.0 | `0cd83d944a6ca7822b4a8306cecc60a36e859b041f6702c6a1ad9ead78924451` |
| `motifs/flower-poster.jpg` | Poster derivative supplied with the approved Proof 03/UI Forge work | CC0 1.0 (same source) | `fb34be9b63ad42c7b13dae6c507e683c09f623cc7380ca6717959d54554e919a` |
| `flower.webm` | VP9 derivative of the same CC0 MP4, 5.005 s, 960×540, no audio | CC0 1.0 | `11b671189edbc5d755e1874b656a73b4bcfa1b551cc5a3b987757152046935b1` |

The MP4 is byte-identical to the copy in the UI Forge Flower integration and the
ASCII Waves React 01 experiment. It retains its original AAC audio track; the
Nullworx usage mutes it, and the component defaults to muted playback and never
exposes media controls.


The WebM file exists only as a source-selection fallback for browsers without an H.264
decoder (WebKit on Linux). The reviewed renderer, shader, preset and start offset are
unchanged; the site selects WebM only when `canPlayType` reports no H.264 support.
