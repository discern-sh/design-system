/** Authored identity, guidance, budgets, and terminal posture for distribution. */

import { type ChartKindMeta, defineChartKindMeta } from "../../kind-meta.ts";

const distributionKindMeta: ChartKindMeta = defineChartKindMeta(
  {
    name: "Distribution",
    slug: "distribution",
    order: 30,
    description:
      "The shape and spread of repeated measurements: a histogram over author-declared or rule-named bin edges, or a box five-number summary of the same recorded values.",
    useWhen: [
      "Showing how one set of repeated measurements spreads across its range.",
      "Summarising a sample's centre and spread with the five Tukey numbers.",
    ],
    notWhen: [
      "Each value belongs to a named category; the bar kind compares them.",
      "The subject is a trend over an ordered scale; the line kind serves it.",
      "Every recorded value is equal; a table or a single stated value is honest.",
    ],
    budgets: {
      values: {
        limit: 2000,
        unit: "values",
        remedy: "split-figure",
        description:
          "Maximum recorded measurements in one figure; exact decimal binning and quartile derivation stay documentation-scale, and a larger sample reads better split by cohort.",
      },
      bins: {
        limit: 20,
        unit: "bins",
        remedy: "aggregate-categories",
        description:
          "Maximum histogram bins; every bin prints its full range and count on every surface, and more rows stop reading as one figure.",
      },
      valueLabelGraphemes: {
        limit: 32,
        unit: "graphemes",
        remedy: "shorten-label",
        description: "Maximum concise measured-quantity axis label length.",
      },
    },
    cli: { stance: "enhanced", honesty: "exact" },
  } as const,
);

export default distributionKindMeta;
