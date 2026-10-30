import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { GET as llmsTxt } from "@/app/llms.txt/route";
import { buildSiteJsonLd, buildBreadcrumbJsonLd } from "@/components/seo/json-ld";
import { createPageMetadata } from "@/lib/seo";
import { DEFAULT_SITE_ORIGIN, isBuyMeACoffeeUrl, siteOrigin } from "@/lib/site";

describe("SEO contract", () => {
  it("uses the supplied canonical origin, including the three l's", () => {
    expect(siteOrigin).toBe(DEFAULT_SITE_ORIGIN);
    expect(siteOrigin).toBe("https://nulllworx.site");
  });

  it("emits absolute canonical, Open Graph and Twitter fields", () => {
    const metadata = createPageMetadata({
      title: "Effects",
      description: "A catalogue behind a release gate.",
      path: "/effects",
    });
    expect(metadata.alternates?.canonical).toBe("https://nulllworx.site/effects");
    expect(metadata.openGraph?.url).toBe("https://nulllworx.site/effects");
    expect(metadata.openGraph?.title).toBe("Effects — Nullworx");
    expect(JSON.stringify(metadata.openGraph?.images)).toContain("https://nulllworx.site/opengraph-image");
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image", title: "Effects — Nullworx" });
    expect(JSON.stringify(metadata.twitter?.images)).toContain("https://nulllworx.site/twitter-image");
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
  });

  it("marks review pages noindex and nofollow", () => {
    const metadata = createPageMetadata({
      title: "ASCII Waves review",
      description: "Unreleased lab preview.",
      path: "/lab/ascii-waves",
      noIndex: true,
    });
    expect(metadata.robots).toMatchObject({ index: false, follow: false, nocache: true });
  });

  it("keeps unreleased and lab routes out of the sitemap", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain("https://nulllworx.site");
    expect(urls).toContain("https://nulllworx.site/effects");
    expect(urls.some((url) => url.includes("/lab/"))).toBe(false);
    expect(urls.some((url) => url.includes("/effects/ascii-waves"))).toBe(false);
    expect(urls.every((url) => url.startsWith("https://nulllworx.site"))).toBe(true);
  });

  it("allows retrieval crawlers, rejects training crawlers by default and points to the sitemap", () => {
    const output = robots();
    expect(output.sitemap).toBe("https://nulllworx.site/sitemap.xml");
    const rules = Array.isArray(output.rules) ? output.rules : [output.rules];
    const searchBot = rules.find((rule) => JSON.stringify(rule.userAgent).includes("OAI-SearchBot"));
    const trainingBots = rules.find((rule) => JSON.stringify(rule.userAgent).includes("GPTBot"));
    expect(searchBot).toBeTruthy();
    expect(searchBot?.disallow).toEqual(["/api/", "/downloads/"]);
    expect(JSON.stringify(searchBot?.disallow)).not.toContain("/lab");
    expect(trainingBots?.disallow).toBe("/");
  });

  it("serves llms.txt as a navigation aid, not a prompt or ranking claim", async () => {
    const response = llmsTxt();
    const body = await response.text();
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(body).toContain("# Nullworx");
    expect(body).toContain("https://nulllworx.site/effects");
    expect(body).not.toContain("/lab/ascii-waves");
    expect(body).toContain("Released: 0");
    expect(body.toLowerCase()).not.toContain("ignore previous instructions");
  });

  it("publishes no fabricated reviews, ratings or counts in the base structured data", () => {
    const json = JSON.stringify(buildSiteJsonLd());
    expect(json).not.toContain("aggregateRating");
    expect(json).not.toContain("reviewCount");
    expect(json).not.toContain("offers");
  });

  it("only accepts a real Buy Me a Coffee creator URL when configured", () => {
    expect(isBuyMeACoffeeUrl(undefined)).toBe(false);
    expect(isBuyMeACoffeeUrl("")).toBe(false);
    expect(isBuyMeACoffeeUrl("https://example.com/support")).toBe(false);
    expect(isBuyMeACoffeeUrl("http://buymeacoffee.com/creator")).toBe(false);
    expect(isBuyMeACoffeeUrl("https://buymeacoffee.com/")).toBe(false);
    expect(isBuyMeACoffeeUrl("https://buymeacoffee.com/ciphercuttle")).toBe(true);
    expect(isBuyMeACoffeeUrl("https://www.buymeacoffee.com/ciphercuttle")).toBe(true);
  });

  it("builds absolute breadcrumbs", () => {
    const data = buildBreadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Effects", path: "/effects" },
    ]);
    expect(data.itemListElement[0]?.item).toBe("https://nulllworx.site/");
    expect(data.itemListElement[1]?.item).toBe("https://nulllworx.site/effects");
  });
});
