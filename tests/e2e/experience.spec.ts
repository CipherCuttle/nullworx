import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const baseURL = "http://127.0.0.1:3300";

async function waitForFontsAndField(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const field = page.locator('[data-testid="home-field"], [data-testid="effect-preview"]');
  await field.waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const stage = document.querySelector('[data-ascii-stage]');
    return stage?.getAttribute("data-ready") === "true";
  }, undefined, { timeout: 30_000 });
}

test.describe("core experience", () => {
  test("homepage renders its copy in HTML and a real WebGL field in the browser", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: /The screen is a living surface/i })).toBeVisible();
    await waitForFontsAndField(page);
    await expect(page.locator('[data-testid="home-field"]')).toHaveAttribute("data-ready", "true");
    await expect(page.locator("canvas")).toHaveCount(1);
    await expect(page.getByText("OWNER REVIEW / NOT RELEASED")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("lab preview exposes live controls, copies reviewed config and uses reduced motion", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseURL });
    await page.goto("/lab/ascii-waves");
    await waitForFontsAndField(page);

    const motion = page.getByRole("button", { name: "Motion" });
    await expect(motion).toHaveAttribute("aria-pressed", "true");
    await motion.click();
    await expect(motion).toHaveAttribute("aria-pressed", "false");

    await page.getByLabel("Quality").selectOption("efficient");
    await page.getByLabel("Cell pitch").selectOption("16");
    const speed = page.getByLabel(/Wave speed/);
    await speed.focus();
    for (let step = 0; step < 4; step += 1) await speed.press("ArrowRight");

    await page.getByRole("button", { name: "Copy config" }).click();
    await expect(page.getByRole("button", { name: /Copied/ })).toBeVisible();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain('cellSize: "16"');
    expect(clipboard).toContain("quality: \"efficient\"");
    expect(clipboard).toContain("speed: 1.4");
    expect(clipboard).toContain('reducedMotion: "system"');

    await page.getByRole("button", { name: "Copy usage" }).click();
    const usage = await page.evaluate(() => navigator.clipboard.readText());
    expect(usage).toContain('"use client"');
    expect(usage).toContain('preset="flower"');
    expect(usage).toContain("reducedMotion=\"system\"");
  });

  test("reduced motion freezes the field and still exposes the accessible label", async ({ browser }) => {
    const context = await browser.newContext({
      baseURL,
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto("/lab/ascii-waves");
    await waitForFontsAndField(page);
    await expect(page.locator("[data-reduced-motion='true']")).toHaveCount(1);
    await expect(page.locator("canvas[role='img']")).toHaveAttribute("aria-label", /ASCII Waves field/);
    await context.close();
  });

  test("desktop and mobile layouts do not overflow and the mobile menu navigates", async ({ browser }) => {
    const mobile = await browser.newContext({
      baseURL,
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    });
    const page = await mobile.newPage();
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBe(overflow.clientWidth);

    const menu = page.locator("details").first();
    await page.getByLabel("Open navigation").click();
    await expect(menu).toHaveAttribute("open", "");
    await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Effects" }).click();
    await page.waitForURL("**/effects");
    await expect(page.getByRole("heading", { level: 1, name: /What is public/ })).toBeVisible();
    await mobile.close();
  });

  test("page-level structure and landmarks are accessible", async ({ page }) => {
    for (const path of ["/", "/effects", "/drops", "/privacy", "/licenses", "/lab/ascii-waves"]) {
      await page.goto(path);
      await expect(page.getByRole("banner")).toBeVisible();
      await expect(page.getByRole("main")).toBeVisible();
      await expect(page.getByRole("contentinfo")).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    }
  });

  test("no third-party cookies are set and the footer does not invent a support URL", async ({ page, context }) => {
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const cookies = await context.cookies();
    expect(cookies).toEqual([]);
    await expect(page.getByText("No tracking cookies")).toBeVisible();
    await expect(page.getByRole("link", { name: /Buy me a coffee/i })).toHaveCount(0);

    await page.goto("/lab/ascii-waves");
    await expect(page.getByRole("link", { name: /Buy me a coffee/i })).toHaveCount(0);
  });

  test("serious accessibility violations are absent on core routes", async ({ page }) => {
    for (const path of ["/", "/effects", "/drops", "/lab/ascii-waves", "/privacy", "/licenses"]) {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const serious = results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
      expect(serious, `${path}: ${serious.map((item) => item.id).join(", ")}`).toEqual([]);
    }
  });
});
