import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { effects, getEffectBySlug, getReleasedEffects } from "../lib/effects";
import { buildReleaseDrafts } from "../lib/publishing/drafts";
import { siteOrigin } from "../lib/site";

interface Args {
  slug?: string;
  review: boolean;
  date: string;
}

function parseArgs(argv: string[]): Args {
  const dateArg = argv.find((arg) => arg.startsWith("--date="))?.split("=")[1];
  const slug = argv.find((arg) => arg.startsWith("--slug="))?.split("=")[1];
  const date = dateArg ?? new Date().toISOString().slice(0, 10);
  const review = argv.includes("--review");
  return { slug, review, date };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const candidates = args.slug
    ? [getEffectBySlug(args.slug)].filter((effect) => Boolean(effect))
    : args.review
      ? effects
      : getReleasedEffects();

  if (candidates.length === 0) {
    console.error("No eligible effects. Public drafts require RELEASED status; pass --review --slug=<slug> for an internal draft.");
    process.exitCode = 2;
    return;
  }

  for (const effect of candidates) {
    if (!effect) continue;
    const drafts = buildReleaseDrafts(effect, {
      siteUrl: siteOrigin,
      date: args.date,
      allowUnreleased: args.review,
    });
    const safeSlug = `${effect.slug}${args.review ? "-review" : ""}`;
    const outDir = path.join(process.cwd(), "drafts", args.date, safeSlug);
    await mkdir(outDir, { recursive: true });
    const files: Array<[string, string]> = [
      ["github-release.md", drafts.releaseNotes],
      ["newsletter.md", drafts.newsletter],
      ["social.md", drafts.social],
      ["page-metadata.md", drafts.pageMetadata],
      ["sitemap-entry.txt", drafts.sitemapEntry],
      ["checklist.md", drafts.checklist],
      ["draft.json", `${JSON.stringify(drafts.manifest, null, 2)}\n`],
    ];
    for (const [filename, content] of files) {
      await writeFile(path.join(outDir, filename), content, "utf8");
    }
    console.log(`Draft written: ${path.relative(process.cwd(), outDir)}`);
    console.log(`  mode: ${args.review ? "internal review" : "release"}`);
    console.log("  external actions: none");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
