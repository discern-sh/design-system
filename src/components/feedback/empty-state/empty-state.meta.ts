import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Empty state",
  slug: "empty-state",
  group: "Feedback",
  order: 60,
  description:
    "Centred placeholder for a region with nothing to show yet, with optional icon and follow-up actions.",
  accessibility: [
    "Title and description are ordinary paragraphs in reading order; the decorative icon is hidden from assistive technology.",
    "Follow-up actions are slotted real controls that keep their own semantics and focus behaviour.",
  ],
} satisfies ComponentMeta;
