import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LabShell } from "@/components/labs/lab-shell";
import { LabPreview } from "@/components/labs/lab-preview";
import { getIntegratedLabEntry } from "@/lib/labs/catalog";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Material × Mask — unreleased lab preview",
  description:
    "Unreleased Nullworx lab preview: Compositions A–D. No release approval is recorded.",
  path: "/lab/composition",
  noIndex: true,
});

export default function LabPage() {
  const entry = getIntegratedLabEntry("composition");
  if (!entry) notFound();
  return (
    <LabShell entry={entry}>
      <LabPreview slug="composition" />
    </LabShell>
  );
}
