// Playwright callback for the clean consumer printed by smoke-consumer.mjs, running on port 3101.
export default async function verifyConsumer(page) {
  const checks = [];
  const failures = [];
  const runtimeErrors = [];
  const failedRequests = [];
  const check = (name, condition) => condition ? checks.push(name) : failures.push(name);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Runtime.enable");
  await cdp.send("Network.enable");
  cdp.on("Runtime.exceptionThrown", (event) => runtimeErrors.push(event.exceptionDetails.text));
  cdp.on("Network.loadingFailed", (event) => failedRequests.push(event.errorText));
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const prefix of ["", "copied-"]) {
    const label = prefix ? "manual clipboard source" : "shadcn-installed source";
    let response = await page.goto(`http://127.0.0.1:3101/${prefix}command-button`);
    check(`${label}: CommandButton route is HTTP 200`, response.ok());
    const button = page.getByRole("button", { name: 'Build "calm" & ship <ideas>', exact: true });
    check(`${label}: literal quotes, ampersands and angle brackets render`, await button.count() === 1);
    check(`${label}: CommandButton CSS loads without gallery`, await button.evaluate((el) => getComputedStyle(el).borderRadius === "8px" && getComputedStyle(el).fontFamily.includes("Arial")));
    await button.focus();
    check(`${label}: CommandButton focus is visible`, await button.evaluate((el) => getComputedStyle(el).outlineStyle === "solid" && getComputedStyle(el).outlineWidth === "3px"));
    await button.press(prefix ? "Space" : "Enter");
    check(`${label}: CommandButton keyboard activation`, await page.getByRole("status").textContent() === "Command received.");
    await button.hover();
    await page.waitForFunction(() => getComputedStyle(document.querySelector("button")).transform !== "none");
    check(`${label}: CommandButton hover response`, await button.evaluate((el) => getComputedStyle(el).transform !== "none"));
    await page.emulateMedia({ reducedMotion: "reduce" });
    check(`${label}: CommandButton reduced-motion hover`, await button.evaluate((el) => getComputedStyle(el).transform === "none" && getComputedStyle(el).transitionDuration === "0s"));
    await page.emulateMedia({ reducedMotion: "no-preference" });

    response = await page.goto(`http://127.0.0.1:3101/${prefix}signal-card`);
    check(`${label}: SignalCard route is HTTP 200`, response.ok());
    const article = page.getByRole("article", { name: 'Monthly "signal" & growth', exact: true });
    check(`${label}: SignalCard heading and metric are independent`, await article.getByRole("heading", { name: 'Monthly "signal" & growth', level: 3, exact: true }).count() === 1 && (await article.textContent()).includes("$42,700"));
    check(`${label}: SignalCard CSS loads without gallery`, await article.evaluate((el) => getComputedStyle(el).borderRadius === "14px" && getComputedStyle(el).backgroundColor === "rgb(255, 254, 250)"));
    check(`${label}: SignalCard has a readable status`, await article.getByText("On track", { exact: true }).count() === 1);
    const action = article.getByRole("button", { name: /^View report/ });
    await action.focus();
    check(`${label}: card action retains native focus indication`, await action.evaluate((el) => getComputedStyle(el).outlineStyle !== "none"));
    await action.press("Enter");
    check(`${label}: SignalCard keyboard action`, await page.getByRole("status").textContent() === "Report opened.");
    await article.hover();
    await page.waitForFunction(() => getComputedStyle(document.querySelector("article")).transform !== "none");
    check(`${label}: SignalCard hover response`, await article.evaluate((el) => getComputedStyle(el).transform !== "none"));
    await page.emulateMedia({ reducedMotion: "reduce" });
    check(`${label}: SignalCard reduced-motion hover`, await article.evaluate((el) => getComputedStyle(el).transform === "none" && getComputedStyle(el).transitionDuration === "0s"));
    await page.emulateMedia({ reducedMotion: "no-preference" });

    response = await page.goto(`http://127.0.0.1:3101/${prefix}reveal-heading`);
    check(`${label}: RevealHeading route is HTTP 200`, response.ok());
    const heading = page.getByRole("heading", { name: 'Good "ideas" take shape.', level: 3, exact: true });
    check(`${label}: RevealHeading has one accessible heading`, await heading.count() === 1);
    const words = heading.locator('[aria-hidden="true"] > span');
    check(`${label}: RevealHeading timing survives installation`, await words.first().evaluate((el) => getComputedStyle(el).animationDuration === "1.2s" && getComputedStyle(el).animationDelay === "1.5s"));
    check(`${label}: RevealHeading normal motion is active`, await words.first().evaluate((el) => el.getAnimations().some((animation) => animation.playState === "running")));
    await page.emulateMedia({ reducedMotion: "reduce" });
    check(`${label}: RevealHeading reduced motion is immediate`, await words.evaluateAll((elements) => elements.every((el) => { const css = getComputedStyle(el); return css.animationName === "none" && css.opacity === "1" && css.transform === "none" && css.filter === "none"; })));
    await page.getByRole("button", { name: "Replay animation", exact: true }).focus();
    await page.keyboard.press("Enter");
    check(`${label}: RevealHeading replay uses native keyboard activation`, await words.first().evaluate((el) => getComputedStyle(el).opacity === "1"));
    await page.emulateMedia({ reducedMotion: "no-preference" });
  }

  const response = await page.goto("http://127.0.0.1:3101/composed");
  check("Composition: HTTP 200 without gallery imports", response.ok());
  await page.getByRole("button", { name: "Verify composition", exact: true }).click();
  check("Composition: all three work together", await page.getByRole("status").textContent() === "All three work together.");
  const loading = page.getByRole("button", { name: "Working…", exact: true });
  const disabled = page.getByRole("button", { name: "Disabled test", exact: true });
  check("Isolation: loading and disabled states are native", await loading.isDisabled() && await disabled.isDisabled() && await loading.getAttribute("aria-busy") === "true");
  await page.locator("#native").focus();
  await page.keyboard.press("Tab");
  check("Isolation: keyboard skips loading and disabled buttons", await page.evaluate(() => ![...document.querySelectorAll("button:disabled")].includes(document.activeElement)));
  await page.emulateMedia({ reducedMotion: "reduce" });
  check("Isolation: loading spinner respects reduced motion", await loading.locator('[aria-hidden="true"]').evaluate((el) => getComputedStyle(el).animationName === "none"));
  check("CSS isolation: unrelated consumer text unchanged", await page.locator("#sentinel").evaluate((el) => getComputedStyle(el).color === "rgb(18, 52, 86)"));
  check("CSS isolation: unrelated native button unchanged", await page.locator("#native").evaluate((el) => getComputedStyle(el).borderRadius === "0px" && getComputedStyle(el).boxShadow === "none" && getComputedStyle(el).transform === "none"));
  check("CSS isolation: no gallery or Tailwind stylesheet", !(await page.content()).includes("forge-gallery") && await page.locator('[class*="forge-gallery"]').count() === 0);
  await page.screenshot({ path: "/home/swirky/DevHub/experiments/ui-forge/evidence/screenshots/consumer-composed.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  check("Isolation: composed consumer fits mobile", await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check("Consumer runtime: no uncaught errors (CDP)", runtimeErrors.length === 0);
  check("Consumer network: no failed requests (CDP)", failedRequests.length === 0);
  await cdp.detach();
  return { checks, failures, runtimeErrors, failedRequests };
}
