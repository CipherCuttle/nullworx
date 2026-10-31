import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

test.use({ video: "on" });

const route = "/lab/forge-flagship-01";
const sizes = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "phone", width: 390, height: 844 },
  { label: "small", width: 320, height: 720 },
] as const;

for (const size of sizes) {
  test("flagship visual, animation and layout: " + size.label, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(route, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /Light behaves/i })).toBeVisible();
    await mkdir("test-results/forge-flagship-01", { recursive: true });
    const observations = [];
    for (const effect of ["spectral", "liquid", "card"] as const) {
      await page.getByTestId("select-" + effect).click();
      await expect(page.getByTestId("flagship-stage")).toBeVisible();
      if (effect === "card") {
        await expect(page.locator('[data-effect="refraction-card"]')).toBeVisible();
      } else {
        const shader = page.locator("[data-shader-status]");
        await expect(shader).toHaveAttribute("data-shader-status", "webgl2", { timeout: 8_000 });
        const canvas = shader.locator("canvas");
        await expect(canvas).toBeVisible();
        const before = await canvas.screenshot();
        await page.waitForTimeout(950);
        const after = await canvas.screenshot();
        expect(before.equals(after), "Shader must animate, not display a frozen still").toBe(false);
        observations.push(await shader.evaluate((el, name) => {
          const canvas = el.querySelector("canvas");
          return { effect: name, status: el.getAttribute("data-shader-status"), canvasWidth: canvas?.width, canvasHeight: canvas?.height, frames: canvas?.dataset.frames };
        }, effect));
      }
      await page.screenshot({ path: "test-results/forge-flagship-01/" + size.label + "-" + effect + ".png", fullPage: true });
    }
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(errors).toEqual([]);
    await writeFile("test-results/forge-flagship-01/" + size.label + "-observations.json", JSON.stringify(observations, null, 2));
  });
}
test("pause, keyboard and reduced motion", async ({ page }) => {
  await page.goto(route, { waitUntil: "networkidle" });
  const button = page.getByTestId("toggle-motion");
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toContainText("RESUME");
  await page.getByTestId("select-card").click();
  await expect(page.locator('[data-effect="refraction-card"]')).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByTestId("select-spectral").click();
  await expect(page.locator("[data-shader-status]")).toHaveAttribute("data-shader-status", "webgl2");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});
