import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const route = "/lab/forge-factory-01";
const sizes = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "phone", width: 390, height: 844 },
  { label: "small", width: 320, height: 720 },
];

for (const size of sizes) {
  test(`white Forge Factory renders all three proofs without overflow at ${size.label}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(route, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /Good effects/i })).toBeVisible();
    await expect(page.locator('[data-forge-factory="01"]')).toHaveCSS("background-color", "rgb(247, 247, 242)");
    await expect(page.getByTestId("glyph-morph-visible")).toBeVisible();
    await expect(page.getByTestId("glyph-morph-visible")).toHaveText("HELLO WORLD", { timeout: 5000 });
    await mkdir("test-results/forge-factory-01", { recursive: true });
    await page.screenshot({ path: `test-results/forge-factory-01/${size.label}-glyph.png`, fullPage: true, animations: "disabled" });
    for (const effect of ["prism", "magnetic", "glyph"]) {
      await page.getByTestId(`select-${effect}`).click();
      await expect(page.locator(`[data-effect="${effect === "glyph" ? "glyph-morph" : effect === "prism" ? "prism-text" : "magnetic-focus"}"]`)).toBeVisible();
      await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveCount(1);
      if (effect === "glyph") {
        await expect(page.getByTestId("glyph-morph-visible")).toHaveText("HELLO WORLD", { timeout: 5000 });
      }
      await page.screenshot({ path: `test-results/forge-factory-01/${size.label}-${effect}.png`, fullPage: true, animations: "disabled" });
    }
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    expect(errors).toEqual([]);

  });
}

test("effects are interactive, keyboard-accessible and honestly honor reduced motion", async ({ page }) => {
  await page.goto(route, { waitUntil: "networkidle" });
  await page.getByTestId("select-magnetic").click();
  const button = page.locator('[data-effect="magnetic-focus"]');
  await button.focus();
  await expect(button).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Activated 1 time")).toBeVisible();
  await page.getByTestId("toggle-motion").click();
  await expect(button).toHaveAttribute("data-motion", "disabled");
  await page.getByTestId("select-prism").click();
  await page.getByTestId("toggle-motion").click();
  await expect(page.locator('[data-effect="prism-text"]')).toHaveAttribute("data-paused", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByTestId("select-magnetic").click();
  await expect(page.locator('[data-effect="magnetic-focus"]')).toHaveAttribute("data-motion", "disabled");
  await page.getByTestId("select-glyph").click();
  await expect(page.getByTestId("glyph-morph-visible")).toHaveText("HELLO WORLD");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});
