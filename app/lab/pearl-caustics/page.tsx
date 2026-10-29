import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LabShell } from "@/components/labs/lab-shell";
import { LabPreview } from "@/components/labs/lab-preview";
import { getIntegratedLabEntry } from "@/lib/labs/catalog";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Pearl Caustics — unreleased lab preview",
  description:
    "Unreleased Nullworx lab preview: Physically inspired caustic field. No release approval is recorded.",
  path: "/lab/pearl-caustics",
  noIndex: true,
});

export default function LabPage() {
  const entry = getIntegratedLabEntry("pearl-caustics");
  if (!entry) notFound();
  return (
    <LabShell entry={entry}>
      <LabPreview slug="pearl-caustics" />
    </LabShell>
  );
}
