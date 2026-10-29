import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { effects } from "@/lib/effects";

const effect = effects[0]!;
const archivePath = path.resolve(process.cwd(), `public${effect.installation.archivePath}`);

function sha256(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

describe("review archive integrity", () => {
  it("matches the declared archive digest and contains only the reviewed files", async () => {
    const archive = await readFile(archivePath);
    expect(sha256(archive)).toBe(effect.installation.archiveSha256);

    const entries = unzipSync(new Uint8Array(archive));
    const names = Object.keys(entries).sort();
    expect(names).toEqual(
      [
        ...effect.sourceFiles.map((file) => file.path),
        "LICENSE",
        "README.md",
        "SOURCE-MANIFEST.json",
      ].sort(),
    );
    expect(names.some((name) => /(?:^|\/)(?:node_modules|\.next|\.env|test-results)(?:\/|$)/.test(name))).toBe(false);

    for (const file of effect.sourceFiles) {
      const bundled = entries[file.path];
      expect(bundled, file.path).toBeTruthy();
      expect(sha256(bundled!), file.path).toBe(file.sha256);
    }
  });

  it("ships a source manifest that agrees with the public effect manifest", async () => {
    const archive = await readFile(archivePath);
    const entries = unzipSync(new Uint8Array(archive));
    const embedded = JSON.parse(strFromU8(entries["SOURCE-MANIFEST.json"]!)) as {
      effectId: string;
      schemaVersion: string;
      status: string;
      sourceComponent: string;
      previewComponent: string;
      sourceTreeSha256: string;
      sourceTreeHashMethod: string;
      upstreamHead: string;
      files: Record<string, string>;
    };

    expect(embedded).toMatchObject({
      effectId: effect.id,
      schemaVersion: effect.schemaVersion,
      status: effect.status,
      sourceComponent: effect.sourceComponent,
      previewComponent: effect.previewComponent,
      sourceTreeSha256: effect.sourceTreeSha256,
      sourceTreeHashMethod: effect.sourceTreeHashMethod,
      upstreamHead: effect.provenance.upstreamHead,
    });
    for (const file of effect.sourceFiles) {
      expect(embedded.files[file.path], file.path).toBe(file.sha256);
    }
    expect(embedded.files).not.toHaveProperty("SOURCE-MANIFEST.json");
  });
});
