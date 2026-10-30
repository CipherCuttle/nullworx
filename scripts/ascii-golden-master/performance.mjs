import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { launch, open, pose, frameSample, save, screenshot, state, cdpReceipt } from './browser-common.mjs';

const browser = await launch();
const receipt = {
  capturedAt: new Date().toISOString(),
  method: 'Headful Google Chrome on the physical display. Native video and wave clocks, no frame-limit override, no video recording during samples. ABBA order at 1440x900 CSS, actual canvas 2880x1800, DPR2, cell16, high quality; then native homepage/lab placements. Timings are delivered requestAnimationFrame intervals, not GPU execution durations.',
  historical: JSON.parse(readFileSync('/home/swirky/DevHub/experiments/ascii-waves-proof03/evidence/performance-gpu.json')),
  host: {
    gpu: execFileSync('nvidia-smi', ['--query-gpu=name,driver_version,display_active,utilization.gpu,clocks.gr', '--format=csv,noheader'], { encoding: 'utf8' }).trim(),
    loadAverage: readFileSync('/proc/loadavg', 'utf8').trim(),
  },
  samples: [],
};
try {
  for (const [index, variant] of ['golden', 'consolidated', 'consolidated', 'golden'].entries()) {
    const p = await open(browser, { variant, dpr: 2, normalized: true, query: variant === 'golden' ? '?chrome=0' : '' });
    await pose(p.page, { videoTime: 2.2, waveClock: 0 });
    await p.page.evaluate(async () => {
      window.__auditHoldVideo = false;
      const api = window.__auditApi;
      api.setFrozenTime(null);
      api.setPointerActive(false);
      await api.play();
    });
    await p.page.waitForTimeout(1200);
    const sample = await frameSample(p.page);
    receipt.samples.push({ index, variant, normalized: true, state: await state(p.page), sample, errors: p.errors });
    console.log(`${index} ${variant}: ${sample.fps.toFixed(1)} fps median ${sample.medianMs.toFixed(2)} p95 ${sample.p95Ms.toFixed(2)} ms`);
    if (index === 1) receipt.cdp = await cdpReceipt(browser, p.page);
    await p.context.close();
  }
  for (const [name, path] of [['home', '/'], ['lab', '/lab/ascii-waves']]) {
    const p = await open(browser, { variant: 'consolidated', path, dpr: 2 });
    await p.page.waitForTimeout(1200);
    const sample = await frameSample(p.page);
    receipt.samples.push({ variant: name, normalized: false, state: await state(p.page), sample, screenshot: await screenshot(p.page, `performance-native-${name}`), errors: p.errors });
    console.log(`${name} native: ${sample.fps.toFixed(1)} fps median ${sample.medianMs.toFixed(2)} p95 ${sample.p95Ms.toFixed(2)} ms`);
    await p.context.close();
  }
  receipt.host.gpuAfter = execFileSync('nvidia-smi', ['--query-gpu=name,driver_version,utilization.gpu,clocks.gr', '--format=csv,noheader'], { encoding: 'utf8' }).trim();
  save('receipts/performance-rtx4060.json', receipt);
} finally {
  await browser.close();
}
