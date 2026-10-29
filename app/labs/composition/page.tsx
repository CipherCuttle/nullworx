import type { Metadata } from "next";
import { CompositionLab } from "@/components/labs/composition/composition-lab";

export const metadata: Metadata = {
  title: "Nullworx Composition Lab — G3-A material × mask proof",
  description:
    "Experimental proof that the existing HoloType material and the upstream Paper Shaders MeshGradient can be applied to two masks through a shared contract. Not owner-approved and not a registry item.",
  robots: { index: false, follow: false, nocache: true },
};

export default function CompositionLabPage() {
  return <CompositionLab />;
}
