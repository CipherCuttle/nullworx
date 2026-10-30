"use client";

import dynamic from "next/dynamic";
import { Component, type ComponentType, type ReactNode } from "react";
import styles from "./lab-preview.module.css";

const loading = () => <div className={styles.loading}>Mounting the preserved effect…</div>;

const PREVIEWS: Record<string, ComponentType> = {
  holotype: dynamic(() => import("./holotype-preview"), { ssr: false, loading }),
  "paper-mesh": dynamic(() => import("./paper-mesh-preview"), { ssr: false, loading }),
  "motion-signal": dynamic(() => import("./motion-signal-preview"), { ssr: false, loading }),
  "signal-ui": dynamic(() => import("./signal-ui-preview"), { ssr: false, loading }),
  composition: dynamic(() => import("./composition-preview"), { ssr: false, loading }),
  "crt-material": dynamic(() => import("./crt-preview"), { ssr: false, loading }),
  "pearl-caustics": dynamic(() => import("./pearl-preview"), { ssr: false, loading }),
  "terminal-rain": dynamic(() => import("./terminal-rain-preview"), { ssr: false, loading }),
};

class PreviewBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return { message: error instanceof Error ? error.message : "The preview failed to mount." };
  }

  render() {
    if (this.state.message) {
      return (
        <div className={styles.error} role="alert">
          <strong>Preview unavailable</strong>
          <p>{this.state.message}</p>
          <button type="button" onClick={() => this.setState({ message: null })}>
            Retry mount
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function LabPreview({ slug }: { slug: string }) {
  const Preview = PREVIEWS[slug];
  if (!Preview) {
    return (
      <div className={styles.error} role="alert">
        <strong>Preview unavailable</strong>
        <p>No integrated preview is registered for this route.</p>
      </div>
    );
  }
  return (
    <PreviewBoundary>
      <Preview />
    </PreviewBoundary>
  );
}
