import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Closing statement",
  slug: "closing-statement",
  group: "Marketing",
  order: 210,
  description:
    "Calm final chapter with one proposition, a focused action area, and optional reassurance.",
  cli: {
    stance: "exempt",
    reason:
      "Its distinguishing contract is a browser page-ending chapter with broad editorial scale, centered action layout, and atmospheric backdrop; terminal flows close with their own prompt or next command.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "A long page should resolve into one proposition and one obvious action without introducing another feature list.",
  ],
  notWhen: [
    "The invitation needs multiple offers, pricing choices, or a substantial visual; use a dedicated decision or comparison component instead.",
  ],
  accessibility: [
    "The heading rank is explicit and precedes the action area in source order.",
    "Decorative backdrop content is always hidden from assistive technology.",
    "Actions remain ordinary consumer-supplied links or buttons and stack without changing order at narrow widths.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "contrast", label: "Contrast close", only: "web" },
    { id: "quiet", label: "Quiet close", only: "web" },
  ],
);

export default meta;
