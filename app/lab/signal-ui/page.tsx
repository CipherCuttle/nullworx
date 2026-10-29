import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LabShell } from "@/components/labs/lab-shell";
import { LabPreview } from "@/components/labs/lab-preview";
import { getIntegratedLabEntry } from "@/lib/labs/catalog";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Signal UI primitives — unreleased lab preview",
  description:
    "Unreleased Nullworx lab preview: CommandButton, SignalCard, RevealHeading. No release approval is recorded.",
  path: "/lab/signal-ui",
  noIndex: true,
});

export default function LabPage() {
  const entry = getIntegratedLabEntry("signal-ui");
  if (!entry) notFound();
  return (
    <LabShell entry={entry}>
      <LabPreview slug="signal-ui" />
    </LabShell>
  );
}
