import type { Metadata } from "next";
import { EffectLab } from "@/components/labs/effect-lab";

export const metadata: Metadata = {
  title: "Nullworx Effect Lab — G2 integration foundation",
  description:
    "Experimental preview of an existing UI Forge effect and pinned Paper Shaders / Motion adapters. Not owner-approved and not a registry item.",
  robots: { index: false, follow: false },
};

export default function EffectsLabPage() {
  return <EffectLab />;
}
