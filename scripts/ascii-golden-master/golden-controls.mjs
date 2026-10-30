import { launch, open, state, save, screenshot } from './browser-common.mjs';

const browser = await launch();
const receipt = { capturedAt: new Date().toISOString(), scenes: [] };
try {
  for (const mobile of [false, true]) {
    const p = await open(browser, { variant: 'golden', dpr: 2, viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, touch: mobile });
    await p.page.getByRole('button', { name: 'Pause video', exact: true }).click();
    const pausedA = await state(p.page);
    await p.page.waitForTimeout(650);
    const pausedB = await state(p.page);
    if (mobile) await p.page.getByRole('button', { name: 'Adjust controls', exact: true }).click();
    else await p.page.getByRole('button', { name: 'Controls', exact: true }).click();
    const panel = p.page.getByRole('complementary', { name: 'ASCII Waves controls' });
    await panel.waitFor({ state: 'visible' });
    await p.page.waitForTimeout(400);
    const controls = await panel.innerText();
    const image = await screenshot(p.page, `golden-controls-${mobile ? 'mobile' : 'desktop'}`);
    receipt.scenes.push({ mobile, pausedA, pausedB, pauseBehavior: { videoHeld: pausedA.video.currentTime === pausedB.video.currentTime, wavesContinue: pausedB.snapshot.waveClock > pausedA.snapshot.waveClock + .5 }, controls, image, overflow: await p.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), errors: p.errors });
    await p.context.close();
  }
  save('receipts/golden-controls.json', receipt);
  console.log(JSON.stringify(receipt.scenes.map(({ mobile, pauseBehavior, overflow, errors }) => ({ mobile, pauseBehavior, overflow, errors })), null, 2));
} finally {
  await browser.close();
}
