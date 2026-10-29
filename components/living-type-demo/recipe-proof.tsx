"use client";

import { useEffect, useState } from "react";
import { LivingType, parseLivingTypeRecipe, type LivingTypeRecipe } from "@/registry/nullworx/living-type-01/living-type";

export const RECIPE_PROOF_STORAGE_KEY = "g5a-recipe-proof";

/**
 * Evidence route only: mounts the installed recipe exactly as stored, with the
 * recipe's paused playback. It is not linked from the product demo.
 */
export function RecipeProof() {
  const [recipe, setRecipe] = useState<LivingTypeRecipe | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(RECIPE_PROOF_STORAGE_KEY);
    if (!raw) {
      setError("No recipe found in localStorage.");
      return;
    }
    const parsed = parseLivingTypeRecipe(raw);
    if (!parsed.ok) {
      setError(parsed.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; "));
      return;
    }
    setRecipe(parsed.recipe);
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#0b0a08",
      }}
    >
      <div style={{ width: "100%", maxWidth: 960 }} data-testid="recipe-proof-stage">
        {recipe ? <LivingType recipe={recipe} /> : null}
        {error ? (
          <p role="alert" style={{ color: "#ffb4a2", fontFamily: "monospace" }}>
            {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}
