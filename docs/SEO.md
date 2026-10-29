# SEO, AI discoverability and launch runbook

Canonical origin supplied for V0.1: **`https://nulllworx.site`** (three `l`s). This was
given by the owner; domain ownership and DNS control have not been verified. Do not
deploy or submit anything until the owner confirms both.

No page is claimed to be indexed. Index status can only be observed in Search Console,
Bing Webmaster Tools or a live search result after deployment.

## What the application emits

### Indexable pages

| Path | Canonical | Title theme |
| --- | --- | --- |
| `/` | `https://nulllworx.site` | Nullworx — procedural visual effects |
| `/effects` | `https://nulllworx.site/effects` | The release-gated catalogue |
| `/drops` | `https://nulllworx.site/drops` | Nullworx Drops |
| `/about` | `https://nulllworx.site/about` | The lab and its principles |
| `/privacy` | `https://nulllworx.site/privacy` | Data and consent |
| `/licenses` | `https://nulllworx.site/licenses` | Code, media and dependency terms |

Every one has a unique title and description, `rel=canonical`, Open Graph (type
`website`, URL, title, description, site name), X `summary_large_image`, and a
server-rendered `<h1>`. There are no client-only indexable routes. `/effects/[slug]` is
generated only for `RELEASED` effects and uses `type: article` plus article dates.

### Noindex

- `/lab/[slug]` — owner-review preview, `noindex, nofollow, nocache` and
  `X-Robots-Tag`; not in the sitemap.
- `/drops/confirmed`, `/drops/unsubscribed` — status pages, noindex and no-store.
- API endpoints — never indexable.
- The 404 page — designed copy, real 404 status, noindex metadata.

### Sitemap

`/sitemap.xml` is generated from `app/sitemap.ts`:

- six fixed public routes above;
- only `getReleasedEffects()` for `/effects/[slug]`;
- no `/lab/*`, status pages, APIs or unreleased effect slugs.

Currently it contains **six URLs and zero effect entries**. That is expected while the
catalogue is prelaunch.

### robots.txt

`/robots.txt` is generated from `app/robots.ts`:

- wildcard crawlers: allow `/`, disallow `/api/`, `/downloads/`,
  `/drops/confirmed`, `/drops/unsubscribed`;
- `OAI-SearchBot` and `ChatGPT-User`: allow `/`, disallow `/api/` and `/downloads/`
  (retrieval is intentional for public pages, not archive binaries);
- `GPTBot`, `Google-Extended`, `Applebot-Extended`, `CCBot`, `ClaudeBot`, `Bytespider`:
  disallow `/` by default (model-training policy);
- sitemap declared at `/sitemap.xml`;
- host declared.

The lab preview is allowed to be crawled but is noindexed. This makes the page reachable
for a human reviewer without admitting it to a search index. If the owner wants the lab
hidden from crawlers entirely, add `/lab/` to the wildcard disallow and adjust the tests;
that is a policy change, not a bug fix.

### llms.txt

`/llms.txt` is a plain text navigation aid. It lists only the public pages and the current
generated release count. It does not include `/lab/ascii-waves`. It explicitly says it is
not a request to cite, rank or quote the site. It has no instructions to models.

### Structured data

- Home: `Organization` + `WebSite` graph with sameAs links, no ratings/offers.
- `/effects`, `/about`, `/privacy`, `/licenses`: `BreadcrumbList`.
- Released effect page: `SoftwareSourceCode` (repository, language, dates, license,
  keywords) and `BreadcrumbList`. It is only emitted for `RELEASED`.

### Internal links and 404s

All internal links across public pages and the lab page resolve with status < 400 in the
Playwright suite. `/effects/ascii-waves` returns 404 while the effect is in review.
`trailingSlash: false` and Next's default handling keep one canonical shape. Any
apex/`www` or HTTP→HTTPS redirects must be configured at the host; none are faked in app
code.

### Social preview images

`/opengraph-image` and `/twitter-image` render 1200×630 PNGs with self-hosted fonts.
They are generic Nullworx cards, not fabricated effect screenshots. A released effect
can add a page-specific image later; that is deliberately out of scope for V0.1.

## Verification commands and expected result

```sh
pnpm build
pnpm test:e2e
# with a production server running on 127.0.0.1:3300:
pnpm verify:seo
```

The automated checks assert:

- `/`, `/effects`, `/drops`, `/about`, `/privacy`, `/licenses` return 200, have unique
  titles/descriptions/canonicals and server-rendered copy;
- no `localhost`/`127.0.0.1` leaks into canonical/OG/HTML for those pages;
- noindex on lab and status pages, and their absence from the sitemap;
- `robots.txt` retrieval/training separation and sitemap line;
- `llms.txt` content-type and absence of the lab route;
- real PNG dimensions for social cards;
- JSON-LD parses and contains no invented ratings, reviews or offers;
- real 404 status and the designed 404 page;
- every internal link resolves;
- download/media files have real bytes.

The generated report is written to `evidence/seo/`. The last local run passed **99/99**
checks. The Playwright results are in `evidence/tests/playwright-results.json`.

## Search Console runbook (owner, after deployment only)

1. Confirm control of `nulllworx.site` and the exact `www`/apex redirect policy. Do not
   proceed if the three-`l` domain is not owned or does not resolve as intended.
2. Add a **Domain property** in Google Search Console and verify by DNS TXT record. A URL
   prefix property is an acceptable fallback if DNS access is limited.
3. After the first production deploy, submit
   `https://nulllworx.site/sitemap.xml`.
4. Use URL Inspection on `/`, `/effects`, `/drops`, `/about`, `/privacy`, `/licenses`.
   Confirm the selected canonical matches the generated HTML and that the page can be
   rendered.
5. Inspect `/lab/ascii-waves` and confirm `No: 'noindex' detected`; do not request
   indexing for it.
6. Check Page indexing after several days. Record only what Search Console reports; never
   claim “indexed” before observation.
7. Under Settings → Crawl stats, watch 404s. An unreleased `/effects/*` 404 is expected.

## Bing Webmaster Tools

1. Add `https://nulllworx.site` and verify by DNS or import from Search Console.
2. Submit `/sitemap.xml` (Bing supports sitemap index and standard sitemaps).
3. Check the `robots.txt` and noindex states in URL Inspection.
4. Monitor the Site Scan for blocked resources. Fonts and media are self-hosted; the app
   does not need a third-party crawl allowance.

## IndexNow (prepared, not executed)

Do not automate submission in V0.1. When the owner decides to use it:

1. Generate a key (for example `openssl rand -hex 16`) and host it at
   `https://nulllworx.site/<key>.txt` containing the key, or include
   `key=<key>&keyLocation=https://.../<key>.txt` in submissions.
2. Submit only URLs that changed and are public, 200, indexable, and canonical. At
   present no effect URL qualifies.
3. Use the IndexNow endpoint (`https://api.indexnow.org/indexnow`) after the site is
   deployed. Keep the key and payload in an owner-run process, not in the public bundle.
4. Record submissions and responses. IndexNow acceptance is not proof of indexing.

No IndexNow key exists in this repository. No submission has been made.

## AI retrieval and training policy

The current owner policy is:

- allow legitimate search/retrieval crawlers, explicitly including `OAI-SearchBot` and
  `ChatGPT-User`;
- block model-training crawlers including `GPTBot`, `Google-Extended`,
  `Applebot-Extended`, `CCBot`, `ClaudeBot` and `Bytespider` by default;
- keep `llms.txt` as a navigation aid, not a ranking or citation instruction;
- do not add hidden prompts, fabricated citations, keyword stuffing or model-specific
  content masquerading as copy.

If policy changes, update `app/robots.ts` and the unit/e2e assertions together. Search
indexing and model-training access are separate decisions and must remain separately
test-covered.

## Post-launch SEO checks

- `curl -I https://nulllworx.site/` → 200 and correct HTTPS/HSTS at the host.
- `curl https://nulllworx.site/robots.txt` → matches the generated policy.
- `curl https://nulllworx.site/sitemap.xml` → six URLs, no lab/status routes.
- Request `/effects/ascii-waves` while unreleased → designed 404.
- Inspect source HTML for one `<h1>` and readable product copy.
- Check share cards with each platform's debugger after deployment.
- Confirm `www` and HTTP redirect to the chosen canonical origin exactly once.

## Known limits

- Generic OG image for all routes.
- No search-console API integration or automated indexing.
- Domain ownership not verified.
- Host-level redirects, HSTS and CDN caching are not implemented in this repository.
- Google/Bing results, Core Web Vitals and traffic are unknown and not fabricated.
