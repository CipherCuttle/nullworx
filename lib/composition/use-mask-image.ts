"use client";

import { useEffect, useState } from "react";
import { createTextMaskImage, maskImageFromSvg, type MaskImage } from "./mask-image";
import type { MaskDefinition } from "./types";

export type MaskImageState =
  | { status: "loading" }
  | { status: "ready"; image: MaskImage }
  | { status: "error"; message: string };

interface StateEntry {
  maskId: string;
  value: MaskImageState;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function initialState(mask: MaskDefinition): MaskImageState {
  if (mask.kind === "text") return { status: "loading" };
  try {
    return { status: "ready", image: maskImageFromSvg(mask) };
  } catch (error) {
    return { status: "error", message: describe(error) };
  }
}

/**
 * Produce the canonical mask image for the current MaskDefinition.
 *
 * The same source is handed to the CSS-mask material and to the hidden
 * reference image used by boundary verification, so there is one mask truth.
 */
export function useMaskImage(mask: MaskDefinition): MaskImageState {
  const [entry, setEntry] = useState<StateEntry>(() => ({
    maskId: mask.id,
    value: initialState(mask),
  }));

  useEffect(() => {
    if (mask.kind === "svg-path") {
      let cancelled = false;
      queueMicrotask(() => {
        if (cancelled) return;
        try {
          setEntry({ maskId: mask.id, value: { status: "ready", image: maskImageFromSvg(mask) } });
        } catch (error) {
          setEntry({ maskId: mask.id, value: { status: "error", message: describe(error) } });
        }
      });
      return () => { cancelled = true; };
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setEntry({ maskId: mask.id, value: { status: "loading" } });
    });
    createTextMaskImage(mask)
      .then((image) => {
        if (!cancelled) setEntry({ maskId: mask.id, value: { status: "ready", image } });
      })
      .catch((error: unknown) => {
        if (!cancelled) setEntry({ maskId: mask.id, value: { status: "error", message: describe(error) } });
      });

    return () => {
      cancelled = true;
    };
  }, [mask]);

  return entry.maskId === mask.id ? entry.value : { status: "loading" };
}
