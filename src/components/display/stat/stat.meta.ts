import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Stat",
  slug: "stat",
  group: "Display",
  order: 90,
  description:
    "One labelled figure with an optional trend-coloured context line.",
  purposes: ["displaying-tool-output", "marketing-site"],
  accessibility: [
    "Label, value, and context read as one continuous text run in source order.",
    "Trend colour is reinforced by the context wording itself, never carried by colour alone.",
  ],
} satisfies ComponentMeta;
