# Nullworx — WebKit media loop 01

Started: 2026-10-30 UTC; wrapped: 2026-10-31 Europe/Stockholm. Base: `059db3d13bd73d2a09f48d2060dd56014e0ab3fb`.
**Verdict: FAILED_VERIFICATION.** Work remains local and uncommitted. PR #6 remains DRAFT; owner visual approval is open.

## PLAN

Reproduce the unchanged source in an isolated HTML fixture, repair media
integration, require at least three real cycles, then check lifecycle controls,
all existing gates and nine exact golden images. The owner subsequently asked
for a sharper Jellyfish homepage and seamless versions of every existing ASCII
reel: Flower, Jellyfish, Koi, Smoke and Orion. That expansion is included here.

## Diagnosis and reproduction

A separately built original commit reproduces **355/359**, with exactly the four
reported WebKit homepage LIVE/readout failures. See [original suite](original-labs.json)
and [application traces](original-application.json). The original app reaches
`currentTime=duration=5.005366666`, `readyState=4`, `ended=false`,
`seeking=false`, `loop=true`. Its watchdog then pauses the element and falsely
reports autoplay blocked after successful playback.

The [isolated HTML fixture](../../scripts/media-loop/fixture.html) has no React,
WebGL or application wrapper. A range-capable server supplies unchanged media.
Each mode/browser runs for 18 real seconds at 1x. [Raw reproduction](isolated-reproduction.json)
records currentTime, duration, readyState, paused, ended, seeking, event sequence,
presented-frame timestamps and decoded pixel hashes.

| Original source / mode | Chromium 156.0.8078.47 | Firefox 157.0 | WebKit 27.2 / rev 2370 |
| --- | --- | --- | --- |
| VP9 WebM, native loop | clock and frames loop | clock and frames loop | frames loop; HTML clock pins at EOF |
| No native loop; ended → zero → play | succeeds | succeeds | succeeds |
| No native loop; zero → seeked → play | succeeds | succeeds | succeeds |
| Controlled seek to zero and resume | succeeds | succeeds | succeeds |
| Original H.264 MP4, native loop | succeeds | succeeds | H.264 decoder unavailable here |

WebKit presents changing frames across three native cycles while its HTML clock
shows no wraps. This is a browser/backend clock-reporting defect followed by an
application watchdog bug, not proof that the VP9 decoder died. Firefox can
report cumulative rVFC mediaTime on native loops; the reproduction also records
the independent HTML clock. The original readiness sample did not establish
sustained looping. No browser bisect was performed, so the precise upstream
regression identity is not claimed.

The source itself also has a visible content cut between its last and first
pictures. Fixing the watchdog or using ended/seek/play does not remove that cut.
An explicit-seek prototype passed functional loops but had measurable decoder
pauses. It was superseded to meet the owner's later seamless-loop request.

### Research and environment

[WebKit 302541](https://bugs.webkit.org/show_bug.cgi?id=302541) concerns a related
GStreamer loop/seek regression. Its [landed fix](https://github.com/WebKit/WebKit/commit/d0dfb8e199314a2acc794fa9f2e0dcda973f78c4)
changes flush/segment handling. It does not prove the identity of this host's
stuck-clock symptom. [285595](https://bugs.webkit.org/show_bug.cgi?id=285595) and
[227687](https://bugs.webkit.org/show_bug.cgi?id=227687) provide GTK/WPE EOF/seek
and seamless-loop history. [GStreamer seeking design](https://gstreamer.freedesktop.org/documentation/additional/design/seeking.html)
and [Media Source Extensions](https://www.w3.org/TR/media-source-2/) informed the
integration; observed browser behavior remains the deciding evidence.

Ubuntu **26.04.1**, GStreamer **1.28.2**, Node **24.20.0**, pnpm **12.15.0**,
Playwright **1.64.1**. Chromium **156.0.8078.47**, Firefox **157.0 / rev 1555**,
WebKit **27.2 / rev 2370**. Headless WebKit here is Linux **WPE**, not Safari on
macOS/iOS. [Environment/binary identity](environment.json) includes ffprobe and
binary hashes. The original archive used webpack because Turbopack rejects its
external node_modules symlink; its application source was unchanged. The final
application uses the normal production build.

## CHANGESET

- The site wrapper supplies a cyclic MediaSource to the preserved renderer.
  Encoded copies append onto one continuous timeline. At clip boundaries there
  is no HTML EOF, seek, play call, reload, renderer reset or context remount.
- The adapter fetches once, appends 512 KiB chunks, feeds approximately two
  seconds ahead and removes old buffered ranges. One-second keyframes preserve
  safe eviction. Eviction waits for the initial seek to settle. Fetch, listeners,
  pending operations and blob URLs are released on disposal. Paused preroll is
  limited to 1.05 seconds, enough to include the next one-second keyframe.
- Initial media activation waits for the actual foreground viewport. This avoids
  a separately reproduced WPE failure: paused MSE seeking to 2.2 while the video
  is physically offscreen produces `Failed to push buffer`. Activation is sticky;
  later visibility/background changes pause the same mounted media.
- Flower starts at **2.2 seconds once**. Subsequent cycles include source zero.
  Its portable VP9 derivative preserves decoded body pixels losslessly; the
  original MP4, WebM, shader, atlas and approved parameters are unchanged.
- A cyclic tail/head dissolve removes the content cut in all five new reels.
  The actual last-to-first boundary joins adjacent prepared source frames.
  Decoded MD5 validates the masters; delivery copies meet a measured **40 dB**
  minimum PSNR (Flower is lossless). Originals are untouched.
- Jellyfish is the homepage default at the owner's request, starts at **1 s**,
  and uses **8 px** glyphs instead of 12 px, at existing High quality. A documented
  derivative-only luma lift makes blue detail legible. It leaves the original
  file, renderer and atlas unchanged. Flower remains the lab/download reference.
- LIVE requires recent presented media progress plus advancing rendered frames.
  Source time is normalized for controls; the raw continuous clock is retained
  separately. A paused preroll callback cannot move the reported held position.
- Actual `NotAllowedError` means `autoplay-blocked`; loss of progress after
  success means `playback-stalled`, with a distinct manual Restart control.
  There is no timer-driven recovery. The existing **650 ms** progress window
  and **1200 ms** startup/resume grace are retained.
- `verify:media` is a required part of `verify:labs`. The original 359 route
  assertions and their motion thresholds/timeouts remain unchanged.

## VERIFY

Final status: [machine receipt](final-status.json).

| Gate | Final status |
| --- | --- |
| `pnpm verify` | PASS: lint, types, validation, 51/51 unit tests, build, secret scan |
| `pnpm verify:home` | PASS: 49/49 |
| `pnpm verify:labs` | FAIL: 712/715; original 359 all pass |
| Five reels × three engines × three cycles | PASS: 213/213 standalone checks |
| WebKit cold startup / reduced / hidden | PASS: 10/10 |
| `pnpm test:e2e` | Not rerun on final changeset; older 26/26 prototype is superseded |
| Nine controlled golden images | Not rerun on final changeset; latest earlier MSE attempt was 8/9 exact |
| Source/checksum preservation | See fresh `checksums.json` and `import-integrity.json` |

The three red integrated cases are WebKit desktop home, mobile home and desktop
Flower lab. Their separate MSE reference video reports `Reference clip did not
decode` before the required loop observation completes. The product startup and
standalone video results do not substitute for these missing checks. This has
not been conclusively classified as a reference harness defect or engine limit.
The final pipeline stopped at labs failure; no end-to-end or golden result from
the earlier prototype is represented as a final pass.

The mandatory media gate observes nine application cases at normal speed for
three periods plus 1.2 seconds: six default home desktop/mobile cases, forced
VP9 in Chromium/Firefox desktop, and the WebKit Flower lab. It requires actual
source-cycle wraps, exact source-beginning pixels, at least eight presented
frames/five distinct pixel hashes after each cycle, advancing renderer frames,
continuous LIVE, one initial seek and unchanged video/canvas/GL context.
Presented notifications and independent decoded-picture samples must both
show at least three source cycles.

The bare-video matrix exercises all five reels in all three engines, using the
same TypeScript media adapter with only types erased. It requires three cycles,
changing decoded pixels after each, exact source-beginning pictures, **≤80 ms**
changing-picture gaps around each seam, no reload/repeated play and bounded
buffering. All five expected names and all ten delivery SHA-256 values are
required, tying the fidelity receipt to the exact files played.

The frame callback records remain intact. Independent requestAnimationFrame
sampling hashes the actual decoded picture. Firefox can coalesce rVFC callbacks
across multiple presented frames (83 ms arrival gap with counter increments of
2–3), and its reported metadata can lead the actual source clock. Callback
arrival gaps therefore do not measure a decoder freeze. The seam gate uses
actual changed-picture gaps and sampling gaps, both at the unchanged 80 ms
limit. Readiness, a permissive failure label or a modulo clock cannot pass it.

The exact reference bank enumerates every prefix frame at a held midpoint using
the same MSE decoder path. Sampling a playing 60 fps reference on a 25 fps
compositor missed different pictures on different cycles. The corrected bank
has no pixel tolerance. Actual decoded beginnings must match it within the
same 80 ms seam window. Earlier failed checks and the paused-seek reproduction
are preserved in [the intermediate failure record](intermediate-failure.json).

Lifecycle negatives cover Pause near the source end, native reduced-motion
emulation, real viewport scrolling, a labelled document.hidden event simulation,
pause on an actual cycle boundary followed by duplicate ended events, an
injected decoder hold after successful playback, and real NotAllowedError policy
rejection. Held states must not seek, play or recover automatically. Neither a
blocked/stalled phase nor a readiness event is accepted as successful looping.
The visibility simulation is not a claim about native OS background scheduling.

The nine controlled Flower golden pairs render from independent Vite/Next
origins. The capture harness isolates physical desktop input, uses the original
imperative pose API and waits for compositor upload after a held seek. Controlled
390 px/DPR2 stills retain the original protocol desktop context; actual
mobile interaction and playback run separately in native mobile contexts.
Every fresh golden PNG must also equal its archived reference, with **zero**
pixel differences and identical PNG SHA-256. Historical audit receipts remain
immutable because recapture runs in a scratch mirror.

## HOSTILE REVIEW

- The isolated fixture falsifies the overly broad dead-decoder explanation.
  The exact upstream bug is not asserted from similarity alone.
- Native-loop and explicit-seek approaches were measured before selecting the
  continuous timeline. The seam gate was not relaxed to accept their pauses.
- A modulo source clock alone cannot pass: repeated decoded beginning pictures,
  changing frames after every cycle and bounded seam gaps are independent proof.
- A new cyclic source, readiness event or animated shader cannot substitute for
  real decoded motion. Pause/visibility/reduced-motion negatives forbid retries.
- The adapter has no per-cycle play/seek calls and no retry timer. Pending initial
  seeks block eviction; disposal aborts loading and removes all its listeners.
- Original media, approved Flower body frames, component bytes, archive and
  historical source trees are checked independently of the browser tests.
- One baseline run overlapping a rebuild was discarded; the separately built
  original then reproduced 355/359. See [discarded-run record](discarded-baseline.json).
- Exact golden capture synchronization issues were diagnosed rather than
  accepted as image tolerances. All final receipts must come from this changeset.

## VERDICT

**FAILED_VERIFICATION**. The final integrated WebKit reference-video checks remain
red, and final end-to-end/golden gates are incomplete. No commit or push was made.
PR #6 stays DRAFT. No merge, deployment, public release or G5-A integration occurred.
