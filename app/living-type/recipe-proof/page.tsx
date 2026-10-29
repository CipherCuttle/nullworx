import type { Metadata } from "next";
import { RecipeProof } from "@/components/living-type-demo/recipe-proof";

export const metadata: Metadata = {
  title: "Living Type 01 — paused recipe proof",
  robots: { index: false, follow: false },
};

export default function RecipeProofPage() {
  return <RecipeProof />;
}
