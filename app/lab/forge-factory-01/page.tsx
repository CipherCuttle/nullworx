import type { Metadata } from "next";
import { ForgeFactoryGallery } from "./gallery";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Forge Effect Factory 01 — independent unreleased proofs",
  description: "White UI Forge review gallery: Glyph Morph, Prism Text and Magnetic Focus. Experimental only, no source release or sale.",
  path: "/lab/forge-factory-01",
  noIndex: true,
});

export default function ForgeFactoryPage() {
  return <ForgeFactoryGallery />;
}
