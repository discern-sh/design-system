/** Canonical product-neutral Heatmap release evidence. */

import {
  chartReleaseFixtures,
  defineChartKindReleaseCorpus,
} from "../../kind-meta.ts";
import type { HeatmapChartSpec } from "./heatmap.spec.ts";

const minimum = {
  kind: "heatmap",
  title: "Activity across two dayparts",
  summary: "One measured count read across a single row of two dayparts.",
  rows: [{ id: "total", label: "Total" }],
  columns: [
    { id: "am", label: "AM" },
    { id: "pm", label: "PM" },
  ],
  values: [[3, 14]],
  bins: { edges: [10] },
} as const satisfies HeatmapChartSpec;

const representative = {
  kind: "heatmap",
  title: "Weekly activity by daypart",
  summary:
    "Event counts across weekdays and dayparts; one cell has no stated count.",
  value: { label: "Events", unit: "events" },
  rows: [
    { id: "mon", label: "Mon" },
    { id: "tue", label: "Tue" },
    { id: "wed", label: "Wed" },
    { id: "thu", label: "Thu" },
    { id: "fri", label: "Fri" },
  ],
  columns: [
    { id: "morning", label: "Morning" },
    { id: "midday", label: "Midday" },
    { id: "afternoon", label: "Afternoon" },
    { id: "evening", label: "Evening" },
  ],
  values: [
    [3, 12, 27, 41],
    [0, 7, 19, 33],
    [4, null, 22, 36],
    [2, 9, 24, 38],
    [1, 6, 17, 30],
  ],
  bins: { edges: [5, 15, 30] },
} as const satisfies HeatmapChartSpec;

const structural = {
  kind: "heatmap",
  title: "Deploys across the week",
  summary: "A single row reads one count across seven days.",
  rows: [{ id: "deploys", label: "Deploys" }],
  columns: [
    { id: "mon", label: "Mon" },
    { id: "tue", label: "Tue" },
    { id: "wed", label: "Wed" },
    { id: "thu", label: "Thu" },
    { id: "fri", label: "Fri" },
    { id: "sat", label: "Sat" },
    { id: "sun", label: "Sun" },
  ],
  values: [[0, 2, 5, 9, 12, 1, null]],
  bins: { edges: [3, 8] },
} as const satisfies HeatmapChartSpec;

const longText = {
  kind: "heatmap",
  title: "Multilingual reference activity",
  summary:
    "Latin, 中文, العربية, and combining café labels stay legible on both grid axes.",
  rows: [
    { id: "zh", label: "中文参考" },
    { id: "ar", label: "مراجع العربية" },
    { id: "fr", label: "Références café" },
  ],
  columns: [
    { id: "early", label: "清晨" },
    { id: "late", label: "مساء" },
  ],
  values: [
    [2, 7],
    [9, 4],
    [12, 0],
  ],
  bins: { edges: [5, 10] },
} as const satisfies HeatmapChartSpec;

const maximumDensity = {
  kind: "heatmap",
  title: "Coordinate a bounded twenty-by-fourteen grid",
  summary:
    "Twenty rows by fourteen columns exercise every ramp bin at the density ceiling.",
  rows: Array.from({ length: 20 }, (_, index) => ({
    id: `r${index + 1}`,
    label: `R${index + 1}`,
  })),
  columns: Array.from({ length: 14 }, (_, index) => ({
    id: `c${index + 1}`,
    label: `C${index + 1}`,
  })),
  values: Array.from(
    { length: 20 },
    (_, rowIndex) =>
      Array.from(
        { length: 14 },
        (_, columnIndex) => (rowIndex * 14 + columnIndex) % 40,
      ),
  ),
  bins: { edges: [10, 20, 30] },
} satisfies HeatmapChartSpec;

const quantizationEdge = {
  kind: "heatmap",
  title: "Threshold values land in the upper bin",
  summary:
    "Values exactly on each declared edge take the upper bin; just below stays lower.",
  rows: [
    { id: "exact", label: "Exact" },
    { id: "below", label: "Below" },
  ],
  columns: [
    { id: "first", label: "First" },
    { id: "second", label: "Second" },
    { id: "third", label: "Third" },
  ],
  values: [
    [10, 20, 30],
    [9.9, 19.9, 29.9],
  ],
  bins: { edges: [10, 20, 30] },
} as const satisfies HeatmapChartSpec;

const formatterTable = {
  kind: "heatmap",
  title: "Requests by service and daypart",
  summary:
    "Request counts accept an authored compact format while bins print exact edges.",
  value: {
    label: "Requests",
    unit: "requests",
    format: { kind: "si", decimals: 1 },
  },
  rows: [
    { id: "ingest", label: "Ingest" },
    { id: "transform", label: "Transform" },
    { id: "publish", label: "Publish" },
  ],
  columns: [
    { id: "am", label: "AM" },
    { id: "pm", label: "PM" },
  ],
  values: [
    [12500, 8400],
    [24000, 15600],
    [5200, 700],
  ],
  bins: { edges: [1000, 10000, 20000] },
} as const satisfies HeatmapChartSpec;

/** Package-owned Heatmap corpus; every projection derives from these specs. */
export const releaseCorpus = defineChartKindReleaseCorpus(
  {
    kind: "heatmap",
    cases: [
      { name: "minimum", postures: ["minimal"], spec: minimum },
      {
        name: "weekly-activity",
        postures: ["representative"],
        spec: representative,
      },
      { name: "single-row-strip", postures: ["structural"], spec: structural },
      { name: "long-text", postures: ["long-text"], spec: longText },
      {
        name: "maximum-density",
        postures: ["maximum-density", "semantic-roles"],
        spec: maximumDensity,
      },
      {
        name: "quantization-edge",
        postures: ["quantization-edge"],
        spec: quantizationEdge,
      },
      {
        name: "formatter-table",
        postures: ["formatter-table"],
        spec: formatterTable,
      },
    ],
    overBudget: {
      dimension: "bins",
      authorAction: "aggregate-categories",
      spec: {
        ...minimum,
        bins: { edges: [1, 2, 3, 4] },
      },
    },
    invalid: [
      {
        name: "ragged-values",
        code: "chart/invalid-spec",
        spec: {
          ...representative,
          values: [
            [3, 12, 27, 41],
            [0, 7, 19],
            [4, null, 22, 36],
            [2, 9, 24, 38],
            [1, 6, 17, 30],
          ],
        },
      },
      {
        name: "non-increasing-edges",
        code: "chart/bin-edges",
        spec: { ...minimum, bins: { edges: [10, 10] } },
      },
      {
        name: "empty-edges",
        code: "chart/bin-edges",
        spec: { ...minimum, bins: { edges: [] } },
      },
      {
        name: "duplicate-identity",
        code: "chart/duplicate-id",
        spec: {
          ...minimum,
          columns: [
            { id: "total", label: "AM" },
            { id: "pm", label: "PM" },
          ],
        },
      },
      {
        name: "all-null-grid",
        code: "chart/degenerate-domain",
        spec: { ...minimum, values: [[null, null]] },
      },
      {
        name: "non-finite-value",
        code: "chart/invalid-spec",
        spec: { ...minimum, values: [[Infinity, 2]] },
      },
      {
        name: "bidi-label",
        code: "chart/invalid-text",
        spec: {
          ...minimum,
          rows: [{ id: "total", label: "Unsafe\u202Elabel" }],
        },
      },
    ],
  } as const,
);

const fixtures = chartReleaseFixtures(releaseCorpus);

export default fixtures;
