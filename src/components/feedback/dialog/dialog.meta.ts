import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Dialog",
  slug: "dialog",
  group: "Feedback",
  order: 40,
  description:
    "Controlled native modal dialog with platform focus containment and explicit close behaviour.",
  cli: { stance: "rendered" },
  accessibility: [
    "Uses showModal(), aria-labelledby, Escape handling, and a labelled close button.",
    "Background scrolling is locked while open.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Open" },
  { id: "submitted", label: "Submitted" },
  { id: "cancelled", label: "Cancelled" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
