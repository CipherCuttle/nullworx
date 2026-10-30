import { expect, test, type Browser, type Page } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3300";

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);
  const stage = page.locator("[data-ascii-stage]");
  if (await stage.count()) {
    await page.waitForFunction(() => document.querySelector("[data-ascii-stage]")?.getAttribute("data-ready") === "true", undefined, { timeout: 30_000 });
    await page.waitForTimeout(900);
  }
}

async function openPage(browser: Browser, path: string, viewport: { width: number; height: number }, options: { mobile?: boolean; reducedMotion?: "reduce" } = {}) {
  const context = await browser.newContext({
    baseURL,
    viewport,
    deviceScaleFactor: 1,
    isMobile: options.mobile ?? false,
    hasTouch: options.mobile ?? false,
    reducedMotion: options.reducedMotion ?? "no-preference",
  });
  const page = await context.newPage();
  await page.goto(path);
  await settle(page);
  return { context, page };
}

test.describe("evidence screenshots", () => {
  test("capture requested desktop and mobile layouts", async ({ browser }) => {
    const desktop = await openPage(browser, "/", { width: 1440, height: 900 });
    await desktop.page.screenshot({ path: "evidence/screenshots/home-desktop-1440x900.png" });
    await desktop.page.screenshot({ path: "evidence/screenshots/home-desktop-full.png", fullPage: true });
    await desktop.context.close();

    const homeMobile = await openPage(browser, "/", { width: 390, height: 844 }, { mobile: true });
    await homeMobile.page.screenshot({ path: "evidence/screenshots/home-mobile-390x844.png" });
    await homeMobile.page.screenshot({ path: "evidence/screenshots/home-mobile-full.png", fullPage: true });
    await homeMobile.context.close();

    const effects = await openPage(browser, "/effects", { width: 1440, height: 900 });
    await effects.page.screenshot({ path: "evidence/screenshots/effects-desktop-1440x900.png" });
    await effects.page.screenshot({ path: "evidence/screenshots/effects-desktop-full.png", fullPage: true });
    await effects.context.close();

    const lab = await openPage(browser, "/lab/ascii-waves", { width: 1440, height: 900 });
    await lab.page.screenshot({ path: "evidence/screenshots/ascii-waves-lab-desktop-1440x900.png" });
    await lab.page
      .locator('[data-testid="effect-preview"]')
      .evaluate((element) => element.scrollIntoView({ block: "center" }));
    await lab.page.waitForTimeout(1200);
    await lab.page.screenshot({ path: "evidence/screenshots/ascii-waves-lab-field-1440x900.png" });
    await lab.page.screenshot({ path: "evidence/screenshots/ascii-waves-lab-desktop-full.png", fullPage: true });
    await lab.context.close();

    const labMobile = await openPage(browser, "/lab/ascii-waves", { width: 390, height: 844 }, { mobile: true });
    await labMobile.page.screenshot({ path: "evidence/screenshots/ascii-waves-lab-mobile-390x844.png" });
    await labMobile.page.screenshot({ path: "evidence/screenshots/ascii-waves-lab-mobile-full.png", fullPage: true });
    await labMobile.context.close();

    const labSignup = await openPage(browser, "/lab/ascii-waves", { width: 1440, height: 900 });
    await labSignup.page.locator("#effect-drops-title").scrollIntoViewIfNeeded();
    await labSignup.page.screenshot({ path: "evidence/screenshots/ascii-waves-lab-signup-1440x900.png" });
    await labSignup.context.close();

    const drops = await openPage(browser, "/drops", { width: 1440, height: 900 });
    await drops.page.screenshot({ path: "evidence/screenshots/drops-desktop-1440x900.png" });
    await drops.page.screenshot({ path: "evidence/screenshots/drops-desktop-full.png", fullPage: true });
    await drops.page.getByLabel("Email address").scrollIntoViewIfNeeded();
    await drops.page.screenshot({ path: "evidence/screenshots/drops-signup-desktop-1440x900.png" });
    await drops.context.close();

    const dropsMobile = await openPage(browser, "/drops", { width: 390, height: 844 }, { mobile: true });
    await dropsMobile.page.screenshot({ path: "evidence/screenshots/drops-mobile-390x844.png" });
    await dropsMobile.page.screenshot({ path: "evidence/screenshots/drops-mobile-full.png", fullPage: true });
    await dropsMobile.context.close();
  });

  test("capture reduced-motion still and mobile gallery", async ({ browser }) => {
    const reduced = await openPage(browser, "/lab/ascii-waves", { width: 1440, height: 900 }, { reducedMotion: "reduce" });
    await expect(reduced.page.locator("[data-reduced-motion='true']")).toHaveCount(1);
    await reduced.page.screenshot({ path: "evidence/screenshots/ascii-waves-lab-reduced-motion-1440x900.png" });
    await reduced.context.close();

    const effectsMobile = await openPage(browser, "/effects", { width: 390, height: 844 }, { mobile: true });
    await effectsMobile.page.screenshot({ path: "evidence/screenshots/effects-mobile-390x844.png" });
    await effectsMobile.page.screenshot({ path: "evidence/screenshots/effects-mobile-full.png", fullPage: true });
    await effectsMobile.context.close();
  });
});
