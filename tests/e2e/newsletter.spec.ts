import { expect, test, type APIRequestContext } from "@playwright/test";

const uniqueEmail = (label: string) => `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;

function apiPayload(email: string, overrides: Record<string, unknown> = {}) {
  return {
    email,
    dropsConsent: true,
    premiumMarketing: false,
    company: "",
    ...overrides,
  };
}

async function postNewsletter(request: APIRequestContext, body: unknown, key = crypto.randomUUID()) {
  return request.post("/api/newsletter", {
    data: body,
    headers: {
      "content-type": "application/json",
      "idempotency-key": key,
    },
  });
}

test.describe("Nullworx Drops mock flow", () => {
  test("form ships with two unchecked, separate consent choices", async ({ page }) => {
    await page.goto("/drops");
    await expect(page.getByLabel(/Send me Nullworx Drops/i)).not.toBeChecked();
    await expect(page.getByLabel(/Also send future premium pack announcements/i)).not.toBeChecked();
  });

  test("effect detail page carries the same independent Drops signup", async ({ page }) => {
    await page.goto("/lab/ascii-waves");
    const signup = page.locator('section[aria-labelledby="effect-drops-title"]');
    await signup.scrollIntoViewIfNeeded();
    await expect(signup.getByLabel(/Send me Nullworx Drops/i)).not.toBeChecked();
    await expect(signup.getByLabel(/Also send future premium pack announcements/i)).not.toBeChecked();

    await signup.getByLabel("Email address").fill(uniqueEmail("effect-form"));
    await signup.locator("label").filter({ hasText: "Send me Nullworx Drops" }).click();
    await expect(signup.getByLabel(/Send me Nullworx Drops/i)).toBeChecked();
    await expect(signup.getByLabel(/Also send future premium pack announcements/i)).not.toBeChecked();
    await signup.getByRole("button", { name: "Subscribe to Drops" }).click();
    await expect(signup.getByText("Check your inbox.")).toBeVisible();
    await expect(signup.getByText("LOCAL MOCK / NO EMAIL SENT")).toBeVisible();
  });

  test("form submits free consent only, shows the local mock confirmation, and confirms", async ({ page }) => {
    await page.goto("/drops");
    const email = uniqueEmail("form-free");
    await page.getByLabel("Email address").fill(email);
    await page.locator("label").filter({ hasText: "Send me Nullworx Drops" }).click();
    await expect(page.getByLabel(/Send me Nullworx Drops/i)).toBeChecked();
    await expect(page.getByLabel(/Also send future premium pack announcements/i)).not.toBeChecked();

    const requestPromise = page.waitForRequest("**/api/newsletter");
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/newsletter") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Subscribe to Drops" }).click();
    const [apiRequest, apiResponse] = await Promise.all([requestPromise, responsePromise]);
    const body = apiRequest.postDataJSON() as Record<string, unknown>;
    expect(body).toMatchObject({ email, dropsConsent: true, premiumMarketing: false, company: "" });
    expect(apiResponse.status()).toBe(202);

    await expect(page.getByText("Check your inbox.")).toBeVisible();
    await expect(page.getByText("LOCAL MOCK / NO EMAIL SENT")).toBeVisible();
    const confirmLink = page.getByRole("link", { name: /Exercise the confirmation flow/i });
    const href = await confirmLink.getAttribute("href");
    expect(href).toContain("/api/newsletter/confirm?token=");
    await confirmLink.click();
    await page.waitForURL("**/drops/confirmed?preview=1");
    await expect(page.getByText("MOCK / CONFIRMED")).toBeVisible();
    await expect(page.getByText("You are in the loop.")).toBeVisible();
  });

  test("premium marketing is a separate opt-in and does not get implied by Drops", async ({ request }) => {
    const email = uniqueEmail("premium");
    const response = await postNewsletter(request, apiPayload(email, { premiumMarketing: true }));
    expect(response.status()).toBe(202);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.message).not.toContain(email);
    expect(body.preview.confirmationUrl).toContain("/api/newsletter/confirm");
    expect(JSON.stringify(body)).not.toContain("premiumMarketing\":true");

    // The premium opt-in is accepted only because it was explicitly supplied.
    const noPremium = await postNewsletter(request, apiPayload(uniqueEmail("no-premium")));
    expect(noPremium.status()).toBe(202);
  });

  test("server rejects missing free consent, malformed email, unknown fields and cross-origin requests", async ({ request }) => {
    const missingConsent = await postNewsletter(
      request,
      apiPayload(uniqueEmail("no-consent"), { dropsConsent: false, premiumMarketing: true }),
    );
    expect(missingConsent.status()).toBe(400);
    expect(await missingConsent.json()).toMatchObject({ ok: false, code: "invalid_input" });

    const malformed = await postNewsletter(request, apiPayload("not-an-email"));
    expect(malformed.status()).toBe(400);

    const unknown = await postNewsletter(request, {
      ...apiPayload(uniqueEmail("unknown")),
      analyticsEmail: "leak@example.com",
    });
    expect(unknown.status()).toBe(400);

    const crossOrigin = await request.post("/api/newsletter", {
      data: apiPayload(uniqueEmail("cross-origin")),
      headers: {
        "content-type": "application/json",
        origin: "https://evil.example",
        "idempotency-key": crypto.randomUUID(),
      },
    });
    expect(crossOrigin.status()).toBe(403);
  });

  test("duplicate signup and idempotency stay generic and do not expose subscriber state", async ({ request }) => {
    const email = uniqueEmail("duplicate");
    const key = crypto.randomUUID();
    const first = await postNewsletter(request, apiPayload(email), key);
    const second = await postNewsletter(request, apiPayload(email), key);
    expect(first.status()).toBe(202);
    expect(second.status()).toBe(202);
    const firstBody = await first.json();
    const secondBody = await second.json();
    expect(firstBody.requestId).toBe(secondBody.requestId);
    expect(JSON.stringify(secondBody)).not.toContain(email);
    expect(secondBody.message).toMatch(/If this address can be subscribed/);

    const newKey = await postNewsletter(request, apiPayload(email), crypto.randomUUID());
    expect(newKey.status()).toBe(202);
    expect((await newKey.json()).message).toBe(secondBody.message);
  });

  test("honeypot submissions receive a generic acceptance and never a confirmation link", async ({ request }) => {
    const response = await postNewsletter(
      request,
      apiPayload(uniqueEmail("bot"), { company: "https://spam.example" }),
    );
    expect(response.status()).toBe(202);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.preview).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("bot");
  });

  test("analytics endpoint only accepts allowlisted, identity-free events", async ({ request }) => {
    const accepted = await request.post("/api/events", {
      data: { event: "code_copied", effectSlug: "ascii-waves", location: "effect-preview" },
      headers: { "content-type": "application/json" },
    });
    expect(accepted.status()).toBe(204);

    const rejected = await request.post("/api/events", {
      data: { event: "newsletter_signup_started", location: "drops", email: "person@example.com" },
      headers: { "content-type": "application/json" },
    });
    expect(rejected.status()).toBe(400);

    const wrongType = await request.post("/api/events", {
      data: { event: "code_copied" },
      headers: { "content-type": "text/plain" },
    });
    expect(wrongType.status()).toBe(415);
  });
});
