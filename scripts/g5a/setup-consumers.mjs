#!/usr/bin/env node
/**
 * Create the two independent G5-A consumers outside the Nullworx tree and
 * install living-type-01 through the actual shadcn CLI.
 *
 *   node scripts/g5a/setup-consumers.mjs
 *
 * The consumer roots default to the sibling workspace g5a-consumers/.
 */
import { execFileSync } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const REGISTRY = process.env.G5A_REGISTRY ?? "http://127.0.0.1:3102";
const BASE = process.env.G5A_CONSUMERS ?? path.resolve(ROOT, "../g5a-consumers");

const ITEM_URL = `${REGISTRY}/r/living-type-01.json`;

const json = (value) => JSON.stringify(value, null, 2) + "\n";
const write = async (root, name, content) => {
  const file = path.join(root, name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, "utf8");
};
const run = (command, args, cwd, logName) => {
  console.log(`$ (${path.basename(cwd)}) ${command} ${args.join(" ")}`);
  const output = execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", CI: "1" },
  });
  if (logName) {
    const logPath = path.join(ROOT, "evidence/g5a/logs", logName);
    execFileSync("sh", ["-c", `mkdir -p ${JSON.stringify(path.dirname(logPath))} && cat > ${JSON.stringify(logPath)}`], {
      input: output,
      encoding: "utf8",
    });
  }
  return output;
};

await rm(BASE, { recursive: true, force: true });
await mkdir(BASE, { recursive: true });

/* ------------------------------- Next.js ------------------------------- */
const NEXT = path.join(BASE, "next");
await mkdir(path.join(NEXT, "app"), { recursive: true });
await write(NEXT, "package.json", json({
  name: "g5a-next-consumer",
  version: "0.0.0",
  private: true,
  scripts: {
    build: "next build",
    start: "next start --hostname 127.0.0.1 -p 3201",
    typecheck: "tsc --noEmit",
  },
  dependencies: { next: "15.5.28", react: "19.1.10", "react-dom": "19.1.10" },
  devDependencies: {
    "@types/node": "20.19.9",
    "@types/react": "19.1.2",
    "@types/react-dom": "19.1.2",
    typescript: "5.9.2",
  },
}));
await write(NEXT, "tsconfig.json", json({
  compilerOptions: {
    target: "ES2017",
    lib: ["dom", "dom.iterable", "esnext"],
    allowJs: false,
    skipLibCheck: true,
    strict: true,
    noEmit: true,
    esModuleInterop: true,
    module: "esnext",
    moduleResolution: "bundler",
    resolveJsonModule: true,
    isolatedModules: true,
    jsx: "preserve",
    incremental: true,
    plugins: [{ name: "next" }],
    paths: { "@/*": ["./*"] },
  },
  include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  exclude: ["node_modules"],
}));
await write(NEXT, "next-env.d.ts", '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n\n// NOTE: This file should not be edited\n');
await write(NEXT, "next.config.ts", 'import type { NextConfig } from "next";\nconst nextConfig: NextConfig = { outputFileTracingRoot: process.cwd() };\nexport default nextConfig;\n');
await write(NEXT, "components.json", json({
  $schema: "https://ui.shadcn.com/schema.json",
  style: "new-york",
  rsc: true,
  tsx: true,
  tailwind: { config: "", css: "app/globals.css", baseColor: "neutral", cssVariables: false, prefix: "" },
  aliases: {
    components: "@/components",
    utils: "@/lib/utils",
    ui: "@/components/ui",
    lib: "@/lib",
    hooks: "@/hooks",
  },
}));
await write(NEXT, "app/globals.css", "html { background: #f4efe5; }\nbody { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #1f1e19; }\n.consumer-shell { min-height: 100vh; padding: 32px; }\n");
await write(NEXT, "app/layout.tsx", 'import "./globals.css";\nexport const metadata = { title: "Living Type 01 — clean Next consumer" };\nexport default function Layout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }\n');
await mkdir(path.join(NEXT, "public"), { recursive: true });
await cp(path.join(ROOT, "app/favicon.ico"), path.join(NEXT, "public/favicon.ico"));
const usage = (testPrefix) => `"use client";

import { useState } from "react";
import { LivingType, LIVING_TYPE_PRESETS, type LivingTypePresetId } from "@/components/living-type-01/living-type";

export default function Page() {
  const [text, setText] = useState("NULLWORX");
  const [preset, setPreset] = useState<LivingTypePresetId>("night-bloom");
  const [paused, setPaused] = useState(false);
  const [mounted, setMounted] = useState(true);

  return (
    <main className="consumer-shell">
      <h1>Clean ${testPrefix} consumer</h1>
      <p id="sentinel">Unstyled consumer text. No Nullworx CSS or layout.</p>
      <label>
        Wordmark <input data-testid="consumer-text" value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      <div>
        {LIVING_TYPE_PRESETS.map((entry) => (
          <button key={entry.id} type="button" data-testid={\`consumer-preset-\${entry.id}\`} onClick={() => setPreset(entry.id)}>
            {entry.name}
          </button>
        ))}
        <button type="button" data-testid="consumer-pause" onClick={() => setPaused((value) => !value)}>
          {paused ? "Resume" : "Pause"}
        </button>
        <button type="button" data-testid="consumer-toggle-mount" onClick={() => setMounted((value) => !value)}>
          {mounted ? "Unmount" : "Mount"}
        </button>
      </div>
      <div style={{ maxWidth: 960, marginTop: 24 }} data-testid="consumer-stage">
        {mounted ? <LivingType text={text} preset={preset} paused={paused} /> : <p>Composition unmounted.</p>}
      </div>
    </main>
  );
}
`;
await write(NEXT, "app/page.tsx", usage("Next"));
await write(NEXT, "app/measure/page.tsx", `"use client";

import { LivingType, createLivingTypeRecipe } from "@/components/living-type-01/living-type";

// D-equivalent performance fixture. It matches the G3-A.1 D stage's 738x149
// frame and shader parameters while using the installed export.
const recipe = createLivingTypeRecipe({
  id: "d-equivalent",
  title: "D equivalent",
  text: "NULLWORX",
  preset: "night-bloom",
  aspect: 5,
  weight: 700,
  fit: 0.9,
  tracking: 0.012,
  colors: ["#AAA7D7", "#3C2B8E", "#AAA7D7", "#3C2B8E"],
  material: {
    speed: 0.32,
    distortion: 0.9,
    swirl: 0.08,
    grainMixer: 0,
    grainOverlay: 0,
    scale: 1,
    rotation: 0,
  },
  paused: false,
});

export default function MeasurePage() {
  return (
    <main style={{ width: 738, margin: 0 }}>
      <LivingType recipe={recipe} />
    </main>
  );
}
`);
run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], NEXT, "next-install.log");
run("npx", ["-y", "shadcn@4.23.0", "add", ITEM_URL, "--yes", "--cwd", NEXT], NEXT, "next-shadcn.log");

/* -------------------------------- Vite --------------------------------- */
const VITE = path.join(BASE, "vite");
await mkdir(path.join(VITE, "src"), { recursive: true });
await write(VITE, "package.json", json({
  name: "g5a-vite-consumer",
  version: "0.0.0",
  private: true,
  type: "module",
  scripts: {
    dev: "vite --host 127.0.0.1 --port 3202",
    build: "tsc -b && vite build",
    preview: "vite preview --host 127.0.0.1 --port 3202",
    typecheck: "tsc --noEmit",
  },
  dependencies: { react: "19.1.10", "react-dom": "19.1.10" },
  devDependencies: {
    "@types/node": "20.19.9",
    "@types/react": "19.1.2",
    "@types/react-dom": "19.1.2",
    "@vitejs/plugin-react": "6.1.2",
    typescript: "5.9.2",
    vite: "8.3.5",
  },
}));
await write(VITE, "tsconfig.json", json({
  compilerOptions: {
    target: "ES2022",
    useDefineForClassFields: true,
    lib: ["ES2022", "DOM", "DOM.Iterable"],
    allowJs: false,
    skipLibCheck: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    strict: true,
    forceConsistentCasingInFileNames: true,
    module: "ESNext",
    moduleResolution: "Bundler",
    resolveJsonModule: true,
    isolatedModules: true,
    noEmit: true,
    jsx: "react-jsx",
    baseUrl: ".",
    paths: { "@/*": ["./src/*"] },
  },
  include: ["src", "vite.config.ts"],
}));
await write(VITE, "vite.config.ts", 'import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\nimport path from "node:path";\n\nexport default defineConfig({\n  plugins: [react()],\n  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },\n});\n');
await write(VITE, "index.html", '<!doctype html>\n<html lang="en">\n  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><link rel="icon" href="data:," /><title>Living Type 01 — clean Vite consumer</title></head>\n  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>\n</html>\n');
await write(VITE, "components.json", json({
  $schema: "https://ui.shadcn.com/schema.json",
  style: "new-york",
  rsc: false,
  tsx: true,
  tailwind: { config: "", css: "src/globals.css", baseColor: "neutral", cssVariables: false, prefix: "" },
  aliases: {
    components: "@/components",
    utils: "@/lib/utils",
    ui: "@/components/ui",
    lib: "@/lib",
    hooks: "@/hooks",
  },
}));
await write(VITE, "src/globals.css", "html { background: #f4efe5; }\nbody { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #1f1e19; }\n.consumer-shell { min-height: 100vh; padding: 32px; }\n");
await write(VITE, "src/vite-env.d.ts", '/// <reference types="vite/client" />\n');
await write(VITE, "src/main.tsx", 'import { StrictMode } from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "./App";\nimport "./globals.css";\n\ncreateRoot(document.getElementById("root")!).render(\n  <StrictMode><App /></StrictMode>,\n);\n');
const viteUsage = usage("Vite").replace("Clean Vite consumer", "Clean Vite consumer");
await write(VITE, "src/App.tsx", viteUsage.replace("export default function Page()", "export default function App()"));
run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], VITE, "vite-install.log");
run("npx", ["-y", "shadcn@4.23.0", "add", ITEM_URL, "--yes", "--cwd", VITE], VITE, "vite-shadcn.log");

/* ------------------------------- receipts ------------------------------- */
const item = await (await fetch(ITEM_URL)).json();
await write(BASE, "registry-item.json", json(item));
for (const [name, root, expectedPrefix] of [
  ["next", NEXT, "components/living-type-01"],
  ["vite", VITE, "src/components/living-type-01"],
]) {
  const installed = [];
  for (const file of item.files) {
    const relative = file.target.replace(/^components\/living-type-01\//, "");
    const installedPath = path.join(root, expectedPrefix, relative);
    const content = await readFile(installedPath, "utf8");
    if (content !== file.content) throw new Error(`${name}: installed source differs for ${relative}`);
    installed.push(relative);
  }
  await write(BASE, `${name}-installed-files.json`, json(installed));
  console.log(`PASS ${name}: shadcn installed ${installed.length}/12 files with source parity`);
}

console.log(`CONSUMERS=${BASE}`);
