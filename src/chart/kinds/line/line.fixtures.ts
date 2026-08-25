/** Canonical product-neutral Line release evidence. */

import {
  chartReleaseFixtures,
  defineChartKindReleaseCorpus,
} from "../../kind-meta.ts";
import type { LineChartSpec } from "./line.spec.ts";

const minimum = {
  kind: "line",
  title: "Follow a weekly total",
  summary: "One measured series follows three ordered checkpoints.",
  x: { kind: "number", values: [1, 2, 3] },
  series: [
    { id: "total", label: "Total", values: [12, 18, 15] },
  ],
} as const satisfies LineChartSpec;

const representative = {
  kind: "line",
  title: "Daily reviews over two weeks",
  summary:
    "Completed and open reviews per day; one day has no stated open count.",
  value: { label: "Reviews", unit: "reviews" },
  x: {
    kind: "date",
    label: "Day",
    values: [
      "2026-03-02",
      "2026-03-04",
      "2026-03-06",
      "2026-03-09",
      "2026-03-11",
      "2026-03-13",
    ],
  },
  series: [
    { id: "completed", label: "Completed", values: [4, 6, 5, 9, 8, 11] },
    { id: "open", label: "Open", values: [3, 2, null, 1, 2, 0] },
  ],
} as const satisfies LineChartSpec;

const area = {
  kind: "line",
  title: "Cumulative acceptances",
  summary: "A running total filled to the zero baseline.",
  variant: "area",
  value: { unit: "landings" },
  x: { kind: "number", label: "Week", values: [1, 2, 3, 4, 5] },
  series: [
    { id: "accepted", label: "Accepted", values: [0, 2, 5, 9, 14] },
  ],
} as const satisfies LineChartSpec;

const logScale = {
  kind: "line",
  title: "Latency across load steps",
  summary: "A wide-magnitude measurement follows load on a log value scale.",
  value: { unit: "ms", scale: "log" },
  x: { kind: "number", label: "Load", values: [1, 10, 100, 1000] },
  series: [
    { id: "p90", label: "P90", values: [3, 40, 700, 9000] },
  ],
} as const satisfies LineChartSpec;

const longText = {
  kind: "line",
  title: "Compare multilingual reference counts over time",
  summary:
    "Latin, 中文, and combining café labels stay legible beside the paths.",
  x: {
    kind: "date",
    values: ["2026-01-05", "2026-01-12", "2026-01-19"],
  },
  series: [
    { id: "zh", label: "中文参考资料", values: [4, 6, 5] },
    { id: "fr", label: "Références café", values: [3, 5, 7] },
  ],
} as const satisfies LineChartSpec;

const maximumDensity = {
  kind: "line",
  title: "Coordinate a bounded six-series comparison",
  summary:
    "Six series across twenty-four ordered positions exercise every palette slot at the density ceiling.",
  x: {
    kind: "number",
    values: Array.from({ length: 24 }, (_, index) => index + 1),
  },
  series: Array.from({ length: 6 }, (_, seriesIndex) => ({
    id: `s${seriesIndex + 1}`,
    label: `Series ${seriesIndex + 1}`,
    values: Array.from(
      { length: 24 },
      (_, index) => 10 + seriesIndex * 6 + ((index * 5) % 17),
    ),
  })),
} satisfies LineChartSpec;

const quantizationEdge = {
  kind: "line",
  title: "Quantization edges stay honest",
  summary:
    "Values landing exactly between rows round half away from zero onto the fixed grid.",
  x: { kind: "number", values: [1, 2, 3, 4] },
  series: [
    { id: "value", label: "Value", values: [0, 1, 13, 14] },
  ],
} as const satisfies LineChartSpec;

const formatterTable = {
  kind: "line",
  title: "Throughput over releases",
  summary:
    "Requests per day follow releases, labelled through the compact SI format.",
  value: { label: "Requests", format: { kind: "si", decimals: 1 } },
  x: {
    kind: "number",
    label: "Release",
    values: [1, 2, 3, 4],
    format: { kind: "decimal", decimals: 0 },
  },
  series: [
    {
      id: "requests",
      label: "Requests",
      values: [12_500, 8_400, 24_000, 18_000],
    },
  ],
} as const satisfies LineChartSpec;

/** Package-owned Line corpus; every projection derives from these specs. */
export const releaseCorpus = defineChartKindReleaseCorpus(
  {
    kind: "line",
    cases: [
      { name: "minimum", postures: ["minimal"], spec: minimum },
      {
        name: "daily-reviews",
        postures: ["representative"],
        spec: representative,
      },
      { name: "area", postures: ["structural"], spec: area },
      { name: "log-scale", postures: ["structural"], spec: logScale },
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
      dimension: "series",
      authorAction: "reduce-series",
      spec: {
        ...minimum,
        series: Array.from({ length: 7 }, (_, index) => ({
          id: `s${index + 1}`,
          label: `Series ${index + 1}`,
          values: [index + 1, index + 2, index + 3],
        })),
      },
    },
    invalid: [
      {
        name: "non-increasing-x",
        code: "chart/invalid-spec",
        spec: {
          ...minimum,
          x: { kind: "number", values: [1, 3, 2] },
        },
      },
      {
        name: "misaligned-series",
        code: "chart/invalid-spec",
        spec: {
          ...minimum,
          series: [{ id: "total", label: "Total", values: [12, 18] }],
        },
      },
      {
        name: "log-non-positive",
        code: "chart/log-domain",
        spec: {
          ...minimum,
          value: { scale: "log" },
          series: [{ id: "total", label: "Total", values: [12, 0, 15] }],
        },
      },
      {
        name: "area-two-series",
        code: "chart/invalid-spec",
        spec: {
          ...minimum,
          variant: "area",
          series: [
            { id: "one", label: "One", values: [1, 2, 3] },
            { id: "two", label: "Two", values: [2, 3, 4] },
          ],
        },
      },
      {
        name: "area-negative",
        code: "chart/negative-value",
        spec: {
          ...minimum,
          variant: "area",
          series: [{ id: "total", label: "Total", values: [3, -2, 4] }],
        },
      },
      {
        name: "duplicate-identity",
        code: "chart/duplicate-id",
        spec: {
          ...minimum,
          series: [
            { id: "total", label: "Total", values: [12, 18, 15] },
            { id: "total", label: "Repeat", values: [2, 3, 4] },
          ],
        },
      },
      {
        name: "short-domain",
        code: "chart/degenerate-domain",
        spec: {
          ...minimum,
          x: { kind: "number", values: [1] },
          series: [{ id: "total", label: "Total", values: [12] }],
        },
      },
      {
        name: "single-stated-point",
        code: "chart/degenerate-domain",
        spec: {
          ...minimum,
          series: [{ id: "total", label: "Total", values: [12, null, null] }],
        },
      },
      {
        name: "malformed-date",
        code: "chart/invalid-spec",
        spec: {
          ...minimum,
          x: { kind: "date", values: ["2026-02-30", "2026-03-01"] },
          series: [{ id: "total", label: "Total", values: [12, 18] }],
        },
      },
      {
        name: "bidi-title",
        code: "chart/invalid-text",
        spec: { ...minimum, title: "Unsafe\u202Etitle" },
      },
    ],
  } as const,
);

const fixtures = chartReleaseFixtures(releaseCorpus);

export default fixtures;
