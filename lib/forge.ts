export type ComponentName = "command-button" | "signal-card" | "reveal-heading";

export interface SourceFile {
  name: string;
  content: string;
}

export interface GalleryItem {
  name: ComponentName;
  title: string;
  description: string;
  files: SourceFile[];
}

export const componentInfo = {
  "command-button": {
    number: "01",
    category: "Interaction",
    description: "A clear invitation to take the next step. Tactile feedback, thoughtful states, just enough character.",
  },
  "signal-card": {
    number: "02",
    category: "Data display",
    description: "Give your important numbers a little breathing room. A focused surface for metrics, context, and action.",
  },
  "reveal-heading": {
    number: "03",
    category: "Typography",
    description: "Make an entrance, one word at a time. A quiet text reveal that respects your reader’s motion preferences.",
  },
} as const;
