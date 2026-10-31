import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Exercise the same source adapter used by the application, without React or
// WebGL. TypeScript is only erased; no playback logic is mocked or replaced.
export const cyclicSourceScript = ts.transpileModule(readFileSync(resolve(import.meta.dirname, '../../components/effects/cyclic-media-source.ts'), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText.replace('export function', 'function') + '\nwindow.__createCyclicMediaSource = createCyclicMediaSource;';

export async function sourceStartFrameHashes(page, source, fps = 30000 / 1001, stream = null) {
  if (stream && !await page.evaluate(() => typeof window.__createCyclicMediaSource === 'function')) {
    await page.addScriptTag({ content: cyclicSourceScript });
  }
  return page.evaluate(async ({ source, fps, stream }) => {
    const video = document.createElement('video');
    video.dataset.mediaReference = 'true';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
    document.body.append(video);
    const canvas = document.createElement('canvas'); canvas.width = 24; canvas.height = 14;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const readHash = () => {
      context.drawImage(video, 0, 0, 24, 14);
      let value = 2166136261;
      for (const byte of context.getImageData(0, 0, 24, 14).data) value = Math.imul(value ^ byte, 16777619) >>> 0;
      return value;
    };
    let loop;
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Reference clip did not preroll')), 10_000);
        const ready = () => { clearTimeout(timer); resolve(); };
        video.addEventListener('canplay', ready, { once: true });
        video.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Reference clip did not decode')); }, { once: true });
        if (stream) loop = window.__createCyclicMediaSource({ ...stream, file: source, getVideo: () => video, onError: reject });
        video.src = loop?.url ?? source;
      });
      const hashes = [];
      // Enumerate EVERY decoded prefix frame at a held midpoint. Sampling a
      // playing 60 fps reference on a 25 fps compositor misses different
      // pictures in each cycle. The reference uses the actual MSE decoder path.
      for (let frame = 0; frame < Math.ceil(.08 * fps); frame++) {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Reference prefix seek did not settle')), 10_000);
          video.addEventListener('seeked', () => { clearTimeout(timer); resolve(); }, { once: true });
          video.currentTime = (frame + .5) / fps;
        });
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        hashes.push(readHash());
      }
      return [...new Set(hashes)];
    } finally {
      video.removeAttribute('src'); video.load();
      loop?.dispose();
      video.remove();
    }
  }, { source, fps, stream });
}

export function showsSourceStart(data, wrap, hashes) {
  return Boolean(wrap) && data.frames.slice(wrap.index, wrap.index + 3)
    .some(frame => frame.at - wrap.at <= 80 && frame.sourceTime <= .1 && hashes.includes(frame.hash));
}
