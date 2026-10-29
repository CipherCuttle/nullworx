"use client";

import type { ComponentType } from "react";
import type { MaterialSurfaceId } from "@/lib/composition";
import { HolotypeSurface } from "./surfaces/holotype-surface";
import { PaperSurface } from "./surfaces/paper-surface";
import type { CompositionSurfaceProps } from "./surfaces/types";

/**
 * One registry keyed by material family. Adding a material adds one entry; it
 * does not add a branch per mask or per recipe combination.
 */
export const MATERIAL_SURFACES: Record<MaterialSurfaceId, ComponentType<CompositionSurfaceProps>> = {
  holotype: HolotypeSurface,
  paper: PaperSurface,
};
