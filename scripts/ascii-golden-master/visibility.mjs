import { launch, open, state, save } from './browser-common.mjs';

const browser = await launch();
const phase = process.argv[2] || 'after';
const results = [];
try {
  for (const [name, path] of [['home', '/'], ['lab', '/lab/ascii-waves']]) {
    const p = await open(browser, { variant: 'consolidated', path });
    await p.page.waitForFunction(() => document.querySelector('[data-ascii-stage]').dataset.playback === 'live');
    await p.page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await p.page.waitForFunction(() => document.querySelector('[data-ascii-stage]').dataset.playback === 'hidden');
    const hidden = await state(p.page);
    const labels = await p.page.evaluate(() => ({
      home: document.querySelector('[data-home-field] [class*="readout"]')?.textContent,
      lab: document.querySelector('[data-testid="effect-preview"]')?.parentElement?.querySelector('[class*="toolbar"]')?.textContent,
    }));
    await p.page.evaluate(() => {
      delete document.hidden;
      delete document.visibilityState;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await p.page.waitForFunction(() => document.querySelector('[data-ascii-stage]').dataset.playback === 'live');
    results.push({ name, method: 'Explicit test-only document visibility override + visibilitychange event; not a native OS/tab transition. Independent headful windows stayed visible in the native attempt.', hidden, labels, resumed: await state(p.page), pausedPass: hidden.video.playing === false && hidden.metrics.running === false, labelPass: /hidden/i.test(labels[name]), errors: p.errors });
    await p.context.close();
  }
  save(`receipts/visibility-${phase}.json`, results);
  console.log(JSON.stringify(results.map(({ name, pausedPass, labelPass, labels }) => ({ name, pausedPass, labelPass, labels })), null, 2));
} finally {
  await browser.close();
}
if (results.some((r) => !r.pausedPass || !r.labelPass)) process.exitCode = 1;
