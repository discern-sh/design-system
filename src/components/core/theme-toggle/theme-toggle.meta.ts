import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Theme toggle",
  slug: "theme-toggle",
  group: "Core",
  order: 40,
  description:
    "Controlled two-state light/dark comfort adjustment with outlined and quiet treatments; the consumer owns system resolution and persistence.",
  useWhen: [
    "A persistent page-chrome control should make an immediate light/dark comfort adjustment.",
    "The interface only needs to expose the opposite of the currently resolved light/dark theme.",
  ],
  notWhen: [
    "Use Theme switcher in a settings or inspection surface where System, Light, and Dark are deliberate choices.",
  ],
  cli: { stance: "rendered" },
  accessibility: [
    "The accessible name states the destination theme and swaps with the state, so the action is always explicit.",
    "The destination-style name makes this an action button, not an aria-pressed toggle button with a stable name.",
    "The glyph is decorative and hidden; the component never mutates the document itself, keeping theme application observable by the consumer.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "From light" },
  { id: "quiet", label: "Quiet" },
  { id: "from-dark", label: "From dark" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
