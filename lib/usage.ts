import type { ComponentName } from "./forge";

export interface PreviewSettings {
  button: {
    label: string;
    variant: "solid" | "outline" | "ghost";
    accent: "copper" | "teal" | "violet";
    size: "sm" | "md" | "lg";
    loading: boolean;
    disabled: boolean;
    showArrow: boolean;
  };
  card: {
    heading: string;
    metric: string;
    description: string;
    status: "positive" | "neutral" | "warning" | "none";
    actions: boolean;
  };
  heading: { text: string; duration: number; delay: number; as: "h1" | "h2" | "h3" };
}

export const defaultSettings: PreviewSettings = {
  button: { label: "Make something good", variant: "solid", accent: "copper", size: "md", loading: false, disabled: false, showArrow: true },
  card: { heading: "Monthly revenue", metric: "$24,680", description: "+12.8% compared to last month", status: "positive", actions: true },
  heading: { text: "Good things take shape.", duration: 700, delay: 0, as: "h2" },
};

/** The gallery and clipboard use this same executable example. */
export function getUsage(name: ComponentName, settings: PreviewSettings): string {
  const q = JSON.stringify;
  if (name === "command-button") {
    const value = settings.button;
    return `"use client";

import { useState } from "react";
import { CommandButton } from "@/components/ui/command-button";

export default function Demo() {
  const [message, setMessage] = useState("");
  return (
    <div>
      <CommandButton
        variant={${q(value.variant)}}
        accent={${q(value.accent)}}
        size={${q(value.size)}}
        loading={${value.loading}}
        disabled={${value.disabled}}
        showArrow={${value.showArrow}}
        onClick={() => setMessage("Command received.")}
      >
        {${q(value.label)}}
      </CommandButton>
      <p role="status">{message}</p>
    </div>
  );
}
`;
  }
  if (name === "signal-card") {
    const value = settings.card;
    return `"use client";

import { useState } from "react";
import { SignalCard } from "@/components/ui/signal-card";

export default function Demo() {
  const [message, setMessage] = useState("");
  return (
    <div>
      <SignalCard
        heading={${q(value.heading)}}
        metric={${q(value.metric)}}
        description={${q(value.description)}}${value.status === "none" ? "" : `
        status={${q(value.status)}}`}${value.actions ? `
        actions={
          <button type="button" onClick={() => setMessage("Report opened.")}>
            View report ↗
          </button>
        }` : ""}
      />
      <p role="status">{message}</p>
    </div>
  );
}
`;
  }
  const value = settings.heading;
  return `"use client";

import { useState } from "react";
import { RevealHeading } from "@/components/ui/reveal-heading";

export default function Demo() {
  const [replay, setReplay] = useState(0);
  return (
    <div>
      <RevealHeading
        key={replay}
        text={${q(value.text)}}
        as={${q(value.as)}}
        duration={${value.duration}}
        delay={${value.delay}}
      />
      <button type="button" onClick={() => setReplay((value) => value + 1)}>
        Replay animation
      </button>
    </div>
  );
}
`;
}
