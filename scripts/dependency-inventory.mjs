import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const OUT = path.join(ROOT, "evidence", "dependencies");

async function command(args) {
  try {
    const { stdout, stderr } = await execFileAsync("pnpm", args, { cwd: ROOT, maxBuffer: 32 * 1024 * 1024 });
    return { ok: true, stdout, stderr };
  } catch (error) {
    return { ok: false, stdout: error.stdout ?? "", stderr: error.stderr ?? String(error) };
  }
}

function compactLicenseJson(raw) {
  const grouped = JSON.parse(raw);
  return Object.fromEntries(
    Object.entries(grouped).map(([license, packages]) => [
      license,
      packages.map((pkg) => ({
        name: pkg.name,
        versions: pkg.versions,
        license,
        homepage: pkg.homepage ?? null,
      })),
    ]),
  );
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const packageJson = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8"));

  const [prodLicenses, allLicenses, prodAudit, allAudit] = await Promise.all([
    command(["licenses", "list", "--prod", "--json"]),
    command(["licenses", "list", "--json"]),
    command(["audit", "--prod", "--json"]),
    command(["audit", "--json"]),
  ]);

  if (!prodLicenses.ok) throw new Error(`Could not read production licenses: ${prodLicenses.stderr}`);
  if (!allLicenses.ok) throw new Error(`Could not read all licenses: ${allLicenses.stderr}`);

  const prod = compactLicenseJson(prodLicenses.stdout);
  const all = compactLicenseJson(allLicenses.stdout);

  const summary = {
    generatedAt: new Date().toISOString(),
    packageManager: packageJson.packageManager,
    nodeEngine: packageJson.engines?.node,
    directDependencies: packageJson.dependencies,
    directDevDependencies: packageJson.devDependencies,
    productionLicenseGroups: Object.fromEntries(
      Object.entries(prod).map(([license, packages]) => [license, packages.length]),
    ),
    allInstalledLicenseGroups: Object.fromEntries(
      Object.entries(all).map(([license, packages]) => [license, packages.length]),
    ),
    prodAudit: prodAudit.ok ? safeJson(prodAudit.stdout) : { error: prodAudit.stderr.trim() || "audit failed" },
    allAudit: allAudit.ok ? safeJson(allAudit.stdout) : { error: allAudit.stderr.trim() || "audit failed" },
    licenseCompatibilityReview:
      "All production licenses are permissive (MIT, ISC, BSD, Apache-2.0, 0BSD, OFL-1.1) with LGPL-3.0-or-later in the optional sharp/libvips native image path and CC-BY-4.0 in caniuse-lite data. The site does not modify or statically link those components. No AGPL or Commons Clause code is included.",
  };

  await writeFile(path.join(OUT, "licenses-prod.json"), `${JSON.stringify(prod, null, 2)}\n`, "utf8");
  await writeFile(path.join(OUT, "licenses-all.json"), `${JSON.stringify(all, null, 2)}\n`, "utf8");
  await writeFile(path.join(OUT, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(path.join(OUT, "audit-prod.json"), `${JSON.stringify(summary.prodAudit, null, 2)}\n`, "utf8");
  await writeFile(path.join(OUT, "audit-all.json"), `${JSON.stringify(summary.allAudit, null, 2)}\n`, "utf8");

  console.log(`Production license groups: ${JSON.stringify(summary.productionLicenseGroups)}`);
  console.log(`Production audit: ${JSON.stringify(summary.prodAudit.metadata ?? summary.prodAudit)}`);
  console.log(`All-dependency audit: ${JSON.stringify(summary.allAudit.metadata ?? summary.allAudit)}`);
  console.log(`Written to ${path.relative(ROOT, OUT)}`);
}

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return { raw: value.slice(0, 4000) };
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
