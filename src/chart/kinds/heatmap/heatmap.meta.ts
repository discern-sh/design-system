/** Authored identity, guidance, budgets, and terminal posture for heatmap. */

import { type ChartKindMeta, defineChartKindMeta } from "../../kind-meta.ts";

const heatmapKindMeta: ChartKindMeta = defineChartKindMeta(
  {
    name: "Heatmap",
    slug: "heatmap",
    order: 40,
    description:
      "One measured quantity read across a grid of two category sets, encoded as declared bins on the sequential accent ramp.",
    useWhen: [
      "Reading how one magnitude distributes across every pairing of two category sets.",
      "Spotting concentrated and sparse regions in a matrix, such as activity by weekday and daypart.",
    ],
    notWhen: [
      "The cells are boolean capabilities or categorical facts rather than one measured quantity; Table and ComparisonTable serve those.",
      "The reader needs finer distinction than four declared bins honestly carry; re-bin with new declared edges or present the exact values as a table.",
      "The subject is one series' trend over time rather than a two-way grid; the line kind serves it.",
    ],
    budgets: {
      rows: {
        limit: 20,
        unit: "rows",
        remedy: "aggregate-categories",
        description:
          "Maximum named rows one grid can carry while every row label stays legible beside its cells.",
      },
      columns: {
        limit: 14,
        unit: "columns",
        remedy: "aggregate-categories",
        description:
          "Maximum named columns in one readable grid; column labels sit above narrow cells, so columns cap tighter than rows.",
      },
      bins: {
        limit: 4,
        unit: "bins",
        remedy: "aggregate-categories",
        description:
          "Maximum declared bins, matching the four sequential ramp slots where lightness carries the value; a scale needing more must re-bin with new declared edges rather than dither.",
      },
      rowLabelGraphemes: {
        limit: 24,
        unit: "graphemes",
        remedy: "shorten-label",
        description: "Maximum concise row label length.",
      },
      columnLabelGraphemes: {
        limit: 12,
        unit: "graphemes",
        remedy: "shorten-label",
        description:
          "Maximum concise column label length; column labels sit above narrow cells.",
      },
    },
    cli: { stance: "enhanced", honesty: "faithful" },
  } as const,
);

export default heatmapKindMeta;
