// Execute with the connected Playwright browser_run_code_unsafe tool after removing "export default ".
// Returns real clipboard payloads so the clean consumer can compile and render them.
export default async function verifyGallery(page) {
  const checks = [];
  const failures = [];
  const copied = [];
  const runtimeErrors = [];
  const failedRequests = [];
  const check = (name, condition) => {
    if (!condition) failures.push(name);
    else checks.push(name);
  };
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Runtime.enable");
  await cdp.send("Network.enable");
  cdp.on("Runtime.exceptionThrown", (event) => runtimeErrors.push(event.exceptionDetails.text));
  cdp.on("Network.loadingFailed", (event) => failedRequests.push(event.errorText));
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://127.0.0.1:3100" });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:3100");
  const preview = page.getByTestId("live-preview");
  const navigation = page.getByRole("navigation", { name: "Choose a component" });
  const choose = async (name) => navigation.getByRole("button", { name: new RegExp(name) }).click();
  const clipboard = () => page.evaluate(() => navigator.clipboard.readText());
  async function capture(slug) {
    await page.getByRole("tab", { name: "Usage", exact: true }).click();
    const expectedUsage = await page.getByTestId("usage-code").textContent();
    await page.getByRole("button", { name: "Copy usage", exact: true }).click();
    const usage = await clipboard();
    check(`${slug}: actual clipboard usage matches displayed example`, usage === expectedUsage);
    await page.getByRole("tab", { name: "Code", exact: true }).click();
    const files = [];
    for (const ext of ["tsx", "module.css"]) {
      const name = `${slug}.${ext}`;
      await page.getByRole("button", { name, exact: true }).click();
      const displayed = await page.getByTestId("source-code").textContent();
      await page.getByRole("button", { name: "Copy source", exact: true }).click();
      const content = await clipboard();
      check(`${name}: actual clipboard source matches displayed file`, content === displayed && content.length > 100);
      files.push({ name, content });
    }
    copied.push({ slug, usage, files });
    await page.getByRole("tab", { name: "Preview", exact: true }).click();
  }
  const command = preview.getByRole("button");
  check("CommandButton: default native button", await command.getAttribute("type") === "button" && await command.isEnabled());
  await command.focus();
  check("CommandButton: visible keyboard focus", await command.evaluate((el) => getComputedStyle(el).outlineStyle === "solid" && parseFloat(getComputedStyle(el).outlineWidth) >= 2));
  await command.press("Enter");
  check("CommandButton: Enter activates", await page.getByRole("status").filter({ hasText: "Command received." }).count() === 1);
  await page.getByLabel("Label", { exact: true }).fill('Build "calm" & ship <ideas>');
  await command.focus();
  await command.press("Space");
  check("CommandButton: Space activates", await page.getByRole("status").filter({ hasText: "Command received." }).count() === 1);
  await page.getByLabel("Variant", { exact: true }).selectOption("outline");
  check("CommandButton: outline control", await command.getAttribute("data-variant") === "outline");
  await page.getByLabel("Variant", { exact: true }).selectOption("ghost");
  await page.getByRole("radio", { name: "Teal", exact: true }).check();
  await page.getByLabel("Size", { exact: true }).selectOption("lg");
  check("CommandButton: accent, size and ghost controls", await command.getAttribute("data-accent") === "teal" && await command.getAttribute("data-size") === "lg" && await command.getAttribute("data-variant") === "ghost");
  await page.getByRole("checkbox", { name: "Loading", exact: true }).check();
  check("CommandButton: loading is busy and blocks activation", await command.isDisabled() && await command.getAttribute("aria-busy") === "true" && (await command.textContent()).includes("Working"));
  await page.getByRole("checkbox", { name: "Loading", exact: true }).uncheck();
  await page.getByRole("checkbox", { name: "Disabled", exact: true }).check();
  check("CommandButton: disabled control", await command.isDisabled());
  await page.getByRole("checkbox", { name: "Disabled", exact: true }).uncheck();
  await page.getByRole("checkbox", { name: "Show arrow", exact: true }).uncheck();
  check("CommandButton: optional arrow", await command.locator('[aria-hidden="true"]').count() === 0);
  await capture("command-button");
  await page.getByRole("tab", { name: "Preview", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  check("Documentation tabs: ArrowRight changes tab and focus", await page.getByRole("tab", { name: "Code", exact: true }).getAttribute("aria-selected") === "true" && await page.getByRole("tab", { name: "Code", exact: true }).evaluate((el) => el === document.activeElement));
  await page.keyboard.press("End");
  check("Documentation tabs: End selects Usage", await page.getByRole("tab", { name: "Usage", exact: true }).getAttribute("aria-selected") === "true");
  await page.keyboard.press("Home");
  check("Documentation tabs: Home selects Preview", await page.getByRole("tab", { name: "Preview", exact: true }).getAttribute("aria-selected") === "true");

  await choose("SignalCard");
  await page.getByLabel("Heading", { exact: true }).fill('Monthly "signal" & growth');
  await page.getByLabel("Metric", { exact: true }).fill("$42,700");
  await page.getByLabel("Description", { exact: true }).fill('A "clear" view <today>.');
  const article = preview.getByRole("article");
  check("SignalCard: heading, metric and description controls", await article.getByRole("heading", { name: 'Monthly "signal" & growth', exact: true }).count() === 1 && (await article.textContent()).includes("$42,700") && (await article.textContent()).includes('A "clear" view <today>.'));
  await page.getByLabel("Status", { exact: true }).selectOption("warning");
  check("SignalCard: status includes readable label", await article.getByText("Needs attention", { exact: true }).count() === 1);
  await page.getByLabel("Status", { exact: true }).selectOption("neutral");
  check("SignalCard: neutral status", await article.getByText("Steady", { exact: true }).count() === 1);
  await page.getByLabel("Status", { exact: true }).selectOption("none");
  check("SignalCard: status is optional", await article.locator("[data-status]").count() === 0);
  await page.getByRole("checkbox", { name: "Show actions", exact: true }).uncheck();
  check("SignalCard: actions are optional", await article.getByRole("button").count() === 0);
  await page.getByRole("checkbox", { name: "Show actions", exact: true }).check();
  await article.getByRole("button", { name: "View report" }).focus();
  check("SignalCard: action has visible keyboard focus", await article.getByRole("button").evaluate((el) => parseFloat(getComputedStyle(el).outlineWidth) >= 2));
  await page.keyboard.press("Enter");
  check("SignalCard: keyboard action works", await page.getByRole("status").filter({ hasText: "Report opened." }).count() === 1);
  await page.getByLabel("Status", { exact: true }).selectOption("positive");
  await capture("signal-card");

  await choose("RevealHeading");
  await page.getByLabel("Text", { exact: true }).fill('Good "ideas" take shape.');
  await page.getByLabel("Heading level", { exact: true }).selectOption("h3");
  await page.getByRole("slider", { name: "Duration", exact: true }).focus();
  await page.keyboard.press("End");
  await page.getByRole("slider", { name: "Delay", exact: true }).focus();
  await page.keyboard.press("End");
  check("RevealHeading: semantic level and accessible name", await preview.getByRole("heading", { name: 'Good "ideas" take shape.', level: 3, exact: true }).count() === 1);
  const words = preview.locator('[aria-hidden="true"] > span');
  const motion = await words.first().evaluate((el) => ({ duration: getComputedStyle(el).animationDuration, delay: getComputedStyle(el).animationDelay }));
  check("RevealHeading: duration and delay controls", motion.duration === "1.2s" && motion.delay === "1.5s");
  await page.emulateMedia({ reducedMotion: "reduce" });
  check("RevealHeading: reduced motion shows every word immediately", await words.evaluateAll((elements) => elements.every((el) => { const css = getComputedStyle(el); return css.animationName === "none" && css.opacity === "1" && css.transform === "none"; })));
  await preview.getByRole("button", { name: "Replay animation", exact: true }).click();
  check("RevealHeading: replay works with reduced motion", await words.first().evaluate((el) => getComputedStyle(el).opacity === "1"));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await capture("reveal-heading");
  const ids = await page.locator("[id]").evaluateAll((elements) => elements.map((el) => el.id));
  check("Accessibility: unique label and panel IDs", new Set(ids).size === ids.length);

  await page.getByRole("button", { name: "Open your workspace", exact: true }).click();
  check("Composed showcase: primary action", await page.getByRole("status").filter({ hasText: "Workspace opened." }).count() === 1);
  await page.getByRole("button", { name: "View activity", exact: true }).click();
  check("Composed showcase: card action", await page.getByRole("status").filter({ hasText: "Activity opened." }).count() === 1);
  await page.getByRole("button", { name: "Copy install command", exact: true }).click();
  check("Install command: uses current origin and selected item", await clipboard() === "npx shadcn@3.0.0 add http://127.0.0.1:3100/r/reveal-heading.json");
  const response = await page.request.get("http://127.0.0.1:3100/r/registry.json");
  check("Registry: HTTP 200 and 3 items", response.ok() && (await response.json()).items.length === 3);
  await page.getByRole("button", { name: "Reset component props", exact: true }).click();
  await choose("CommandButton");
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    check(`Responsive: no horizontal overflow at ${width}px`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "/home/swirky/DevHub/experiments/ui-forge/evidence/screenshots/desktop-1440x900.png" });
  await page.screenshot({ path: "/home/swirky/DevHub/experiments/ui-forge/evidence/screenshots/desktop-full.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "/home/swirky/DevHub/experiments/ui-forge/evidence/screenshots/mobile-390x844.png" });
  await page.screenshot({ path: "/home/swirky/DevHub/experiments/ui-forge/evidence/screenshots/mobile-full.png", fullPage: true });
  check("Runtime: no uncaught browser errors (Playwright + CDP)", runtimeErrors.length === 0);
  check("Network: no failed requests (CDP)", failedRequests.length === 0);
  const browser = (await cdp.send("Browser.getVersion")).product;
  await cdp.detach();
  return { checks, failures, copied, browser, runtimeErrors, failedRequests };
}
