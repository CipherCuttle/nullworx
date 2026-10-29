import type { Metadata } from "next";
import { LivingTypeDemo } from "@/components/living-type-demo/living-type-demo";

export const metadata: Metadata = {
  title: "Living Type 01 — NULLWORX",
  description:
    "An installable procedural wordmark: editable type, three Paper Shaders art directions, validated recipes and accessible reduced motion. Experimental owner review.",
  robots: { index: false, follow: false },
};

export default function LivingTypePage() {
  return <LivingTypeDemo />;
}
