import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const consumer = await mkdtemp(path.join(os.tmpdir(), "ui-forge-consumer-"));
const origin = process.env.FORGE_ORIGIN || "http://localhost:3000";
const write = async (name, content) => {
  await mkdir(path.dirname(path.join(consumer, name)), { recursive: true });
  await writeFile(path.join(consumer, name), content);
};
const json = (value) => JSON.stringify(value, null, 2) + "\n";
const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: consumer, stdio: "inherit", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } });
  assert.equal(result.status, 0, `${command} ${args.join(" ")} failed`);
};

await write("package.json", json({
  name: "ui-forge-clean-consumer", private: true, version: "0.0.0",
  scripts: { build: "next build", start: "next start --hostname 127.0.0.1 -p 3101", typecheck: "tsc --noEmit" },
  dependencies: { next: "15.5.9", react: "19.1.0", "react-dom": "19.1.0" },
  devDependencies: { typescript: "5.9.2", "@types/react": "19.1.2", "@types/react-dom": "19.1.2", "@types/node": "20.19.9" },
}));
await write("tsconfig.json", json({ compilerOptions: {
  target: "ES2017", lib: ["dom", "dom.iterable", "esnext"], strict: true, noEmit: true,
  skipLibCheck: true, esModuleInterop: true, module: "esnext", moduleResolution: "bundler",
  resolveJsonModule: true, isolatedModules: true, jsx: "preserve", incremental: true,
  plugins: [{ name: "next" }], paths: { "@/*": ["./*"] },
}, include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"], exclude: ["node_modules"] }));
await write("components.json", json({
  $schema: "https://ui.shadcn.com/schema.json", style: "new-york", rsc: true, tsx: true,
  tailwind: { config: "", css: "app/globals.css", baseColor: "neutral", cssVariables: false },
  aliases: { components: "@/components", ui: "@/components/ui", utils: "@/lib/utils", lib: "@/lib", hooks: "@/hooks" },
}));
// Deliberately no Tailwind, gallery tokens, fonts, utility helper, or component library.
const sentinel = "html { color: rgb(18, 52, 86); background: white; }\nbody { margin: 24px; font-family: Arial, sans-serif; }\n";
await write("app/globals.css", sentinel);
await write("app/layout.tsx", 'import "./globals.css";\nexport default function Layout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }\n');
await write("app/page.tsx", 'export default function Home() { return <main><h1>Clean consumer</h1><a href="/command-button">CommandButton</a><br /><a href="/signal-card">SignalCard</a><br /><a href="/reveal-heading">RevealHeading</a></main>; }\n');
console.log(`CONSUMER_PATH=${consumer}`);
await mkdir("/tmp/ui-forge-session", { recursive: true });
await writeFile("/tmp/ui-forge-session/consumer-path.txt", consumer);
run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"]);
const slugs = ["command-button", "signal-card", "reveal-heading"];
run(path.join(root, "node_modules/.bin/shadcn"), ["add", ...slugs.map((slug) => `${origin}/r/${slug}.json`), "--yes", "--cwd", consumer]);
assert.equal(await readFile(path.join(consumer, "app/globals.css"), "utf8"), sentinel, "Consumer global CSS was changed");
for (const slug of slugs) {
  const item = await (await fetch(`${origin}/r/${slug}.json`)).json();
  for (const file of item.files) {
    const installed = await readFile(path.join(consumer, "components/ui", path.basename(file.path)), "utf8");
    assert.equal(installed.trim(), file.content.trim(), "Installed source differs from registry");
  }
  const copiedDir = path.join(root, "evidence/copied", slug);
  for (const ext of ["tsx", "module.css"]) {
    const copied = await readFile(path.join(copiedDir, `${slug}.${ext}`), "utf8");
    const payload = item.files.find((file) => file.path.endsWith(`${slug}.${ext}`));
    assert.equal(copied, payload.content, "Actual clipboard source differs from registry");
    await write(`components/copied/${slug}.${ext}`, copied);
  }
  const usage = await readFile(path.join(copiedDir, "demo.tsx"), "utf8");
  await write(`app/${slug}/page.tsx`, usage);
  await write(`app/copied-${slug}/page.tsx`, usage.replace("@/components/ui/", "@/components/copied/"));
  console.log(`PASS ${slug}: installed TSX + CSS Module, clipboard source parity, copied usage route`);
}
await write("app/composed/page.tsx", `"use client";
import { useState } from "react";
import { CommandButton } from "@/components/ui/command-button";
import { SignalCard } from "@/components/ui/signal-card";
import { RevealHeading } from "@/components/ui/reveal-heading";
export default function Page() {
  const [message, setMessage] = useState("");
  return <main><RevealHeading text="All three. Outside the gallery." /><SignalCard heading="Portable components" metric="3" status="positive" actions={<CommandButton onClick={() => setMessage("All three work together.")}>Verify composition</CommandButton>} /><p role="status">{message}</p><p id="sentinel">Unstyled consumer text</p><button id="native" type="button">Native consumer button</button><CommandButton loading>Loading test</CommandButton><CommandButton disabled>Disabled test</CommandButton></main>;
}\n`);
run("npm", ["run", "build"]);
// Next's first build generates its ambient CSS Module declarations in next-env.d.ts.
run("npm", ["run", "typecheck"]);
assert.equal(await readFile(path.join(consumer, "app/globals.css"), "utf8"), sentinel);
const dependencies = JSON.parse(await readFile(path.join(consumer, "package.json"), "utf8")).dependencies;
assert.deepEqual(Object.keys(dependencies).sort(), ["next", "react", "react-dom"]);
console.log("PASS clean consumer: 3 CLI installs, 6 usage routes, composed route, TypeScript, production build, unchanged global CSS, no added runtime dependencies");
console.log(`Start for browser tests: npm --prefix ${consumer} run start`);
