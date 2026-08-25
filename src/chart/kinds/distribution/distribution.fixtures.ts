/** Canonical product-neutral Distribution release evidence. */

import {
  chartReleaseFixtures,
  defineChartKindReleaseCorpus,
} from "../../kind-meta.ts";
import type { DistributionChartSpec } from "./distribution.spec.ts";

const minimal = {
  kind: "distribution",
  title: "Spread of recorded durations",
  summary: "Four recorded durations spread across three declared bins.",
  values: [12, 18, 24, 31],
  bins: { kind: "edges", values: [10, 20, 30, 40] },
} as const satisfies DistributionChartSpec;

const representative = {
  kind: "distribution",
  title: "Task duration distribution",
  summary:
    "Twenty-four recorded task durations binned by the pinned Sturges rule.",
  values: [
    12,
    14,
    18,
    21,
    23,
    26,
    28,
    31,
    33,
    34,
    37,
    39,
    42,
    44,
    47,
    51,
    54,
    58,
    62,
    66,
    71,
    76,
    82,
    87,
  ],
  bins: { kind: "rule", rule: "sturges" },
  value: { label: "Duration", unit: "ms" },
} as const satisfies DistributionChartSpec;

const boxSummary = {
  kind: "distribution",
  title: "Turnaround time summary",
  summary: "Five-number summary of seven recorded turnaround times.",
  variant: "box",
  values: [4, 7, 8, 10, 12, 15, 21],
  value: { label: "Turnaround", unit: "hours" },
} as const satisfies DistributionChartSpec;

const longText = {
  kind: "distribution",
  title: "How long the café espresso pulls actually take",
  summary:
    "Repeated shot timings recorded across a fortnight of mornings, binned to the declared five-second resolution.",
  values: [18, 21, 22, 23, 24, 24, 25, 26, 27, 29, 31, 34],
  bins: { kind: "edges", values: [15, 20, 25, 30, 35] },
  value: { label: "Pull time", unit: "seconds" },
} as const satisfies DistributionChartSpec;

const maximumDensity = {
  kind: "distribution",
  title: "Latency spread at the density ceiling",
  summary:
    "One hundred twenty recorded latencies across the twenty-bin ceiling.",
  values: Array.from({ length: 120 }, (_, index) => (index * 53) % 199),
  bins: {
    kind: "edges",
    values: Array.from({ length: 21 }, (_, index) => index * 10),
  },
  value: { unit: "ms" },
} satisfies DistributionChartSpec;

const quantizationEdge = {
  kind: "distribution",
  title: "Boundary values land deterministically",
  summary:
    "Values exactly on an inner edge take the upper bin, the maximum closes the last bin, and one declared bin stays empty.",
  values: [2, 10, 35, 40],
  bins: { kind: "edges", values: [0, 10, 20, 30, 40] },
} as const satisfies DistributionChartSpec;

const formatterTable = {
  kind: "distribution",
  title: "Request size distribution",
  summary: "Recorded request sizes over compact SI-labelled edges.",
  values: [1200, 3400, 5600, 7800, 9100, 12400, 15800, 19600],
  bins: { kind: "edges", values: [0, 5000, 10000, 15000, 20000] },
  value: { label: "Size", format: { kind: "si", decimals: 1 } },
} as const satisfies DistributionChartSpec;

/** Package-owned Distribution corpus; every projection derives from these specs. */
export const releaseCorpus = defineChartKindReleaseCorpus(
  {
    kind: "distribution",
    cases: [
      { name: "minimal-edges", postures: ["minimal"], spec: minimal },
      {
        name: "sturges-rule",
        postures: ["representative"],
        spec: representative,
      },
      {
        name: "box-summary",
        postures: ["structural", "semantic-roles"],
        spec: boxSummary,
      },
      { name: "long-text", postures: ["long-text"], spec: longText },
      {
        name: "maximum-density",
        postures: ["maximum-density"],
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
        ...minimal,
        bins: {
          kind: "edges",
          values: Array.from({ length: 22 }, (_, index) => index * 2),
        },
      },
    },
    invalid: [
      {
        name: "missing-bins",
        code: "chart/invalid-spec",
        spec: {
          kind: "distribution",
          title: minimal.title,
          summary: minimal.summary,
          values: minimal.values,
        },
      },
      {
        name: "bins-on-box",
        code: "chart/invalid-spec",
        spec: { ...boxSummary, bins: { kind: "edges", values: [0, 30] } },
      },
      {
        name: "non-increasing-edges",
        code: "chart/bin-edges",
        spec: { ...minimal, bins: { kind: "edges", values: [10, 20, 20, 40] } },
      },
      {
        name: "value-outside-edges",
        code: "chart/bin-edges",
        spec: { ...minimal, values: [12, 18, 24, 55] },
      },
      {
        name: "all-equal-values",
        code: "chart/degenerate-domain",
        spec: { ...minimal, values: [12, 12, 12, 12] },
      },
      {
        name: "non-finite-value",
        code: "chart/invalid-spec",
        spec: { ...minimal, values: [12, Number.POSITIVE_INFINITY, 24, 31] },
      },
      {
        name: "unknown-rule",
        code: "chart/invalid-spec",
        spec: { ...minimal, bins: { kind: "rule", rule: "scott" } },
      },
      {
        name: "box-floor",
        code: "chart/invalid-spec",
        spec: { ...boxSummary, values: [4, 7, 8] },
      },
      {
        name: "bidi-title",
        code: "chart/invalid-text",
        spec: { ...minimal, title: "Unsafe\u202Etitle" },
      },
    ],
  } as const,
);

const fixtures = chartReleaseFixtures(releaseCorpus);

export default fixtures;
