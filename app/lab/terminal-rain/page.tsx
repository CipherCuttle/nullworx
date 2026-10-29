import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LabShell } from "@/components/labs/lab-shell";
import { LabPreview } from "@/components/labs/lab-preview";
import { getIntegratedLabEntry } from "@/lib/labs/catalog";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Terminal Rain — unreleased lab preview",
  description:
    "Unreleased Nullworx lab preview: Glyph-stream material. No release approval is recorded.",
  path: "/lab/terminal-rain",
  noIndex: true,
});

export default function LabPage() {
  const entry = getIntegratedLabEntry("terminal-rain");
  if (!entry) notFound();
  return (
    <LabShell entry={entry}>
      <LabPreview slug="terminal-rain" />
    </LabShell>
  );
}
