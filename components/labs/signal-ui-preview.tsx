"use client";

import { useState, type CSSProperties } from "react";
import { CommandButton } from "@/registry/new-york/command-button/command-button";
import { RevealHeading } from "@/registry/new-york/reveal-heading/reveal-heading";
import { SignalCard } from "@/registry/new-york/signal-card/signal-card";
import { ControlGroup, Segmented, Toggle } from "./controls";
import chrome from "./preview-chrome.module.css";
import styles from "./signal-ui-preview.module.css";

type Variant = "solid" | "outline" | "ghost";
type Accent = "copper" | "teal" | "violet";

const forgeVars = {
  "--forge-ink": "#292924",
  "--forge-surface": "#fffefa",
  "--forge-border": "#e3e0d9",
  "--forge-muted": "#696960",
  "--forge-accent": "#b54d2f",
  "--forge-font": "var(--font-sans)",
  "--forge-radius-control": "6px",
  "--forge-radius-surface": "12px",
} as CSSProperties;

export default function SignalUiPreview() {
  const [variant, setVariant] = useState<Variant>("solid");
  const [accent, setAccent] = useState<Accent>("copper");
  const [loading, setLoading] = useState(false);
  const [replay, setReplay] = useState(0);
  const [presses, setPresses] = useState(0);

  return (
    <div className={chrome.preview} data-testid="signal-ui-adapter">
      <section
        className={styles.stage}
        data-testid="signal-ui-preview"
        aria-label="UI Forge signal primitives"
      >
        <div className={styles.paper} style={forgeVars}>
          <div className={styles.paperHead}>
            <span>UI FORGE v0.1 / LOCAL USE</span>
            <span>NATIVE REACT DOM</span>
            <span>REVIEW SURFACE</span>
          </div>

          <div className={styles.headingRow}>
            <RevealHeading
              key={replay}
              as="h2"
              text="The signal is part of the interface."
              duration={850}
              className={styles.heading}
            />
            <button className={styles.replay} type="button" onClick={() => setReplay((value) => value + 1)}>
              Replay heading
            </button>
          </div>

          <div className={styles.grid}>
            <div className={styles.buttonColumn}>
              <p className={styles.label}>CommandButton</p>
              <div className={styles.buttonRow}>
                <CommandButton
                  variant={variant}
                  accent={accent}
                  loading={loading}
                  loadingLabel="Transmitting…"
                  onClick={() => setPresses((value) => value + 1)}
                >
                  Run command
                </CommandButton>
                <CommandButton variant="outline" accent="teal" size="sm">
                  Secondary
                </CommandButton>
                <CommandButton variant="ghost" accent="violet" size="sm" showArrow={false}>
                  Quiet
                </CommandButton>
              </div>
              <p className={styles.counter} aria-live="polite">
                Presses: {presses}. Native button keyboard and loading state.
              </p>
              <p className={styles.label}>Focus / disabled states</p>
              <div className={styles.buttonRow}>
                <CommandButton variant="outline" accent="copper" disabled>
                  Disabled
                </CommandButton>
                <CommandButton variant="solid" accent="teal" loading>
                  Loading
                </CommandButton>
              </div>
            </div>

            <SignalCard
              heading="Signal integrity"
              metric="98.4%"
              description="A semantic metric card with an optional status, composed actions and restrained hover feedback."
              status="positive"
              statusLabel="On track"
              headingLevel={3}
              actions={
                <>
                  <CommandButton size="sm" accent="teal">Open report</CommandButton>
                  <CommandButton size="sm" variant="ghost" accent="copper" showArrow={false}>Dismiss</CommandButton>
                </>
              }
            />
          </div>
        </div>

        <div className={chrome.stageMeta}>
          <span>Existing components / byte-identical</span>
          <span>UI Forge v0.1</span>
          <span>Local-use approved</span>
        </div>
        <div className={chrome.stageFoot}>
          <span>NO OLD GALLERY CSS</span>
          <span>LOCAL --FORGE-* TOKEN MAP</span>
          <span>KEYBOARD / REDUCED MOTION</span>
        </div>
      </section>

      <div className={chrome.controls}>
        <div className={chrome.controlsHead}>
          <span>Component controls</span>
          <small>Source files stay byte-identical</small>
        </div>
        <div className={chrome.controlGrid}>
          <ControlGroup label="Variant">
            <Segmented
              label="CommandButton variant"
              value={variant}
              options={[
                { value: "solid", label: "Solid" },
                { value: "outline", label: "Outline" },
                { value: "ghost", label: "Ghost" },
              ]}
              onChange={setVariant}
            />
          </ControlGroup>
          <ControlGroup label="Accent">
            <Segmented
              label="CommandButton accent"
              value={accent}
              options={[
                { value: "copper", label: "Copper" },
                { value: "teal", label: "Teal" },
                { value: "violet", label: "Violet" },
              ]}
              onChange={setAccent}
            />
          </ControlGroup>
          <ControlGroup label="Loading">
            <Toggle label="Show loading state" checked={loading} onChange={setLoading} />
          </ControlGroup>
        </div>
        <p className={chrome.controlsFoot}>
          The components are mounted on a real interactive surface. The wrapper remaps the original
          <code> --forge-* </code> variables to Nullworx tokens; it does not rewrite the component CSS.
        </p>
      </div>
    </div>
  );
}
