#!/usr/bin/env node
/**
 * Observe actual video readiness, source RGB and ASCII canvas across loops.
 * WebGL with preserveDrawingBuffer=false may not support reliable readback.
 * This diagnostic does not modify media, renderer, or source footage.
 *
 * BASE_URL=http://127.0.0.1:3200 ROUTE=/lab/ascii-waves node scripts/ascii-fidelity/probe-flash.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const base = process.env.BASE_URL ?? 'http://127.0.0.1:3200';
const route = process.env.ROUTE ?? '/lab/ascii-waves';
const output = resolve(process.env.OUTPUT_DIR ?? 'evidence/ascii-fidelity-proof-01/flash');
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.CHANNEL || 'chrome' });
try {
  const page = await browser.newPage({ viewport: {width: 1440, height: 900}, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  page.setDefaultTimeout(90_000);
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('console', e => { if (e.type() === 'error') pageErrors.push(e.text()); });
  await page.goto(new URL(route,base).href, { waitUntil:'networkidle' });
  await page.waitForSelector('[data-ascii-stage] canvas');
  await page.waitForFunction(() => Number(document.querySelector('[data-ascii-stage]')?.dataset.cycleDuration) > 0, null, {timeout:25_000});
  const report = await page.evaluate(async () => {
    const stage = document.querySelector('[data-ascii-stage]');
    const video = stage?.querySelector('video');
    const canvas = stage?.querySelector('canvas');
    if (!stage || !video || !canvas) throw new Error('Missing video, canvas or stage');
    const duration = Number(stage.dataset.cycleDuration);
    const length = Math.max(12000, Math.min(45000, duration*3.5*1000));
    const readCanvas = document.createElement('canvas');
    readCanvas.width=48;readCanvas.height=27;
    const readCtx = readCanvas.getContext('2d', {willReadFrequently:true});
    const mediaCanvas = document.createElement('canvas');
    mediaCanvas.width=48;mediaCanvas.height=27;
    const mediaCtx = mediaCanvas.getContext('2d', {willReadFrequently:true});
    const statistics = (ctx, element) => {
      try {
        ctx.clearRect(0,0,48,27);
        ctx.drawImage(element,0,0,48,27);
        const data = ctx.getImageData(0,0,48,27).data;
        let brightness=0, bright=0, nonblack=0;
        for(let n=0;n<data.length;n+=4) {
          const r=data[n],g=data[n+1],b=data[n+2];
          brightness += (.2126*r+.7152*g+.0722*b)/255;
          if(r>230&&g>230&&b>230) bright++;
          if(r+g+b>18) nonblack++;
        }
        const cells = data.length/4;
        return {mean:Math.round(brightness/cells*1000)/1000, nearWhite:bright/cells, nonBlack:nonblack/cells};
      } catch(e) { return {error:String(e)}; }
    };
    const events=[];
    const watched=['waiting','stalled','playing','pause','seeked','seeking','emptied','loadeddata','canplay','ended','error'];
    const onEvent=e=>events.push({at:Math.round(performance.now()),name:e.type,currentTime:video.currentTime,readyState:video.readyState});
    for(const type of watched)video.addEventListener(type,onEvent);
    const samples=[], start=performance.now();
    let last=0;
    await new Promise(resolve=>{
      const tick=now=>{
        if(now-last>=40){
          last=now;
          const videoPixels=video.readyState>=2?statistics(mediaCtx,video):null;
          const canvasPixels=statistics(readCtx,canvas);
          samples.push({
            ms:Math.round(now-start),phase:stage.dataset.playback,
            sourceTime:Number(stage.dataset.videoTime),nativeTime:video.currentTime,
            readyState:video.readyState,paused:video.paused,seeking:video.seeking,
            frameCount:Number(stage.dataset.frameCount),
            video:videoPixels,canvas:canvasPixels,
          });
        }
        if(now-start>=length)resolve();else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    for(const type of watched)video.removeEventListener(type,onEvent);
    let wraps=0;
    const whiteCandidates=[],dropouts=[];
    for(let i=1;i<samples.length-1;i++){
      const prev=samples[i-1],curr=samples[i],next=samples[i+1];
      if(prev.sourceTime-curr.sourceTime>duration*.5)wraps++;
      if(curr.readyState<2&&prev.readyState>=2)dropouts.push({ms:curr.ms,sourceTime:curr.sourceTime});
      if(curr.canvas?.mean!=null&&prev.canvas?.mean!=null
        &&curr.canvas.mean-prev.canvas.mean>.22&&curr.canvas.nearWhite>.12
        &&next.canvas?.mean!=null)
        whiteCandidates.push({ms:curr.ms,sourceTime:curr.sourceTime,canvas:curr.canvas,video:curr.video,
          previousCanvas:prev.canvas,nextCanvas:next.canvas});
    }
    const nonBlack=samples.filter(s=>s.canvas?.nonBlack>.002).length;
    return {
      browser:navigator.userAgent,route:location.pathname,source:stage.dataset.sourceUrl,
      mode:stage.dataset.loopMode,duration,stageRect:stage.getBoundingClientRect().toJSON(),
      sampleCount:samples.length,wraps,readyDropouts:dropouts,whiteCandidates,
      canvasReadbackProbablyUsable: nonBlack>samples.length*.3,
      warning:'WebGL canvas read-back with preserveDrawingBuffer:false may return blank. Zero-white samples do not prove the visible flash is absent.',
      events,samples,
    };
  });
  report.pageErrors=pageErrors;
  writeFileSync(resolve(output, 'flash-probe.json'), JSON.stringify(report,null,2)+'\n');
  const summary={
    output,source:report.source,mode:report.mode,duration:report.duration,
    sampled:report.sampleCount,wraps:report.wraps,dropouts:report.readyDropouts.length,
    whiteCandidates:report.whiteCandidates.length,
    canvasReadbackProbablyUsable:report.canvasReadbackProbablyUsable,
    pageErrors,warning:report.warning
  };
  writeFileSync(resolve(output, 'SUMMARY.md'), [
    '# ASCII white-flash diagnostic — hypothesis only', '',
    JSON.stringify(summary,null,2), '',
    'Compare raw source-video brightness with canvas brightness at each candidate.',
    'A readyState drop with a white canvas and dark video suggests a bright procedural fallback.',
    'A bright source frame means the encoded media itself needs seam inspection.',
    'Inconclusive canvas read-back needs compositor screenshots or screen capture.',
    'This does not assert continuous LIVE or a repaired loop.',
  ].join('\n')+'\n');
  console.log(JSON.stringify(summary,null,2));
} finally {
  await browser.close();
}
