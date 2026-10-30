import { resolve } from 'node:path';
import { launch, open, state, save, screenshot, config, out, attachApi, installObservers } from './browser-common.mjs';

const browser = await launch();
const receipt = { capturedAt: new Date().toISOString(), checks: [], scenarios: [], inconclusive: [] };
const check = (name, pass, evidence) => receipt.checks.push({ name, pass: Boolean(pass), evidence });
const phase = (page, value) => page.waitForFunction((value) => document.querySelector('[data-ascii-stage]')?.dataset.playback === value, value, { timeout: 15000 });
const pic = async (page, name) => {
  const file = resolve(out, 'screenshots', name + '.png');
  await page.locator('[data-ascii-stage]').screenshot({ path: file, scale: 'css' });
  return file;
};
try {
  for (const [name, path] of [['home', '/'], ['lab', '/lab/ascii-waves']]) {
    const p = await open(browser, { variant: 'consolidated', path, dpr: 2 });
    await phase(p.page, 'live');
    const first = await state(p.page);
    await p.page.waitForTimeout(650);
    const live = await state(p.page);
    check(`${name}: source and rendered frames advance`, live.snapshot.frameCount > first.snapshot.frameCount && live.video.currentTime !== first.video.currentTime && live.snapshot.waveClock > first.snapshot.waveClock, { first, live });
    check(`${name}: approved 2.2-second initial seek`, live.events.some((e) => e.event === 'seeked' && Math.abs(e.time - 2.2) < .03), live.events);
    check(`${name}: high DPR default`, live.snapshot.dpr === 2 && live.snapshot.maxDpr === 2, live.metrics);
    check(`${name}: original palette and all wave defaults`, live.snapshot.settings.characters === ' .:-+*=%@#' && live.snapshot.settings.color === '#ffffff' && !live.snapshot.settings.invert && live.snapshot.settings.speed === 1 && live.snapshot.settings.noiseScale === 2 && live.snapshot.settings.waveTension === .5 && live.snapshot.settings.waveTwist === .1 && live.snapshot.settings.intensity === 1 && live.snapshot.settings.interactionIntensity === 1, live.snapshot.settings);
    check(`${name}: local reviewed MP4, muted loop`, live.video.src.endsWith('/media/flower.mp4') && live.video.muted && live.video.loop, live.video);
    check(`${name}: no initial horizontal overflow`, live.overflow === 0, live.overflow);
    const stage = p.page.locator('[data-ascii-stage]');
    const box = await stage.boundingBox();
    await p.page.mouse.move(box.x + box.width * .7, box.y + box.height * .35);
    await p.page.waitForTimeout(500);
    const pointer = await state(p.page);
    check(`${name}: local mouse eddy reacts`, pointer.snapshot.pointer.strength > .9 && Math.abs(pointer.snapshot.pointer.x - .7) < .02, pointer.snapshot.pointer);
    await p.page.mouse.move(0, 0);
    await p.page.waitForTimeout(800);
    const released = await state(p.page);
    check(`${name}: pointer settles on leave`, released.snapshot.pointer.strength < .02, released.snapshot.pointer);
    await p.page.getByRole('button', { name: name === 'home' ? 'Pause' : 'Motion', exact: true }).click();
    await phase(p.page, 'paused');
    await p.page.waitForTimeout(600);
    const pausedA = await state(p.page);
    const imageA = await pic(p.page, `${name}-paused-a`);
    await p.page.waitForTimeout(650);
    const pausedB = await state(p.page);
    const imageB = await pic(p.page, `${name}-paused-b`);
    check(`${name}: pause freezes video and wave clock`, pausedB.video.currentTime === pausedA.video.currentTime && pausedB.snapshot.waveClock === pausedA.snapshot.waveClock && !pausedB.snapshot.settings.cursorInteraction, { pausedA, pausedB, imageA, imageB });
    await p.page.getByRole('button', { name: name === 'home' ? 'Play' : 'Motion', exact: true }).click();
    await phase(p.page, 'live');
    check(`${name}: explicit resume returns live`, true, await state(p.page));
    if (name === 'lab') {
      await p.page.getByLabel('Cell pitch', { exact: true }).selectOption('20');
      await p.page.getByLabel('Quality', { exact: true }).selectOption('efficient');
      await p.page.getByLabel(/Wave speed/).fill('0.5');
      await p.page.waitForTimeout(250);
      const changed = await state(p.page);
      check('lab: density, quality and speed controls reach renderer', changed.snapshot.cellSize === 20 && changed.snapshot.dpr === 1 && changed.snapshot.settings.speed === .5, changed.snapshot);
      await p.page.getByRole('button', { name: 'Pointer eddy', exact: true }).click();
      check('lab: pointer toggle reaches renderer', !(await state(p.page)).snapshot.settings.cursorInteraction, (await state(p.page)).snapshot.settings);
      await p.page.getByRole('button', { name: 'Reset', exact: true }).click();
      await p.page.waitForTimeout(250);
      const reset = await state(p.page);
      check('lab: reset restores high quality, auto density, speed, pointer', reset.snapshot.dpr === 2 && reset.snapshot.settings.speed === 1 && reset.snapshot.settings.cursorInteraction && reset.snapshot.cellSize === 16, reset.snapshot);
      await p.context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: config.origins.consolidated });
      await p.page.getByRole('button', { name: 'Copy config', exact: true }).click();
      const copied = await p.page.evaluate(() => navigator.clipboard.readText());
      check('lab: copied config reflects reviewed defaults', copied.includes('quality: "high"') && copied.includes('speed: 1'), copied);
    }
    await p.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await phase(p.page, 'offscreen');
    await p.page.waitForTimeout(300);
    const offscreen = await state(p.page);
    check(`${name}: offscreen pauses decoder and renderer`, offscreen.video.playing === false && offscreen.metrics.running === false, offscreen);
    await stage.scrollIntoViewIfNeeded();
    await phase(p.page, 'live');
    const background = await p.context.newPage();
    await background.goto('about:blank');
    await background.bringToFront();
    await p.page.waitForTimeout(700);
    const hidden = await state(p.page);
    const visibility = await p.page.evaluate(() => ({ hidden: document.hidden, visibility: document.visibilityState, toolbar: document.querySelector('[data-testid="effect-preview"]')?.parentElement?.textContent?.slice(0, 400) }));
    if (visibility.hidden) check(`${name}: background tab reports hidden truthfully`, hidden.stage.playback === 'hidden' && hidden.metrics.running === false, { hidden, visibility });
    else receipt.inconclusive.push({ name: `${name}: native background visibility`, reason: 'Chrome kept independent target windows visible; no real visibility transition occurred. See separately labelled visibility-event simulation.', evidence: { hidden, visibility } });
    await background.close();
    await p.page.bringToFront();
    await phase(p.page, 'live');
    check(`${name}: native path has no console/network errors`, p.errors.length === 0, p.errors);
    receipt.scenarios.push({ name, kind: 'native-controls', first, live, pausedA, pausedB, offscreen, hidden, visibility, errors: p.errors });
    await p.context.close();
  }
  for (const [name, path] of [['home', '/'], ['lab', '/lab/ascii-waves']]) {
    const p = await open(browser, { variant: 'consolidated', path, viewport: { width: 390, height: 844 }, dpr: 2, touch: true });
    await phase(p.page, 'live');
    const stage = p.page.locator('[data-ascii-stage]');
    const b = await stage.boundingBox();
    const cdp = await p.context.newCDPSession(p.page);
    const touch = { x: b.x + b.width * .7, y: b.y + b.height * .5 };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touch.x + 2, y: touch.y + 2 }] });
    await p.page.waitForTimeout(500);
    const active = await state(p.page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.page.waitForTimeout(850);
    const released = await state(p.page);
    check(`${name}: actual emulated touch activates eddy`, active.snapshot.pointer.strength > .8, active.snapshot.pointer);
    check(`${name}: touch release settles eddy`, released.snapshot.pointer.strength < .02, released.snapshot.pointer);
    check(`${name}: mobile auto pitch, DPR and no overflow`, released.snapshot.cellSize === 12 && released.snapshot.dpr === 2 && released.overflow === 0, released);
    const touchAction = await stage.locator('[data-ascii-waves]').evaluate((node) => getComputedStyle(node).touchAction);
    check(`${name}: page scroll remains available`, touchAction === 'pan-y', touchAction);
    const controls = await p.page.getByRole('button').allTextContents();
    receipt.scenarios.push({ name, kind: 'mobile-touch', active, released, controls, touchAction, screenshot: await screenshot(p.page, `${name}-mobile-touch`) });
    await cdp.detach();
    await p.context.close();
  }
  for (const [name, path] of [['home', '/'], ['lab', '/lab/ascii-waves']]) {
    const p = await open(browser, { variant: 'consolidated', path, reducedMotion: 'reduce' });
    await phase(p.page, 'reduced');
    await p.page.waitForTimeout(500);
    const a = await state(p.page);
    await p.page.waitForTimeout(700);
    const b = await state(p.page);
    check(`${name}: reduced motion is still and truthfully labelled`, a.snapshot.waveClock === b.snapshot.waveClock && a.video.currentTime === b.video.currentTime && b.stage.live === 'false' && b.snapshot.settings.cursorInteraction === false, { a, b });
    receipt.scenarios.push({ name, kind: 'reduced', a, b, screenshot: await screenshot(p.page, `${name}-reduced`) });
    await p.context.close();
  }
  for (const failure of ['webgl', 'decode', 'autoplay']) {
    for (const [name, path] of [['home', '/'], ['lab', '/lab/ascii-waves']]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'no-preference' });
      await installObservers(context);
      if (failure === 'webgl') await context.addInitScript(() => {
        const get = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) { return type === 'webgl2' ? null : get.call(this, type, ...args); };
      });
      if (failure === 'decode') await context.route('**/media/flower.mp4', (route) => route.fulfill({ status: 404, contentType: 'text/plain', body: 'Deliberate local audit decode failure' }));
      if (failure === 'autoplay') await context.addInitScript(() => {
        const play = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function (...args) {
          if (!window.__auditUnblock) return Promise.reject(new DOMException('Deliberate audit autoplay policy', 'NotAllowedError'));
          return play.apply(this, args);
        };
      });
      const page = await context.newPage();
      const errors = [];
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(config.origins.consolidated + path);
      await page.locator('[data-ascii-stage]').scrollIntoViewIfNeeded();
      await phase(page, failure === 'autoplay' ? 'blocked' : 'error');
      await attachApi(page);
      await page.waitForTimeout(600);
      const before = await state(page);
      const labelText = await page.locator('main').innerText();
      const image = await screenshot(page, `${name}-${failure}`);
      if (failure === 'autoplay') {
        const clock = before.snapshot.waveClock;
        await page.waitForTimeout(500);
        const held = await state(page);
        check(`${name}: blocked autoplay freezes clock and avoids LIVE`, held.snapshot.waveClock === clock && held.stage.live === 'false', { before, held });
        await page.evaluate(() => { window.__auditUnblock = true; });
        if (name === 'home') await page.getByRole('button', { name: /Start live field/ }).click();
        else {
          await page.getByRole('button', { name: 'Motion', exact: true }).click();
          await phase(page, 'paused');
          await page.getByRole('button', { name: 'Motion', exact: true }).click();
        }
        await phase(page, 'live');
        check(`${name}: visitor action recovers blocked playback`, true, await state(page));
      } else {
        const fallback = await page.locator('[data-ascii-stage] img').evaluateAll((images) => images.map((image) => ({ complete: image.complete, naturalWidth: image.naturalWidth, display: getComputedStyle(image).display, opacity: getComputedStyle(image).opacity, rect: { width: image.getBoundingClientRect().width, height: image.getBoundingClientRect().height } })));
        check(`${name}: ${failure} has visible loaded poster and fallback label`, fallback.some((i) => i.complete && i.naturalWidth > 0 && i.display !== 'none' && Number(i.opacity) > 0 && i.rect.width > 0) && before.stage.live === 'false' && /fallback|unavailable/i.test(labelText), { fallback, before, labelText });
      }
      receipt.scenarios.push({ name, kind: failure, before, labelText, screenshot: image, errors, expectedFailure: true });
      await context.close();
    }
  }
} catch (error) {
  receipt.fatal = { message: error.message, stack: error.stack };
} finally {
  save('receipts/flow-verification.json', receipt);
  console.log(JSON.stringify({ checks: receipt.checks.length, passed: receipt.checks.filter((c) => c.pass).length, failed: receipt.checks.filter((c) => !c.pass).map((c) => c.name), fatal: receipt.fatal }, null, 2));
  await browser.close();
}
if (receipt.fatal || receipt.checks.some((c) => !c.pass)) process.exitCode = 1;
