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
  useWhen: [
    "One labelled figure with an optional context line, such as a count, a duration, or a rate, stands on its own or in a small row of peers.",
  ],
  notWhen: [
    "Use Metrics band on a marketing page when several outcomes should read as one evidence strip.",
    "Use Meter when the value is a level against a known range rather than a figure.",
    "Use Sparkline beside the figure when the trend itself is the message; Stat's context line is words, not a chart.",
  ],
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
