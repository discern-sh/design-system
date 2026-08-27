import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Masonry",
  slug: "masonry",
  group: "Layout",
  order: 45,
  description:
    "Standards-first variable-height columns with native Grid Lanes and a packed CSS fallback.",
  cli: { stance: "rendered" },
  purposes: ["marketing-site"],
  useWhen: [
    "Independent peer cards or media have useful natural heights and should pack without row alignment.",
  ],
  notWhen: [
    "Items form an ordered procedure, ranked result set, comparison, or focus-heavy navigation sequence.",
    "A curated hierarchy must fill a strict rectangle; use Feature bento instead.",
  ],
  accessibility: [
    "Neutral item wrappers retain child semantics and DOM order in every layout mode.",
    "The CSS Columns fallback flows down columns, while native Grid Lanes places each next item in the shortest lane; use only for independent peers whose meaning does not depend on visual adjacency.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Variable height" },
    { id: "single-column", label: "Single column" },
  ],
);

export default meta;
