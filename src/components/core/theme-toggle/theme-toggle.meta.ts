import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Theme toggle",
  slug: "theme-toggle",
  group: "Core",
  order: 40,
  description:
    "Two-state light/dark comfort adjustment with outlined and quiet treatments, controlled by React or activated by the selected behavior in static HTML.",
  useWhen: [
    "A persistent page-chrome control should make an immediate light/dark comfort adjustment.",
    "The interface only needs to expose the opposite of the currently resolved light/dark theme.",
    "Static HTML needs a working control without hydration; omitting `onThemeChange` emits the contract the selected behavior activates.",
  ],
  notWhen: [
    "Use Theme switcher in a settings or inspection surface where System, Light, and Dark are deliberate choices.",
  ],
  cli: { stance: "rendered" },
  behaviors: ["theme-toggle"],
  accessibility: [
    "The accessible name states the destination theme and swaps with the state, so the action is always explicit.",
    "The destination-style name makes this an action button, not an aria-pressed toggle button with a stable name.",
    "The glyph is decorative and hidden; the React adapter never mutates the document itself, keeping theme application observable by the consumer.",
    "Without the selected script a static control stays inert: visibly unavailable and out of the accessibility tree, because nothing could act on it.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "From light" },
  { id: "quiet", label: "Quiet" },
  { id: "from-dark", label: "From dark" },
  {
    id: "static",
    label: "Static enhancement",
    only: "web",
    reason:
      "The static contract exists so a browser script can activate markup that shipped without hydration; a terminal renderer has no document to enhance.",
  },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
