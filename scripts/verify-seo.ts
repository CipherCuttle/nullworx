import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getEffectStatusCounts, getReleasedEffects } from "../lib/effects";
import { siteOrigin } from "../lib/site";

interface Check {
  name: string;
  pass: boolean;
  detail?: string;
}

const baseUrlArg = process.argv.find((arg) => arg.startsWith("--base-url="))?.split("=")[1];
const baseUrl = (baseUrlArg ?? process.env.VERIFY_BASE_URL ?? "http://127.0.0.1:3300").replace(/\/$/, "");
const publicRoutes = ["/", "/effects", "/drops", "/about", "/privacy", "/licenses"] as const;
const noIndexRoutes = ["/lab/ascii-waves", "/drops/confirmed?preview=1", "/drops/unsubscribed?preview=1"] as const;
const checks: Check[] = [];

function add(name: string, pass: boolean, detail?: string) {
  checks.push({ name, pass, detail });
}

function meta(html: string, key: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const attr = tag.match(/(?:name|property)=["']([^"']+)["']/i)?.[1];
    if (attr !== key) continue;
    return tag.match(/content=["']([^"']*)["']/i)?.[1] ?? null;
  }
  return null;
}

function link(html: string, rel: string): string | null {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    if (!new RegExp(`rel=["'][^"']*${rel}[^"']*["']`, "i").test(tag)) continue;
    return tag.match(/href=["']([^"']*)["']/i)?.[1] ?? null;
  }
  return null;
}

function title(html: string): string {
  return html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
}

function h1s(html: string): string[] {
  return [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((match) =>
    match[1]!.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  );
}

function text(html: string): string {
  return html.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

async function fetchPage(route: string) {
  const response = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
  const html = await response.text();
  return { response, html };
}

async function main() {
  const titles = new Map<string, string>();
  const descriptions = new Map<string, string>();
  const canonicals = new Map<string, string>();

  for (const route of publicRoutes) {
    const { response, html } = await fetchPage(route);
    const expectedCanonical = route === "/" ? siteOrigin : `${siteOrigin}${route}`;
    const pageTitle = title(html);
    const pageDescription = meta(html, "description") ?? "";
    const canonical = link(html, "canonical");
    const headings = h1s(html);
    const plainText = text(html);

    add(`${route} 200`, response.status === 200, String(response.status));
    add(`${route} unique title`, pageTitle.length > 10 && !titles.has(pageTitle), pageTitle);
    add(`${route} unique description`, pageDescription.length > 40 && !descriptions.has(pageDescription), pageDescription.slice(0, 80));
    add(`${route} canonical`, canonical === expectedCanonical, canonical ?? "missing");
    add(`${route} one h1`, headings.length === 1, headings.join(" | "));
    add(`${route} server copy`, plainText.includes("Nullworx"), "body copy present");
    add(`${route} no local origin`, !html.includes("http://127.0.0.1") && !html.includes("http://localhost"), "production canonical");
    add(`${route} social title`, Boolean(meta(html, "og:title") && meta(html, "twitter:title")), "");
    add(`${route} social image`, Boolean(meta(html, "og:image") && meta(html, "twitter:image")), "");
    add(`${route} social URL`, meta(html, "og:url") === expectedCanonical, meta(html, "og:url") ?? "missing");
    add(`${route} twitter card`, meta(html, "twitter:card") === "summary_large_image", meta(html, "twitter:card") ?? "missing");

    const jsonLd = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    for (const [index, block] of jsonLd.entries()) {
      try {
        JSON.parse(block[1] ?? "");
        add(`${route} JSON-LD ${index + 1} parses`, true, "");
      } catch (error) {
        add(`${route} JSON-LD ${index + 1} parses`, false, error instanceof Error ? error.message : "invalid");
      }
    }

    if (!titles.has(pageTitle)) titles.set(pageTitle, route);
    if (!descriptions.has(pageDescription)) descriptions.set(pageDescription, route);
    if (canonical) canonicals.set(canonical, route);
  }

  add("titles are unique", titles.size === publicRoutes.length, `${titles.size}/${publicRoutes.length}`);
  add("descriptions are unique", descriptions.size === publicRoutes.length, `${descriptions.size}/${publicRoutes.length}`);
  add("canonicals are unique", canonicals.size === publicRoutes.length, `${canonicals.size}/${publicRoutes.length}`);

  for (const route of noIndexRoutes) {
    const { response, html } = await fetchPage(route);
    const header = response.headers.get("x-robots-tag") ?? "";
    add(`${route} noindex header`, response.status === 200 && header.includes("noindex"), `${response.status} ${header}`);
    add(`${route} noindex meta`, (meta(html, "robots") ?? "").includes("noindex"), meta(html, "robots") ?? "missing");
  }

  const unreleased = await fetch(`${baseUrl}/effects/ascii-waves`, { redirect: "manual" });
  add("unreleased effect has no public page", unreleased.status === 404, String(unreleased.status));

  const sitemapResponse = await fetch(`${baseUrl}/sitemap.xml`);
  const sitemap = await sitemapResponse.text();
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]!);
  const expected = [siteOrigin, ...publicRoutes.slice(1).map((route) => `${siteOrigin}${route}`), ...getReleasedEffects().map((effect) => `${siteOrigin}/effects/${effect.slug}`)];
  add("sitemap 200", sitemapResponse.status === 200, String(sitemapResponse.status));
  add("sitemap matches indexable routes", locations.length === expected.length && expected.every((url) => locations.includes(url)), `${locations.length} URLs`);
  add("sitemap excludes lab", !sitemap.includes("/lab/"), "no lab route");
  add("sitemap excludes unreleased effect pages", !sitemap.includes("/effects/ascii-waves"), "release gate holds");

  const robotsResponse = await fetch(`${baseUrl}/robots.txt`);
  const robots = await robotsResponse.text();
  add("robots.txt 200", robotsResponse.status === 200, String(robotsResponse.status));
  add("robots sitemap", robots.includes(`Sitemap: ${siteOrigin}/sitemap.xml`), "");
  add("OAI-SearchBot allowed", /User-Agent: OAI-SearchBot[\s\S]*?Allow: \//.test(robots), "");
  add("GPTBot training blocked", /User-Agent: GPTBot[\s\S]*?Disallow: \//.test(robots), "");
  add("lab not blocked from noindex discovery", !robots.includes("Disallow: /lab"), "");
  add("archive binaries disallowed", robots.includes("Disallow: /downloads/"), "");

  const downloadResponse = await fetch(`${baseUrl}/downloads/ascii-waves-0.1.0.zip`);
  add(
    "download archive noindex",
    downloadResponse.ok && (downloadResponse.headers.get("x-robots-tag") ?? "").includes("noindex"),
    downloadResponse.headers.get("x-robots-tag") ?? "missing",
  );

  const llmsResponse = await fetch(`${baseUrl}/llms.txt`);
  const llms = await llmsResponse.text();
  const counts = getEffectStatusCounts();
  add("llms.txt 200", llmsResponse.status === 200, String(llmsResponse.status));
  add("llms.txt plain text", (llmsResponse.headers.get("content-type") ?? "").includes("text/plain"), "");
  add("llms.txt hides lab preview", !llms.includes("/lab/ascii-waves"), "");
  add("llms.txt states release count", llms.includes(`Released: ${counts.released}`), `Released: ${counts.released}`);

  const notFound = await fetch(`${baseUrl}/definitely-not-a-nullworx-route`);
  add("unknown route is 404", notFound.status === 404, String(notFound.status));

  const ogResponse = await fetch(`${baseUrl}/opengraph-image`);
  const og = Buffer.from(await ogResponse.arrayBuffer());
  add("OG image 200 PNG", ogResponse.status === 200 && og.subarray(1, 4).toString() === "PNG", "");
  add("OG image 1200 x 630", og.length > 24 && og.readUInt32BE(16) === 1200 && og.readUInt32BE(20) === 630, `${og.length} bytes`);

  const failed = checks.filter((check) => !check.pass);
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    canonicalOrigin: siteOrigin,
    deployed: false,
    indexed: false,
    note: "Local production-equivalent verification. No search engine indexing was observed or claimed.",
    totalChecks: checks.length,
    passedChecks: checks.length - failed.length,
    failedChecks: failed.length,
    checks,
  };

  const outDir = path.join(process.cwd(), "evidence", "seo");
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");

  for (const check of checks) {
    console.log(`${check.pass ? "PASS" : "FAIL"}  ${check.name}${check.detail ? `  [${check.detail}]` : ""}`);
  }
  console.log(`\n${report.passedChecks}/${report.totalChecks} SEO checks passed. Report: evidence/seo/report.json`);

  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
