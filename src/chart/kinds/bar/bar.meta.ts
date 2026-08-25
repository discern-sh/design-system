/** Authored identity, guidance, budgets, and terminal posture for bar. */

import { type ChartKindMeta, defineChartKindMeta } from "../../kind-meta.ts";

const barKindMeta: ChartKindMeta = defineChartKindMeta(
  {
    name: "Bar",
    slug: "bar",
    order: 10,
    description:
      "Named categories compared by bar length from a zero baseline, side by side or as proportions of each category's whole.",
    useWhen: [
      "Comparing measured magnitudes across a small set of named categories.",
      "Showing how each category's whole divides across series as proportions.",
    ],
    notWhen: [
      "The subject is a trend over a continuous scale; the line kind serves it.",
      "Values are negative; the diverging bar variant is deferred and negative values are refused.",
      "The reader needs identity and topology rather than quantities; use a diagram kind.",
    ],
    budgets: {
      series: {
        limit: 6,
        unit: "series",
        remedy: "reduce-series",
        description:
          "Maximum simultaneous series, matching the fixed palette slots; grouped bars read best at four or fewer.",
      },
      categories: {
        limit: 12,
        unit: "categories",
        remedy: "aggregate-categories",
        description: "Maximum named categories in one readable figure.",
      },
      categoryLabelGraphemes: {
        limit: 48,
        unit: "graphemes",
        remedy: "shorten-label",
        description: "Maximum concise category label length.",
      },
      seriesLabelGraphemes: {
        limit: 32,
        unit: "graphemes",
        remedy: "shorten-label",
        description: "Maximum concise series label length.",
      },
      valueMagnitudeSpan: {
        limit: 4,
        unit: "decades",
        remedy: "split-figure",
        description:
          "Maximum decimal orders separating the smallest and largest nonzero value magnitudes; the log-scale remedy ships with the log scale.",
      },
    },
    cli: { stance: "enhanced", honesty: "exact" },
  } as const,
);

export default barKindMeta;
