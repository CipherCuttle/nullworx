"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { AsciiWavesProps } from "./ascii-waves/ascii-waves";
import styles from "./ascii-waves-canvas.module.css";

const AsciiWaves = dynamic(
  () => import("./ascii-waves/ascii-waves").then((module) => module.AsciiWaves),
  { ssr: false, loading: () => null },
);

type RuntimeProps = Pick<
  AsciiWavesProps,
  | "preset"
  | "cellSize"
  | "characters"
  | "color"
  | "invert"
  | "speed"
  | "interactionIntensity"
  | "pointerInteraction"
  | "quality"
  | "playing"
  | "reducedMotion"
  | "ariaLabel"
  | "onReady"
  | "onError"
>;

export interface AsciiWavesCanvasProps extends RuntimeProps {
  poster: { src: string; alt: string };
  className?: string;
  testId?: string;
  priority?: boolean;
  disabled?: boolean;
}

export function AsciiWavesCanvas({
  poster,
  className,
  testId,
  priority = false,
  disabled = false,
  onReady,
  ...props
}: AsciiWavesCanvasProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (disabled) return;
    const root = rootRef.current;
    if (!root) return;
    if (typeof IntersectionObserver === "undefined") {
      const timer = window.setTimeout(() => setShouldLoad(true), 0);
      return () => window.clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "360px 0px", threshold: 0.01 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [disabled]);

  return (
    <div
      ref={rootRef}
      className={`${styles.field} ${className ?? ""}`.trim()}
      data-testid={testId}
      data-ascii-stage
      data-ready={ready ? "true" : "false"}
    >
      <Image
        className={styles.poster}
        src={poster.src}
        alt=""
        aria-hidden="true"
        fill
        sizes="(max-width: 760px) 100vw, 50vw"
        priority={priority}
      />
      <span className={styles.vignette} aria-hidden="true" />
      <span className={styles.scan} aria-hidden="true" />
      {shouldLoad ? (
        <AsciiWaves
          {...props}
          className={styles.liveCanvas}
          ariaLabel={props.ariaLabel ?? poster.alt}
          onReady={() => {
            setReady(true);
            onReady?.();
          }}
        />
      ) : null}
    </div>
  );
}
