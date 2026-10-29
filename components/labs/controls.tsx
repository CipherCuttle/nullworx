"use client";

import { useId, type ReactNode } from "react";
import styles from "./controls.module.css";

export function Labeled({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className={styles.group}>
      <div className={styles.groupHead}>
        <span className={styles.groupLabel}>{label}</span>
        {hint ? <span className={styles.groupHint}>{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function Slider({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  format = (current) => current.toFixed(2),
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <label className={styles.slider} htmlFor={id}>
      <span className={styles.sliderLabel}>{label}</span>
      <output className={styles.sliderValue} htmlFor={id}>
        {format(value)}
      </output>
      <input
        id={id}
        className={styles.range}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string; title?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.segmented} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={styles.segment}
          aria-pressed={value === option.value}
          title={option.title}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={styles.toggle}>
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className={styles.toggleTrack} aria-hidden="true" />
    </label>
  );
}

export function ValidationLine({ issues }: { issues: string | null }) {
  return (
    <p className={styles.validation} role="status" aria-live="polite" data-valid={issues ? "false" : "true"}>
      {issues ? `Rejected by runtime validator: ${issues}` : "Runtime validator: params valid"}
    </p>
  );
}
