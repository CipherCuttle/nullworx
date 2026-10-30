import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LabShell } from "@/components/labs/lab-shell";
import { LabPreview } from "@/components/labs/lab-preview";
import { getIntegratedLabEntry } from "@/lib/labs/catalog";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Motion Signal Behavior — unreleased lab preview",
  description:
    "Unreleased Nullworx lab preview: Stateful interaction behaviour. No release approval is recorded.",
  path: "/lab/motion-signal",
  noIndex: true,
});

export default function LabPage() {
  const entry = getIntegratedLabEntry("motion-signal");
  if (!entry) notFound();
  return (
    <LabShell entry={entry}>
      <LabPreview slug="motion-signal" />
    </LabShell>
  );
}
