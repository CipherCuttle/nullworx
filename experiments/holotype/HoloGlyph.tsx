import {
  useId,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type Ref,
  type TouchEvent as ReactTouchEvent,
  useRef,
} from "react";
import { holoStyleVars, resolveHoloSettings } from "./presets";
import {
  resetHoloPointer,
  updateHoloPointer,
  updateHoloPointerAt,
} from "./pointer";
import type { HoloGlyphProps } from "./types";
import styles from "./holotype.module.css";

type Stop = { offset: string; color: string; opacity?: number };

const DARK_METAL: Stop[] = [
  { offset: "0%", color: "#05070b" },
  { offset: "15%", color: "#1b2230" },
  { offset: "27%", color: "#a9b7cc" },
  { offset: "34%", color: "#ffffff" },
  { offset: "42%", color: "#465166" },
  { offset: "56%", color: "#090c12" },
  { offset: "68%", color: "#78869b" },
  { offset: "77%", color: "#f8fbff" },
  { offset: "90%", color: "#242c3a" },
  { offset: "100%", color: "#07090d" },
];

const LIGHT_METAL: Stop[] = [
  { offset: "0%", color: "#0c0d11" },
  { offset: "17%", color: "#363841" },
  { offset: "29%", color: "#dedbd2" },
  { offset: "36%", color: "#ffffff" },
  { offset: "44%", color: "#4a4851" },
  { offset: "58%", color: "#101115" },
  { offset: "71%", color: "#bdb9af" },
  { offset: "80%", color: "#fffdf7" },
  { offset: "92%", color: "#2b2c31" },
  { offset: "100%", color: "#0a0b0e" },
];

const SPECTRAL: Stop[] = [
  { offset: "0%", color: "#000000", opacity: 0 },
  { offset: "16%", color: "#28e9ff", opacity: 0.55 },
  { offset: "25%", color: "#ff25b8", opacity: 0.82 },
  { offset: "33%", color: "#ffd45d", opacity: 0.7 },
  { offset: "42%", color: "#000000", opacity: 0 },
  { offset: "58%", color: "#785cff", opacity: 0.45 },
  { offset: "72%", color: "#e9fbff", opacity: 0.3 },
  { offset: "86%", color: "#45e4ff", opacity: 0.18 },
  { offset: "100%", color: "#000000", opacity: 0 },
];

function angleVector(angle: number) {
  const radians = (angle * Math.PI) / 180;
  const dx = Math.cos(radians) * 50;
  const dy = Math.sin(radians) * 50;
  return {
    x1: `${(50 - dx).toFixed(2)}%`,
    y1: `${(50 - dy).toFixed(2)}%`,
    x2: `${(50 + dx).toFixed(2)}%`,
    y2: `${(50 + dy).toFixed(2)}%`,
  };
}

function joinClassNames(...names: Array<string | false | undefined>): string {
  return names.filter(Boolean).join(" ");
}

function encodeMask(
  viewBox: string,
  paths: readonly string[],
  strokes: readonly string[],
  strokeWidth: number,
): string {
  const strokeMarkup = strokes
    .map(
      (d) =>
        `<path d="${d}" fill="none" stroke="#fff" stroke-width="${strokeWidth}" stroke-linecap="round"/>`,
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><path d="${paths.join(
    " ",
  )}" fill="#fff" fill-rule="evenodd"/>${strokeMarkup}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function HoloGlyph({
  label,
  paths,
  strokes = [],
  viewBox = "0 0 800 600",
  className,
  style,
  strokeWidth = 10,
  preset,
  settings: settingOverrides,
  tone = "dark",
  motion = "auto",
}: HoloGlyphProps) {
  const settings = resolveHoloSettings(preset, settingOverrides);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "") || "holo";
  const metalId = `holo-metal-${uid}`;
  const spectralId = `holo-spectral-${uid}`;
  const grainId = `holo-grain-${uid}`;
  const vector = angleVector(settings.angle);
  const metalStops = tone === "light" ? LIGHT_METAL : DARK_METAL;
  const mask = encodeMask(viewBox, paths, strokes, strokeWidth);
  const vars = holoStyleVars(settings);

  const rootStyle = {
    ...vars,
    "--glyph-mask": mask,
    ...style,
  } as CSSProperties;

  const handlePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (rootRef.current) {
      updateHoloPointer(rootRef.current, event, settings, motion);
    }
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (rootRef.current && event.pointerType !== "touch") {
      resetHoloPointer(rootRef.current);
    }
  };

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (touch && rootRef.current) {
      updateHoloPointerAt(
        rootRef.current,
        touch.clientX,
        touch.clientY,
        settings,
        motion,
      );
    }
  };

  return (
    <div
      ref={rootRef as Ref<HTMLDivElement>}
      className={joinClassNames(styles.glyph, className)}
      style={rootStyle}
      data-holo-glyph=""
      data-tone={tone}
      data-motion={motion}
      data-animated={settings.animated ? "true" : "false"}
      onPointerMove={handlePointer}
      onPointerLeave={handlePointerLeave}
      onTouchStart={handleTouchStart}
    >
      <svg
        className={styles.glyphSvg}
        viewBox={viewBox}
        role="img"
        aria-label={label}
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>{label}</title>
        <defs>
          <linearGradient id={metalId} {...vector}>
            {metalStops.map((stop) => (
              <stop
                key={`${stop.offset}-${stop.color}`}
                offset={stop.offset}
                stopColor={stop.color}
                stopOpacity={stop.opacity ?? 1}
              />
            ))}
          </linearGradient>
          <linearGradient id={spectralId} {...vector}>
            {SPECTRAL.map((stop) => (
              <stop
                key={`${stop.offset}-${stop.color}`}
                offset={stop.offset}
                stopColor={stop.color}
                stopOpacity={(stop.opacity ?? 0) * settings.spectral}
              />
            ))}
          </linearGradient>
          <pattern
            id={grainId}
            width="14"
            height="14"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1.5" cy="2" r="0.65" fill="#ffffff" opacity="0.75" />
            <circle cx="7" cy="5" r="0.45" fill="#ffffff" opacity="0.5" />
            <circle cx="12" cy="1.5" r="0.35" fill="#ffffff" opacity="0.55" />
            <circle cx="4" cy="9" r="0.5" fill="#ffffff" opacity="0.45" />
            <circle cx="10" cy="11" r="0.65" fill="#ffffff" opacity="0.6" />
            <circle cx="2" cy="12.5" r="0.3" fill="#ffffff" opacity="0.4" />
          </pattern>
        </defs>

        <g className={styles.glyphDepth} aria-hidden="true">
          <path d={paths.join(" ")} fill="#000000" fillRule="evenodd" />
        </g>

        <g className={styles.glyphBody}>
          <path
            d={paths.join(" ")}
            fill={`url(#${metalId})`}
            fillRule="evenodd"
          />
          <path
            d={paths.join(" ")}
            fill={`url(#${spectralId})`}
            fillRule="evenodd"
            className={styles.glyphSpectral}
          />
          <path
            d={paths.join(" ")}
            fill={`url(#${grainId})`}
            fillRule="evenodd"
            opacity={settings.grain * 0.5}
            className={styles.glyphGrain}
          />
          <path
            d={paths.join(" ")}
            fill="none"
            stroke="rgba(255,255,255,0.32)"
            strokeWidth={Math.max(0.6, strokeWidth * 0.035)}
            strokeLinejoin="round"
            opacity={0.35 + settings.metallic * 0.35}
            vectorEffect="non-scaling-stroke"
          />
          {strokes.map((d) => (
            <path
              key={d}
              d={d}
              fill="none"
              stroke={`url(#${metalId})`}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </g>
      </svg>
      <span aria-hidden="true" className={styles.glyphGlint} data-holo-layer="glint" />
    </div>
  );
}
