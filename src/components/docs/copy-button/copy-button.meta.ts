import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Copy button",
  slug: "copy-button",
  group: "Docs",
  order: 80,
  cli: {
    stance: "exempt",
    reason:
      "Clipboard mutation and transient confirmation require an interactive driver, not a pure terminal renderer.",
  },
  description:
    "Exact clipboard copy through the selected runtime, with custom labels/icons and truthful success or failure feedback.",
  behaviors: ["copy-button"],
  purposes: ["building-documentation"],
  accessibility: [
    "Load the emitted discern.js beside discern.css, inside a data-discern-root. Static and live React hosts share this behavior; no hydration is required.",
    "Without the selected script the button stays inert and visibly unavailable. Keep source text selectable for manual copy. Clipboard access requires a secure context and browser permission.",
    "A polite live region announces success only after the write succeeds, or failure with manual-copy guidance. Consumer preventDefault and disabled state cancel activation.",
    "The copied and failed states are carried by data attributes that paint success and danger tones beside the announced text and their own glyphs, so colour is never the only cue; failure shows failedIcon, or no icon, never the copy action's glyph.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [{
  id: "default",
  label: "Copy action",
  only: "web",
}] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
