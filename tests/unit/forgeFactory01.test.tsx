import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GlyphMorph } from "@/components/forge-factory-01/glyph-morph";
import { PrismText } from "@/components/forge-factory-01/prism-text";
import { MagneticFocus } from "@/components/forge-factory-01/magnetic-focus";
import { readFileSync } from "node:fs";

describe("isolated Forge Effect Factory 01 primitives", () => {
  it("glyph SSR is deterministic and exposes the real phrase to assistive technology", () => {
    const a = renderToStaticMarkup(<GlyphMorph text="HELLO WORLD" seed={4} />);
    const b = renderToStaticMarkup(<GlyphMorph text="HELLO WORLD" seed={4} />);
    expect(a).toBe(b);
    expect(a).toContain('data-effect="glyph-morph"');
    expect(a).toContain('aria-hidden="true"');
    expect(a).toContain("HELLO WORLD");
  });
  it("prism text remains selectable DOM text with paused animation support", () => {
    const html = renderToStaticMarkup(<PrismText text="SOMEWHERE" paused speed={0.1} intensity={99} />);
    expect(html).toContain("SOMEWHERE");
    expect(html).toContain('data-paused="true"');
    expect(html).toContain("animation-play-state:paused");
    expect(html).toContain("animation-duration:24s");
  });
  it("magnetic focus is a real accessible button with no Next.js dependency", () => {
    const html = renderToStaticMarkup(<MagneticFocus label="ENTER" paused />);
    expect(html).toContain("<button");
    expect(html).toContain("ENTER");
    expect(html).toContain('data-motion="disabled"');
  });
  it("all effects are separate without remote media, React Bits imports, or released manifest changes", () => {
    const names = ["glyph-morph", "prism-text", "magnetic-focus"];
    for (const name of names) {
      const source = readFileSync(new URL(`../../components/forge-factory-01/${name}.tsx`, import.meta.url), "utf8");
      expect(source).not.toMatch(/from ["']next\//);
      expect(source).not.toMatch(/react-bits|aceternity|https?:\/\//i);
    }
    const manifest = readFileSync(new URL("../../lib/effects/manifest.ts", import.meta.url), "utf8");
    expect(manifest).not.toContain("forge-factory-01");
  });
});
