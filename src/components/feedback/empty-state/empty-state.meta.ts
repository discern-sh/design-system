import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Empty state",
  slug: "empty-state",
  group: "Feedback",
  order: 60,
  description:
    "Centred placeholder for a region with nothing to show yet, with optional icon and follow-up actions.",
  cli: { stance: "rendered" },
  accessibility: [
    "Title and description are ordinary paragraphs in reading order; the decorative icon is hidden from assistive technology.",
    "Follow-up actions are slotted real controls that keep their own semantics and focus behaviour.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Empty" },
  { id: "compact", label: "Compact" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
