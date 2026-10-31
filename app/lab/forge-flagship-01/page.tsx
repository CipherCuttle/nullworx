import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";
import { FlagshipGallery } from "./gallery";
export const metadata: Metadata = createPageMetadata({
  title: "UI Forge Flagship Shaders 01 — unreleased visual studies",
  description: "Review-only original shader, liquid optical and glass-card experiments.",
  path: "/lab/forge-flagship-01",
  noIndex: true,
});
export default function Page() { return <FlagshipGallery />; }
