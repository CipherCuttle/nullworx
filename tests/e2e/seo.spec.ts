import { expect, test, type APIRequestContext } from "@playwright/test";
const SITE = "https://nulllworx.site";
const publicRoutes = ["/", "/effects", "/drops", "/about", "/privacy", "/licenses"] as const;
const noIndexRoutes = [
  "/lab/ascii-waves",
  "/drops/confirmed?preview=1",
  "/drops/unsubscribed?preview=1",
] as const;

function metaContent(html: string, selector: string): string | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tag = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]*>`, "i"))?.[0];
  if (!tag) return null;
  return tag.match(/content=["']([^"']*)["']/i)?.[1] ?? null;
}

function linkHref(html: string, rel: string): string | null {
  const escaped = rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tags = html.match(new RegExp(`<link[^>]+rel=["']${escaped}["'][^>]*>`, "gi")) ?? [];
  for (const tag of tags) {
    const href = tag.match(/href=["']([^"']*)["']/i)?.[1];
    if (href) return href;
  }
  return null;
}

function titleOf(html: string): string {
  return html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "";
}

function descriptionOf(html: string): string {
  return metaContent(html, "description") ?? "";
}

async function fetchText(request: APIRequestContext, path: string) {
  const response = await request.get(path);
  return { response, html: await response.text() };
}

test.describe("technical SEO and crawlability", () => {
  test("indexable routes have unique titles, descriptions, canonicals, social cards and server-rendered content", async ({ request }) => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    const canonicals = new Set<string>();

    for (const path of publicRoutes) {
      const { response, html } = await fetchText(request, path);
      expect(response.status(), path).toBe(200);
      const title = titleOf(html);
      const description = descriptionOf(html);
      const canonical = linkHref(html, "canonical");
      expect(title.length, `${path} title`).toBeGreaterThan(10);
      expect(description.length, `${path} description`).toBeGreaterThan(40);
      expect(canonical).toBe(path === "/" ? SITE : `${SITE}${path}`);
      expect(metaContent(html, "og:title")).toBeTruthy();
      expect(metaContent(html, "og:description")).toBeTruthy();
      expect(metaContent(html, "og:image")).toBe("https://nulllworx.site/opengraph-image");
      expect(metaContent(html, "og:image:width")).toBe("1200");
      expect(metaContent(html, "og:image:height")).toBe("630");
      expect(metaContent(html, "og:url")).toBe(canonical);
      expect(metaContent(html, "og:type")).toBe("website");
      expect(metaContent(html, "twitter:card")).toBe("summary_large_image");
      expect(metaContent(html, "twitter:title")).toBeTruthy();
      expect(metaContent(html, "twitter:image")).toBe("https://nulllworx.site/twitter-image");
      expect(html).not.toContain("http://localhost");
      expect(html).not.toContain("http://127.0.0.1");

      expect(html, `${path} server-rendered h1`).toMatch(/<h1[^>]*>/i);
      expect(html, `${path} server-rendered copy`).not.toMatch(/<body[^>]*>\s*<div[^>]*id="__next"[^>]*><\/div>/i);
      expect(html.match(/<h1\b/gi)?.length, `${path} h1 count`).toBe(1);

      titles.add(title);
      descriptions.add(description);
      canonicals.add(canonical!);
    }

    expect(titles.size).toBe(publicRoutes.length);
    expect(descriptions.size).toBe(publicRoutes.length);
    expect(canonicals.size).toBe(publicRoutes.length);
  });

  test("unreleased review and status pages are noindex and excluded from the sitemap", async ({ request }) => {
    for (const path of noIndexRoutes) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      expect(response.headers()["x-robots-tag"], path).toContain("noindex");
      const html = await response.text();
      expect(metaContent(html, "robots"), path).toContain("noindex");
    }

    const sitemapResponse = await request.get("/sitemap.xml");
    expect(sitemapResponse.status()).toBe(200);
    const sitemap = await sitemapResponse.text();
    expect(sitemap).toContain(`<loc>${SITE}</loc>`);
    expect(sitemap).toContain(`<loc>${SITE}/effects</loc>`);
    expect(sitemap).not.toContain("/lab/");
    expect(sitemap).not.toContain("/effects/ascii-waves");
    expect(sitemap).not.toContain("/drops/confirmed");
    expect(sitemap).not.toContain("/drops/unsubscribed");

    const unreleased = await request.get("/effects/ascii-waves");
    expect(unreleased.status()).toBe(404);
  });

  test("robots policy separates retrieval from training and points to the sitemap", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("Sitemap: https://nulllworx.site/sitemap.xml");
    expect(body).toMatch(/User-Agent: OAI-SearchBot[\s\S]*?Allow: \//);
    expect(body).toMatch(/User-Agent: GPTBot[\s\S]*?Disallow: \//);
    expect(body).toMatch(/User-Agent: Google-Extended[\s\S]*?Disallow: \//);
    expect(body).not.toContain("Disallow: /lab");
  });

  test("llms.txt is a plain navigation aid and does not expose the review preview", async ({ request }) => {
    const response = await request.get("/llms.txt");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/plain");
    const body = await response.text();
    expect(body).toContain("# Nullworx");
    expect(body).toContain("Released: 0");
    expect(body).not.toContain("/lab/ascii-waves");
    expect(body.toLowerCase()).not.toContain("ignore previous");
  });

  test("social card is a real 1200x630 PNG", async ({ request }) => {
    const response = await request.get("/opengraph-image");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
    const buffer = await response.body();
    expect(buffer.subarray(1, 4).toString()).toBe("PNG");
    expect(buffer.readUInt32BE(16)).toBe(1200);
    expect(buffer.readUInt32BE(20)).toBe(630);

    const twitter = await request.get("/twitter-image");
    expect(twitter.status()).toBe(200);
    expect((await twitter.body()).length).toBeGreaterThan(10_000);
  });

  test("structured data parses and contains no invented ratings or offers", async ({ request }) => {
    for (const path of ["/", "/effects", "/about", "/privacy", "/licenses"]) {
      const { html } = await fetchText(request, path);
      const blocks = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
      for (const block of blocks) {
        const parsed = JSON.parse(block[1] ?? "");
        const serialised = JSON.stringify(parsed);
        expect(serialised).not.toContain("aggregateRating");
        expect(serialised).not.toContain("reviewCount");
        expect(serialised).not.toContain("offers");
        expect(serialised).toContain("https://nulllworx.site");
      }
    }
  });

  test("404 renders the designed page with a 404 status", async ({ request }) => {
    const response = await request.get("/this-route-does-not-exist");
    expect(response.status()).toBe(404);
    const html = await response.text();
    expect(html).toContain("This page was never");
    expect(metaContent(html, "robots")).toContain("noindex");
  });

  test("all internal links on public pages resolve", async ({ request }) => {
    const seen = new Set<string>();
    for (const path of ["/", ...publicRoutes, "/lab/ascii-waves"]) {
      const { response, html } = await fetchText(request, path);
      expect(response.status(), path).toBe(200);
      const hrefs = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)].map((match) => match[1]!);
      for (const href of hrefs) {
        if (!href.startsWith("/") || href.startsWith("//") || href.startsWith("/api/")) continue;
        if (href.startsWith("#")) continue;
        if (seen.has(href)) continue;
        seen.add(href);
        const target = await request.get(href);
        expect(target.status(), `${path} -> ${href}`).toBeLessThan(400);
      }
    }
    expect(seen.size).toBeGreaterThanOrEqual(8);
  });

  test("download and media assets are served with real bytes", async ({ request }) => {
    for (const path of ["/downloads/ascii-waves-0.1.0.zip", "/media/flower.mp4", "/media/motifs/flower-poster.jpg"]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      expect((await response.body()).length, path).toBeGreaterThan(1000);
    }

    const download = await request.get("/downloads/ascii-waves-0.1.0.zip");
    expect(download.headers()["x-robots-tag"]).toContain("noindex");
  });
});
