/** Authored identity, guidance, budgets, and terminal posture for scatter. */

import { type ChartKindMeta, defineChartKindMeta } from "../../kind-meta.ts";

const scatterKindMeta: ChartKindMeta = defineChartKindMeta(
  {
    name: "Scatter",
    slug: "scatter",
    order: 50,
    description:
      "Observed (x, y) pairs positioned on two quantitative scales so the reader judges the relationship between the two quantities.",
    useWhen: [
      "Judging how two measured quantities relate across many observations.",
      "Showing where observations cluster, spread, or stand apart on two scales.",
    ],
    notWhen: [
      "One axis is an ordered progression the reader follows; the line kind serves it.",
      "A third quantity would need to become bubble size; size encoding is refused, so split the figure instead.",
      "The reader compares named categories rather than paired quantities; the bar kind serves it.",
    ],
    budgets: {
      series: {
        limit: 3,
        unit: "series",
        remedy: "reduce-series",
        description:
          "Maximum simultaneous series, matching the three paired colour-plus-marker bundles (circle, square, triangle); a fourth population would have to differ by colour alone.",
      },
      pointsPerSeries: {
        limit: 200,
        unit: "points",
        remedy: "split-figure",
        description:
          "Maximum observations one series may state; past this the exact-pair table stops being a readable document and overplotting hides structure.",
      },
      seriesLabelGraphemes: {
        limit: 32,
        unit: "graphemes",
        remedy: "shorten-label",
        description: "Maximum concise series label length.",
      },
      xMagnitudeSpan: {
        limit: 6,
        unit: "decades",
        remedy: "log-scale",
        description:
          "Maximum decimal orders separating the smallest and largest nonzero x magnitudes on a linear scale; position encodes the value here, so the log scale is the honest remedy.",
      },
      yMagnitudeSpan: {
        limit: 6,
        unit: "decades",
        remedy: "log-scale",
        description:
          "Maximum decimal orders separating the smallest and largest nonzero y magnitudes on a linear scale; position encodes the value here, so the log scale is the honest remedy.",
      },
    },
    cli: { stance: "enhanced", honesty: "faithful" },
  } as const,
);

export default scatterKindMeta;
