import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const CLIENT_ASSETS = path.join(ROOT, ".next", "static");
const EXCLUDED_DIRS = new Set(["node_modules", ".git", ".next", "coverage", "test-results", "playwright-report", "evidence"]);
const EXCLUDED_FILES = new Set(["pnpm-lock.yaml"]);
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".md", ".txt", ".css", ".html", ".yaml", ".yml", ".example"]);
const MAX_BYTES = 4 * 1024 * 1024;

const patterns: Array<{ name: string; regex: RegExp }> = [
  { name: "Brevo API key", regex: /xkeysib-[a-z0-9]{16,}/i },
  { name: "Brevo API key assignment", regex: /BREVO_API_KEY\s*=\s*[^\s#"']{10,}/ },
  { name: "Mock secret assignment", regex: /NEWSLETTER_MOCK_SECRET\s*=\s*(?!replace-|$)[^\s#"']{16,}/ },
  { name: "Stripe live secret", regex: /sk_live_[A-Za-z0-9]{16,}/ },
  { name: "GitHub token", regex: /gh[pousr]_[A-Za-z0-9]{30,}/ },
  { name: "OpenAI-style key", regex: /sk-[A-Za-z0-9]{32,}/ },
  { name: "Private key", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "Generic secret assignment", regex: /(?:SECRET|API_KEY|ACCESS_TOKEN|PASSWORD)\s*=\s*["'][A-Za-z0-9_./+=-]{24,}["']/ },
];

interface Finding {
  file: string;
  line: number;
  pattern: string;
  excerpt: string;
}

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      yield* walk(path.join(dir, entry.name));
    } else if (entry.isFile()) {
      if (EXCLUDED_FILES.has(entry.name)) continue;
      yield path.join(dir, entry.name);
    }
  }
}

function isTextCandidate(file: string): boolean {
  const basename = path.basename(file);
  if (basename === ".env.example" || basename === ".env") return true;
  if (basename.startsWith(".env")) return true;
  return TEXT_EXTENSIONS.has(path.extname(file)) || EXCLUDED_FILES.has(basename);
}

async function main() {
  const findings: Finding[] = [];
  const secretValues = [process.env.BREVO_API_KEY, process.env.NEWSLETTER_MOCK_SECRET].filter(
    (value): value is string => Boolean(value && value.length > 15),
  );
  let clientAssetsScanned = false;

  const roots = [ROOT];
  if (await access(CLIENT_ASSETS).then(() => true).catch(() => false)) {
    roots.push(CLIENT_ASSETS);
    clientAssetsScanned = true;
  }

  for (const root of roots) {
    for await (const file of walk(root)) {
      if (!isTextCandidate(file)) continue;
      const stats = await readFile(file).catch(() => null);
      if (!stats || stats.byteLength > MAX_BYTES) continue;
      const text = stats.toString("utf8");
      const lines = text.split(/\r?\n/);

      for (const [index, line] of lines.entries()) {
        for (const pattern of patterns) {
          if (pattern.regex.test(line)) {
            findings.push({
              file: path.relative(ROOT, file),
              line: index + 1,
              pattern: pattern.name,
              excerpt: line.replace(/[A-Za-z0-9_-]{16,}/g, "[redacted]").slice(0, 180),
            });
          }
        }
        for (const secret of secretValues) {
          if (line.includes(secret)) {
            findings.push({
              file: path.relative(ROOT, file),
              line: index + 1,
              pattern: "Registered runtime secret value in client asset",
              excerpt: "[redacted]",
            });
          }
        }
      }
    }
  }

  console.log(
    `Scanned ${ROOT}${clientAssetsScanned ? " and built .next/static client assets" : " (no built client assets present)"} for credential patterns.`,
  );
  if (findings.length) {
    console.error(`FAIL: ${findings.length} potential secret(s) found.`);
    for (const finding of findings) {
      console.error(`- ${finding.file}:${finding.line} [${finding.pattern}] ${finding.excerpt}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("PASS: no credential patterns found in source or built client assets.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
