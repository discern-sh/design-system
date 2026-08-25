/** Authored identity, guidance, budgets, and terminal posture for line. */

import { type ChartKindMeta, defineChartKindMeta } from "../../kind-meta.ts";

const lineKindMeta: ChartKindMeta = defineChartKindMeta(
  {
    name: "Line",
    slug: "line",
    order: 20,
    description:
      "One or more measured series followed through an ordered numeric or date domain, with an optional single-series area fill from the zero baseline.",
    useWhen: [
      "Following how a measured value moves through an ordered domain such as time.",
      "Comparing a small set of series over the same ordered domain.",
    ],
    notWhen: [
      "The domain is a set of named categories rather than an ordered scale; the bar kind serves it.",
      "The reader needs the shape and spread of repeated measurements; the distribution kind serves it.",
      "Several series should stack into one filled total; small multiples or the table serve it, and the area variant stays single-series.",
    ],
    budgets: {
      series: {
        limit: 6,
        unit: "series",
        remedy: "reduce-series",
        description:
          "Maximum simultaneous series, matching the fixed palette slots; crossing paths read best at three or fewer.",
      },
      points: {
        limit: 120,
        unit: "points",
        remedy: "split-figure",
        description:
          "Maximum ordered domain positions in one figure; every authored point renders without resampling, so a longer series splits rather than decimates.",
      },
      seriesLabelGraphemes: {
        limit: 32,
        unit: "graphemes",
        remedy: "shorten-label",
        description: "Maximum concise series label length.",
      },
      valueMagnitudeSpan: {
        limit: 6,
        unit: "decades",
        remedy: "log-scale",
        description:
          "Maximum decimal orders separating the smallest and largest positive value magnitudes under the linear scale; the log scale carries wider spans honestly, so the budget does not bind there.",
      },
    },
    cli: { stance: "enhanced", honesty: "faithful" },
  } as const,
);

export default lineKindMeta;
