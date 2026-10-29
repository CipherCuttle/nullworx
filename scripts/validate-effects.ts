import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { effects, getEffectStatusCounts, getLabEffects, getReleasedEffects } from "../lib/effects";
import {
  SOURCE_TREE_HASH_METHOD,
  computeEffectSourceTreeSha256,
} from "../lib/effects/integrity";

const ROOT = process.cwd();
const errors: string[] = [];

function sha256(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const ids = new Set<string>();
  const slugs = new Set<string>();

  for (const effect of effects) {
    if (ids.has(effect.id)) errors.push(`Duplicate effect id: ${effect.id}`);
    if (slugs.has(effect.slug)) errors.push(`Duplicate effect slug: ${effect.slug}`);
    ids.add(effect.id);
    slugs.add(effect.slug);

    for (const file of effect.sourceFiles) {
      const absolute = path.resolve(ROOT, file.path);
      if (!absolute.startsWith(`${ROOT}${path.sep}`)) {
        errors.push(`${effect.slug}: source path escapes the repository: ${file.path}`);
        continue;
      }
      if (!(await exists(absolute))) {
        errors.push(`${effect.slug}: missing source file ${file.path}`);
        continue;
      }
      const actual = sha256(await readFile(absolute));
      if (actual !== file.sha256) {
        errors.push(`${effect.slug}: hash mismatch for ${file.path}: expected ${file.sha256}, got ${actual}`);
      }
    }

    for (const relative of [effect.sourceComponent, effect.previewComponent]) {
      const absolute = path.resolve(ROOT, relative);
      if (!absolute.startsWith(`${ROOT}${path.sep}`) || !(await exists(absolute))) {
        errors.push(`${effect.slug}: declared component is missing or outside the repository: ${relative}`);
      }
    }

    if (!effect.sourceFiles.some((file) => file.path === effect.sourceComponent)) {
      errors.push(`${effect.slug}: sourceComponent must be listed in sourceFiles.`);
    }

    if (effect.sourceTreeHashMethod !== SOURCE_TREE_HASH_METHOD) {
      errors.push(`${effect.slug}: sourceTreeHashMethod does not match the validator's documented algorithm.`);
    } else {
      try {
        const actualTreeHash = await computeEffectSourceTreeSha256(ROOT, effect);
        if (actualTreeHash !== effect.sourceTreeSha256) {
          errors.push(
            `${effect.slug}: source tree hash mismatch: expected ${effect.sourceTreeSha256}, got ${actualTreeHash}`,
          );
        }
      } catch (error) {
        errors.push(
          `${effect.slug}: could not recompute the source tree hash: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const archiveRelative = effect.installation.archivePath.replace(/^\/+/, "");
    const archive = path.resolve(ROOT, "public", archiveRelative);
    if (!archive.startsWith(path.join(ROOT, "public") + path.sep)) {
      errors.push(`${effect.slug}: archive path escapes public/: ${effect.installation.archivePath}`);
    } else if (!(await exists(archive))) {
      errors.push(`${effect.slug}: missing download archive ${effect.installation.archivePath}`);
    } else {
      const actual = sha256(await readFile(archive));
      if (effect.installation.archiveSha256 && effect.installation.archiveSha256 !== actual) {
        errors.push(`${effect.slug}: archive hash mismatch: expected ${effect.installation.archiveSha256}, got ${actual}`);
      }
    }

    if (effect.publication.releasedAt && effect.publication.updatedAt < effect.publication.releasedAt) {
      errors.push(`${effect.slug}: updatedAt precedes releasedAt`);
    }

    for (const related of effect.relatedSlugs) {
      if (!slugs.has(related) && !effects.some((item) => item.slug === related)) {
        errors.push(`${effect.slug}: unknown related slug ${related}`);
      }
    }

    if (effect.status === "RELEASED") {
      if (!effect.releaseApproval) errors.push(`${effect.slug}: RELEASED without release approval`);
      if (!effect.publication.releasedAt) errors.push(`${effect.slug}: RELEASED without release date`);
    }
  }

  const counts = getEffectStatusCounts();
  console.log("Nullworx effect manifest validation");
  console.log(`schema: ${effects[0]?.schemaVersion ?? "none"}`);
  console.log(`effects: ${effects.length}`);
  console.log(JSON.stringify(counts));
  console.log(`publicly released: ${getReleasedEffects().map((effect) => effect.slug).join(", ") || "(none)"}`);
  console.log(`lab previews: ${getLabEffects().map((effect) => effect.slug).join(", ") || "(none)"}`);

  if (errors.length) {
    console.error("\nFAILED");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log("\nPASS: schema, source hashes, archive presence, uniqueness and release gate.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
