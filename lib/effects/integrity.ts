import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { EffectManifest } from "./schema";

/**
 * The source-tree digest covers only the copied, non-media effect files. It is
 * anchored to the directory containing `sourceComponent`, so it remains
 * reproducible when the same reviewed files are installed under a different
 * repository path.
 */
export const SOURCE_TREE_HASH_METHOD =
  "sha256(join(sorted(relativePath + NUL + byteSize + NUL + fileSha256 + LF))), non-media source files relative to sourceComponent's directory";

export async function computeEffectSourceTreeSha256(
  root: string,
  effect: Pick<EffectManifest, "slug" | "sourceComponent" | "sourceFiles">,
): Promise<string> {
  const base = path.dirname(effect.sourceComponent);
  const entries: string[] = [];

  for (const file of effect.sourceFiles) {
    if (file.role === "media") continue;
    const relative = path.relative(base, file.path);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(`${effect.slug}: source file ${file.path} is outside ${base}.`);
    }
    const absolute = path.resolve(root, file.path);
    const info = await stat(absolute);
    const digest = createHash("sha256").update(await readFile(absolute)).digest("hex");
    entries.push(`${relative.split(path.sep).join("/")}\0${info.size}\0${digest}\n`);
  }

  entries.sort();
  return createHash("sha256").update(entries.join("")).digest("hex");
}
