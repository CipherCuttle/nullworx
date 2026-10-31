// Browser-only instrumentation. Native playback/clock behavior is preserved;
// delegated play() calls are counted, and rVFC hashes actual decoded pixels.
export function observeMedia() {
  const receipt = window.__mediaLoop = { events: [], samples: [], frames: [], pictures: [], contexts: 0, lost: 0, plays: 0, playCalls: 0, seeks: [] };
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) {
    if (this.dataset.mediaReference !== 'true') receipt.playCalls++;
    return play.apply(this, args);
  };
  const canvases = new WeakSet();
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    const context = getContext.call(this, type, ...args);
    if (context && /webgl/i.test(type) && !canvases.has(this)) {
      canvases.add(this);
      receipt.contexts++;
      this.addEventListener('webglcontextlost', () => receipt.lost++);
    }
    return context;
  };
  const snapshot = (v) => ({
    at: performance.now(), currentTime: v.currentTime, duration: v.duration,
    readyState: v.readyState, paused: v.paused, ended: v.ended, seeking: v.seeking,
    loop: v.loop, presentedFrames: v.getVideoPlaybackQuality?.().totalVideoFrames ?? null,
    phase: document.querySelector('[data-ascii-stage]')?.dataset.playback ?? null,
    rendererFrames: Number(document.querySelector('[data-ascii-stage]')?.dataset.frameCount ?? 0),
    waveClock: Number(document.querySelector('[data-ascii-stage]')?.dataset.waveClock ?? 0),
  });
  const observed = new WeakSet();
  function attach(v) {
    if (observed.has(v)) return;
    observed.add(v);
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 14;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    function hashPicture() {
      context.drawImage(v, 0, 0, 24, 14);
      let hash = 2166136261;
      for (const byte of context.getImageData(0, 0, 24, 14).data) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
      return hash;
    }
    let lastPicture, lastSample;
    function picture(now) {
      if (!v.isConnected) return;
      if (v.readyState >= 2 && !v.paused) {
        const hash = hashPicture();
        const stage = document.querySelector('[data-ascii-stage]');
        const period = Number(stage?.dataset.cycleDuration ?? v.dataset.cycleDuration ?? 0);
        const buffered = stage?.dataset.loopMode === 'buffered' || v.dataset.loopMode === 'buffered';
        if (hash !== lastPicture) receipt.pictures.push({ at: now, time: v.currentTime, sourceTime: buffered && period ? v.currentTime % period : v.currentTime, hash, sampleGap: lastSample ? now - lastSample : 0 });
        lastPicture = hash;
        lastSample = now;
      }
      requestAnimationFrame(picture);
    }
    requestAnimationFrame(picture);
    function frame(now, meta) {
      const hash = hashPicture();
      const stage = document.querySelector('[data-ascii-stage]');
      const period = Number(stage?.dataset.cycleDuration ?? v.dataset.cycleDuration ?? 0);
      const buffered = stage?.dataset.loopMode === 'buffered' || v.dataset.loopMode === 'buffered';
      let sourceTime = buffered && period ? meta.mediaTime % period : meta.mediaTime;
      if (buffered && (sourceTime < .001 || sourceTime > period - .001)) sourceTime = 0;
      receipt.frames.push({ at: now, time: meta.mediaTime, sourceTime, clock: v.currentTime, expectedDisplayTime: meta.expectedDisplayTime, presented: meta.presentedFrames, hash });
      v.requestVideoFrameCallback(frame);
    }
    v.requestVideoFrameCallback(frame);
  }
  for (const name of ['loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 'play', 'playing', 'pause', 'waiting', 'stalled', 'seeking', 'seeked', 'ended', 'error', 'emptied']) {
    document.addEventListener(name, event => {
      if (!(event.target instanceof HTMLVideoElement)) return;
      if (event.target.dataset.mediaReference === 'true') return;
      attach(event.target);
      const sample = { event: name, ...snapshot(event.target) };
      receipt.events.push(sample);
      if (name === 'play') receipt.plays++;
      if (name === 'seeking') receipt.seeks.push(sample);
    }, true);
  }
  setInterval(() => {
    const v = document.querySelector('video');
    if (v) { attach(v); receipt.samples.push(snapshot(v)); }
  }, 100);
}

export function boundaries(frames) {
  return frames.flatMap((frame, index) => index && frames[index - 1].time - frame.time > 1
    ? [{ index, from: frames[index - 1].time, to: frame.time, at: frame.at }] : []);
}

export function timelineBoundaries(samples) {
  return boundaries(samples.map(sample => ({ ...sample, time: sample.currentTime })));
}

export function presentedBoundaries(data) {
  // WebKit's HTML clock can stick at EOF; Firefox's rVFC mediaTime can be
  // cumulative. Either independent native clock must show a real source wrap.
  const byFrame = boundaries(data.frames.map(frame => ({ ...frame, time: frame.sourceTime ?? frame.time })));
  return byFrame.length ? { basis: 'presented-media-time', wraps: byFrame }
    : { basis: 'html-clock-at-presentation', wraps: boundaries(data.frames.map(frame => ({ ...frame, time: frame.clock }))) };
}

export function pictureBoundaries(data) {
  // Independently sampled decoded pixels, not callback arrival cadence.
  // Firefox can coalesce rVFC notifications across several presented pictures.
  return { basis: 'decoded-pixels/native-source-clock', wraps: boundaries(data.pictures.map(frame => ({ ...frame, time: frame.sourceTime }))) };
}
