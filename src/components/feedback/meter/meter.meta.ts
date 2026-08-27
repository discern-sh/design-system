import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Meter",
  slug: "meter",
  group: "Feedback",
  order: 50,
  description:
    "Labelled fraction-of-a-range meter with an optional textual reading beside the bar.",
  cli: { stance: "rendered" },
  accessibility: [
    "The bar carries role=meter with now/min/max values and an accessible name, so the reading is programmatic, not visual-only.",
    "Warning and danger tones pair with the textual reading; the fill colour is never the only signal.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Empty" },
  { id: "quarter", label: "In progress" },
  { id: "complete", label: "Complete" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
