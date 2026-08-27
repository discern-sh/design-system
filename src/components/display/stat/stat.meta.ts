import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Stat",
  slug: "stat",
  group: "Display",
  order: 90,
  description:
    "One labelled figure with an optional trend-coloured context line.",
  cli: { stance: "rendered" },
  purposes: ["displaying-tool-output", "marketing-site"],
  accessibility: [
    "Label, value, and context read as one continuous text run in source order.",
    "Trend colour is reinforced by the context wording itself, never carried by colour alone.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Neutral" },
  { id: "positive", label: "Positive trend" },
  { id: "negative", label: "Negative trend" },
  { id: "with-sparkline", label: "With sparkline" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
