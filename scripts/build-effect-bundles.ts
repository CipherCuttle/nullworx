import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { zipSync, type Zippable } from "fflate";
import { effects } from "../lib/effects";

const ROOT = process.cwd();
const FIXED_MTIME = new Date("2026-10-28T00:00:00.000Z");

function sha256(data: Uint8Array | string): string {
  return createHash("sha256").update(data).digest("hex");
}

async function buildBundles() {
  for (const effect of effects) {
    const entries = new Map<string, Uint8Array>();
    const hashes: Record<string, string> = {};

    for (const file of effect.sourceFiles) {
      if (file.role === "media" && effect.status !== "RELEASED") {
        // Review bundle still needs the media to run the component. Kept only
        // because the Flower clip is CC0 and has cleared provenance.
      }
      const absolute = path.resolve(ROOT, file.path);
      if (!absolute.startsWith(`${ROOT}${path.sep}`)) {
        throw new Error(`Refusing to bundle path outside the repository: ${file.path}`);
      }
      const data = await readFile(absolute);
      const actual = sha256(data);
      if (actual !== file.sha256) {
        throw new Error(`Refusing to bundle ${file.path}: expected ${file.sha256}, got ${actual}`);
      }
      entries.set(file.path, data);
      hashes[file.path] = actual;
    }

    const readme = `# Nullworx — ${effect.name} / ${effect.subtitle}

Version: ${effect.version}
Effect ID: ${effect.id}
Status: ${effect.status}
Generated: 2026-10-28

${effect.summary}

## Review status

${effect.status === "RELEASED" ? "This effect is released under the terms below." : "This is an owner-review artifact, not a released Nullworx effect. Do not present it as a Nullworx release until an explicit release approval is recorded."}

## Install

\`\`\`sh
${effect.installation.command}
\`\`\`

The files are:
${effect.sourceFiles.map((file) => `- ${file.path} (sha256 ${file.sha256})`).join("\n")}

## Usage

\`\`\`tsx
${effect.installation.usage}
\`\`\`

## Licensing

Code: ${effect.license.code}. ${effect.license.notes}
Media: ${effect.license.media}. Source and credit details are in public/media/credits/flower.md.

## Notes

${effect.installation.notes.map((note) => `- ${note}`).join("\n")}

No email, analytics or account data is included in this archive.
`;

    const sourceManifest = {
      effectId: effect.id,
      version: effect.version,
      status: effect.status,
      schemaVersion: effect.schemaVersion,
      generatedAt: FIXED_MTIME.toISOString(),
      sourceComponent: effect.sourceComponent,
      previewComponent: effect.previewComponent,
      sourceTreeSha256: effect.sourceTreeSha256,
      sourceTreeHashMethod: effect.sourceTreeHashMethod,
      upstreamHead: effect.provenance.upstreamHead,
      files: hashes,
      archivePolicy: "Deterministic ZIP with a fixed entry timestamp.",
    };

    entries.set("README.md", new TextEncoder().encode(readme));
    entries.set("SOURCE-MANIFEST.json", new TextEncoder().encode(`${JSON.stringify(sourceManifest, null, 2)}\n`));
    entries.set("LICENSE", await readFile(path.join(ROOT, "LICENSE")));

    const zippable: Zippable = {};
    for (const [name, data] of entries) {
      zippable[name] = [data, { mtime: FIXED_MTIME, level: 9 }];
    }

    const archive = zipSync(zippable, { level: 9, mtime: FIXED_MTIME });
    const archivePath = path.join(ROOT, "public", effect.installation.archivePath);
    await mkdir(path.dirname(archivePath), { recursive: true });
    await writeFile(archivePath, archive);
    const digest = sha256(archive);
    const checksumPath = `${archivePath}.sha256`;
    await writeFile(checksumPath, `${digest}  ${path.basename(archivePath)}\n`);

    console.log(`${effect.slug}: ${path.relative(ROOT, archivePath)}`);
    console.log(`  bytes: ${archive.byteLength}`);
    console.log(`  sha256: ${digest}`);
  }
}

buildBundles().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
