import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LabShell } from "@/components/labs/lab-shell";
import { LabPreview } from "@/components/labs/lab-preview";
import { getIntegratedLabEntry } from "@/lib/labs/catalog";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Paper MeshGradient — unreleased lab preview",
  description:
    "Unreleased Nullworx lab preview: Upstream Paper Shaders material. No release approval is recorded.",
  path: "/lab/paper-mesh",
  noIndex: true,
});

export default function LabPage() {
  const entry = getIntegratedLabEntry("paper-mesh");
  if (!entry) notFound();
  return (
    <LabShell entry={entry}>
      <LabPreview slug="paper-mesh" />
    </LabShell>
  );
}
