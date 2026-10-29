import type { MaskDefinition } from "@/lib/composition";
import type { MaskImageState } from "@/lib/composition/use-mask-image";

/**
 * The entire surface seam. A material receives the mask definition, the one
 * canonical mask image, its own validated params and playback flags. It does
 * not receive a recipe id, a combination id or a renderer hint.
 */
export interface CompositionSurfaceProps {
  mask: MaskDefinition;
  maskImage: MaskImageState;
  params: unknown;
  paused: boolean;
  reducedMotion: boolean;
}
