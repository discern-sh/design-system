import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Empty state",
  slug: "empty-state",
  group: "Feedback",
  order: 60,
  description:
    "Centred placeholder for a region with nothing to show yet, with optional icon and follow-up actions.",
  useWhen: [
    "Explain why a region has no content and offer the next useful step: first use, an empty search, unavailable content, or a recoverable failure.",
  ],
  notWhen: [
    "Use Progress while work is pending. Empty content does not imply an error or require an alert.",
  ],
  cli: { stance: "rendered" },
  accessibility: [
    "Title and description are ordinary paragraphs in reading order; the decorative icon is hidden from assistive technology.",
    "Follow-up actions are slotted real controls that keep their own semantics and focus behaviour.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Empty" },
  { id: "compact", label: "Compact" },
  { id: "no-results", label: "No search results" },
  { id: "unavailable", label: "Unavailable content" },
  { id: "recoverable-failure", label: "Recoverable failure" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
