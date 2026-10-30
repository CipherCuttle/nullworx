import { describe, expect, it } from "vitest";
import { analyticsPayloadSchema } from "@/lib/analytics/events";
import { buildSiteJsonLd } from "@/components/seo/json-ld";

describe("analytics privacy contract", () => {
  it("accepts only allowlisted event names", () => {
    expect(analyticsPayloadSchema.safeParse({ event: "code_copied", effectSlug: "ascii-waves" }).success).toBe(true);
    expect(analyticsPayloadSchema.safeParse({ event: "purchase", effectSlug: "ascii-waves" }).success).toBe(false);
  });

  it("rejects email and other unapproved payload fields", () => {
    const withEmail = analyticsPayloadSchema.safeParse({
      event: "newsletter_signup_started",
      location: "drops",
      email: "person@example.com",
    });
    expect(withEmail.success).toBe(false);
    const withRawIp = analyticsPayloadSchema.safeParse({ event: "preview_interacted", ip: "203.0.113.10" });
    expect(withRawIp.success).toBe(false);
  });

  it("does not include fabricated reviews or user counts in site structured data", () => {
    const serialised = JSON.stringify(buildSiteJsonLd());
    expect(serialised).not.toMatch(/aggregateRating|ratingValue|reviewCount|userCount/);
  });
});
