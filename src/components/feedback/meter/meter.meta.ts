import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Meter",
  slug: "meter",
  group: "Feedback",
  order: 50,
  description:
    "Labelled fraction-of-a-range meter with an optional textual reading beside the bar.",
  accessibility: [
    "The bar carries role=meter with now/min/max values and an accessible name, so the reading is programmatic, not visual-only.",
    "Warning and danger tones pair with the textual reading; the fill colour is never the only signal.",
  ],
} satisfies ComponentMeta;
