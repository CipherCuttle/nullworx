import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { launch, open, pose, state, save, config, out } from './browser-common.mjs';

const browser = await launch();
const receipt = {
  capturedAt: new Date().toISOString(),
  method: 'Independent real-time, foreground CDP screencasts of the archived app and actual consolidated homepage. Same hardware browser, viewport, DPR, media seek, wave-clock seed and pointer schedule. Native decoded playback; no virtual time or synthetic interpolation. Screencast timestamps retain real elapsed time; exported at 30 fps.',
  limitation: 'Exact per-frame synchronization is unsupported across the two independent native video decoders and requestAnimationFrame loops. Side-by-side clips are controlled behavioral evidence, not proof of pixel-equivalent live frames. Performance is sampled separately without recording.',
  clips: [],
};
try {
  const scenes = [
    { variant: 'golden', key: 'golden', normalized: true, path: '/' },
    { variant: 'consolidated', key: 'consolidated', normalized: true, path: '/' },
    { variant: 'consolidated', key: 'home-presentation', normalized: false, path: '/' },
    { variant: 'consolidated', key: 'lab-presentation', normalized: false, path: '/lab/ascii-waves' },
  ];
  for (const { variant, key, normalized, path } of scenes) {
    const p = await open(browser, { variant, path, dpr: 2, normalized, query: variant === 'golden' ? '?chrome=0&paused=1' : '' });
    // Neutralize any pointer event caused by opening a physical Chrome window.
    // Converge using the existing damping model before choosing the seed frame.
    await p.page.evaluate(() => {
      window.__auditHoldVideo = false;
      window.__auditApi.play();
      window.__auditApi.setPointer(.5, .5, false);
      window.__auditApi.setFrozenTime(0);
    });
    await p.page.waitForTimeout(1800);
    await pose(p.page, { videoTime: 2.2, waveClock: 0 });
    const before = await state(p.page);
    const dir = resolve(config.scratch, 'screencast-' + key);
    mkdirSync(dir, { recursive: true });
    const frames = [];
    const cdp = await p.context.newCDPSession(p.page);
    cdp.on('Page.screencastFrame', (frame) => {
      const path = resolve(dir, `${String(frames.length).padStart(5, '0')}.jpg`);
      writeFileSync(path, Buffer.from(frame.data, 'base64'));
      frames.push({ path, timestamp: frame.metadata.timestamp, width: frame.metadata.deviceWidth, height: frame.metadata.deviceHeight });
      void cdp.send('Page.screencastFrameAck', { sessionId: frame.sessionId });
    });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: 1440, maxHeight: 900, everyNthFrame: 1 });
    await p.page.waitForTimeout(100);
    const timeline = await p.page.evaluate(async () => {
      const api = window.__auditApi;
      const video = document.querySelector('video');
      window.__auditHoldVideo = false;
      api.setPointerActive(false);
      api.setFrozenTime(null);
      await api.play();
      const startWall = Date.now() / 1000;
      const start = performance.now();
      const decoded = [];
      let done = false;
      const frame = (_now, metadata) => {
        if (done) return;
        decoded.push({ elapsed: performance.now() - start, mediaTime: metadata.mediaTime, presentedFrames: metadata.presentedFrames });
        video.requestVideoFrameCallback(frame);
      };
      video.requestVideoFrameCallback?.(frame);
      const events = [{ elapsed: 0, kind: 'release native playback', videoTime: video.currentTime, waveClock: api.getSnapshot().waveClock }];
      const on = setTimeout(() => {
        api.setPointer(.7, .35, true);
        events.push({ elapsed: performance.now() - start, kind: 'pointer .7 .35 active' });
      }, 2000);
      const off = setTimeout(() => {
        api.setPointerActive(false);
        events.push({ elapsed: performance.now() - start, kind: 'pointer released' });
      }, 4000);
      const samples = await new Promise((resolve) => {
        const samples = [];
        function tick(now) {
          const s = api.getSnapshot();
          samples.push({ elapsed: now - start, videoTime: video.currentTime, waveClock: s.waveClock, pointer: s.pointer, frameCount: s.frameCount });
          if (now - start < 6000) requestAnimationFrame(tick);
          else resolve(samples);
        }
        requestAnimationFrame(tick);
      });
      done = true;
      clearTimeout(on); clearTimeout(off);
      return { startWall, endWall: Date.now() / 1000, events, decoded, samples };
    });
    await cdp.send('Page.stopScreencast');
    await cdp.detach();
    const after = await state(p.page);
    await p.context.close();
    let chosen = frames.filter((f) => f.timestamp >= timeline.startWall && f.timestamp <= timeline.endWall);
    if (chosen.length < 15) throw new Error(`Insufficient real screencast frames for ${variant}: ${chosen.length}`);
    const concat = resolve(dir, 'frames.ffconcat');
    let text = 'ffconcat version 1.0\n';
    for (let i = 0; i < chosen.length; i++) {
      const duration = i + 1 < chosen.length ? chosen[i + 1].timestamp - chosen[i].timestamp : Math.max(1 / 144, timeline.endWall - chosen[i].timestamp);
      text += `file '${chosen[i].path}'\nduration ${duration.toFixed(6)}\n`;
    }
    text += `file '${chosen.at(-1).path}'\n`;
    writeFileSync(concat, text);
    const clip = resolve(out, 'motion', `${key}-native-6s.mp4`);
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-safe', '0', '-f', 'concat', '-i', concat, '-vf', 'fps=30', '-t', '6', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', clip]);
    receipt.clips.push({ variant, key, normalized, url: p.url, viewport: [1440, 900], dpr: 2, before, after, timeline, frames: chosen.map((f) => ({ timestamp: f.timestamp, width: f.width, height: f.height })), captureFrames: chosen.length, captureElapsed: chosen.at(-1).timestamp - chosen[0].timestamp, clip, errors: p.errors });
    console.log(`${key}: ${chosen.length} screencast frames; ${timeline.samples.length} observed native render ticks`);
  }
  const output = resolve(out, 'motion/golden-versus-current-motion.mp4');
  const font = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', receipt.clips[0].clip, '-i', receipt.clips[1].clip,
    '-filter_complex', `[0:v]pad=iw:ih+44:0:44:color=0x151718,drawtext=fontfile=${font}:text='GOLDEN CHECKPOINT / native time':x=20:y=13:fontsize=18:fontcolor=white[a];[1:v]pad=iw:ih+44:0:44:color=0x151718,drawtext=fontfile=${font}:text='CONSOLIDATED / matched field, native time':x=20:y=13:fontsize=18:fontcolor=white[b];[a][b]hstack=inputs=2[v]`,
    '-map', '[v]', '-t', '6', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output]);
  receipt.comparison = output;
  save('receipts/motion.json', receipt);
} finally {
  await browser.close();
}
