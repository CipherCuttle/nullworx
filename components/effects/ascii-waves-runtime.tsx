"use client";

import { forwardRef } from "react";
import {
  AsciiWaves,
  type AsciiWavesHandle,
  type AsciiWavesProps,
} from "./ascii-waves/ascii-waves";

/**
 * Thin lazy-load seam. It adds no rendering behaviour; it exists so the site
 * wrapper can hold the preserved component's public imperative handle while
 * the effect source stays byte-identical and out of the server bundle.
 */
export const AsciiWavesRuntime = forwardRef<AsciiWavesHandle, AsciiWavesProps>(
  function AsciiWavesRuntime(props, ref) {
    return <AsciiWaves {...props} ref={ref} />;
  },
);
