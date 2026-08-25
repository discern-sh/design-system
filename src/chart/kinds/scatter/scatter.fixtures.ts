/** Canonical product-neutral Scatter release evidence. */

import {
  chartReleaseFixtures,
  defineChartKindReleaseCorpus,
} from "../../kind-meta.ts";
import type { ScatterChartSpec } from "./scatter.spec.ts";

const minimum = {
  kind: "scatter",
  title: "Latency against size",
  summary: "Review latency plotted against change size for one series.",
  series: [
    {
      id: "reviews",
      label: "Reviews",
      points: [{ x: 2, y: 5 }, { x: 4, y: 9 }, { x: 8, y: 14 }],
    },
  ],
} as const satisfies ScatterChartSpec;

const representative = {
  kind: "scatter",
  title: "Review latency by change size",
  summary: "Each point pairs one change's size with its review latency.",
  x: { label: "Size", unit: "files" },
  y: { label: "Latency", unit: "hours" },
  series: [
    {
      id: "changes",
      label: "Changes",
      points: [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
        { x: 4, y: 3 },
        { x: 6, y: 7 },
        { x: 8, y: 6 },
        { x: 9, y: 9 },
        { x: 12, y: 11 },
        { x: 14, y: 10 },
      ],
    },
  ],
} as const satisfies ScatterChartSpec;

const threeSeries = {
  kind: "scatter",
  title: "Throughput against queue depth by lane",
  summary:
    "Three lanes pair queue depth with throughput; each lane wears its own colour-plus-marker bundle.",
  x: { label: "Depth" },
  y: { label: "Throughput" },
  series: [
    {
      id: "first",
      label: "First lane",
      points: [{ x: 1, y: 3 }, { x: 3, y: 5 }, { x: 5, y: 8 }],
    },
    {
      id: "second",
      label: "Second lane",
      points: [{ x: 2, y: 2 }, { x: 4, y: 4 }, { x: 6, y: 6 }],
    },
    {
      id: "third",
      label: "Third lane",
      points: [{ x: 1.5, y: 6 }, { x: 3.5, y: 7 }, { x: 5.5, y: 9 }],
    },
  ],
} as const satisfies ScatterChartSpec;

const logLog = {
  kind: "scatter",
  title: "Cost against volume on log scales",
  summary:
    "Volume and unit cost each span decades, so both axes use the log scale.",
  x: { label: "Volume", scale: "log" },
  y: { label: "Cost", scale: "log", unit: "ms" },
  series: [
    {
      id: "runs",
      label: "Runs",
      points: [
        { x: 1, y: 900 },
        { x: 10, y: 240 },
        { x: 100, y: 60 },
        { x: 1000, y: 15 },
      ],
    },
  ],
} as const satisfies ScatterChartSpec;

const collisionCluster = {
  kind: "scatter",
  title: "Clustered retries",
  summary:
    "Three near-identical retries quantize into one terminal cell while two outliers stand apart.",
  series: [
    {
      id: "retries",
      label: "Retries",
      points: [
        { x: 10, y: 10 },
        { x: 10.01, y: 10.02 },
        { x: 10.02, y: 9.99 },
        { x: 50, y: 50 },
        { x: 1, y: 1 },
      ],
    },
  ],
} as const satisfies ScatterChartSpec;

const longText = {
  kind: "scatter",
  title: "Compare multilingual observation sets",
  summary:
    "Latin, 中文, and combining café series keep their marker bundles legible.",
  series: [
    {
      id: "zh",
      label: "参考数据集",
      points: [{ x: 1, y: 2 }, { x: 2, y: 3 }],
    },
    {
      id: "fr",
      label: "Café observations",
      points: [{ x: 1.5, y: 1 }, { x: 3, y: 2.5 }],
    },
  ],
} as const satisfies ScatterChartSpec;

const maximumDensity = {
  kind: "scatter",
  title: "Coordinate a bounded three-series spread",
  summary:
    "Three series of two hundred observations each exercise the full point budget.",
  x: { label: "Index" },
  y: { label: "Measure" },
  series: Array.from({ length: 3 }, (_, seriesIndex) => ({
    id: `s${seriesIndex + 1}`,
    label: `Series ${seriesIndex + 1}`,
    points: Array.from({ length: 200 }, (_, pointIndex) => ({
      x: pointIndex + 1,
      y: ((pointIndex * 7 + seriesIndex * 13) % 97) + seriesIndex * 20,
    })),
  })),
} satisfies ScatterChartSpec;

const formatterTable = {
  kind: "scatter",
  title: "Requests against replicas",
  summary:
    "Request volume labelled through the compact SI format against replica count.",
  x: { label: "Replicas", format: { kind: "decimal", decimals: 0 } },
  y: { label: "Requests", format: { kind: "si", decimals: 1 } },
  series: [
    {
      id: "load",
      label: "Load",
      points: [
        { x: 2, y: 4000 },
        { x: 4, y: 9500 },
        { x: 8, y: 21000 },
        { x: 16, y: 52000 },
      ],
    },
  ],
} as const satisfies ScatterChartSpec;

/** Package-owned Scatter corpus; every projection derives from these specs. */
export const releaseCorpus = defineChartKindReleaseCorpus(
  {
    kind: "scatter",
    cases: [
      { name: "minimum", postures: ["minimal"], spec: minimum },
      {
        name: "latency-size",
        postures: ["representative"],
        spec: representative,
      },
      {
        name: "three-lanes",
        postures: ["semantic-roles"],
        spec: threeSeries,
      },
      { name: "log-log", postures: ["structural"], spec: logLog },
      {
        name: "collision-cluster",
        postures: ["quantization-edge"],
        spec: collisionCluster,
      },
      { name: "long-text", postures: ["long-text"], spec: longText },
      {
        name: "maximum-density",
        postures: ["maximum-density"],
        spec: maximumDensity,
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
        series: Array.from({ length: 4 }, (_, index) => ({
          id: `s${index + 1}`,
          label: `Series ${index + 1}`,
          points: [
            { x: index + 1, y: index + 2 },
            { x: index + 3, y: index + 5 },
          ],
        })),
      },
    },
    invalid: [
      {
        name: "non-finite-coordinate",
        code: "chart/invalid-spec",
        spec: {
          ...minimum,
          series: [
            {
              id: "reviews",
              label: "Reviews",
              points: [{ x: 2, y: Number.NaN }, { x: 4, y: 9 }],
            },
          ],
        },
      },
      {
        name: "log-x-zero",
        code: "chart/log-domain",
        spec: {
          ...minimum,
          x: { scale: "log" },
          series: [
            {
              id: "reviews",
              label: "Reviews",
              points: [{ x: 0, y: 5 }, { x: 4, y: 9 }],
            },
          ],
        },
      },
      {
        name: "log-y-negative",
        code: "chart/log-domain",
        spec: {
          ...minimum,
          y: { scale: "log" },
          series: [
            {
              id: "reviews",
              label: "Reviews",
              points: [{ x: 2, y: -3 }, { x: 4, y: 9 }],
            },
          ],
        },
      },
      {
        name: "duplicate-identity",
        code: "chart/duplicate-id",
        spec: {
          ...minimum,
          series: [
            { id: "reviews", label: "Reviews", points: [{ x: 2, y: 5 }] },
            { id: "reviews", label: "Repeats", points: [{ x: 4, y: 9 }] },
          ],
        },
      },
      {
        name: "empty-points",
        code: "chart/invalid-spec",
        spec: {
          ...minimum,
          series: [{ id: "reviews", label: "Reviews", points: [] }],
        },
      },
      {
        name: "identical-points",
        code: "chart/degenerate-domain",
        spec: {
          ...minimum,
          series: [
            {
              id: "reviews",
              label: "Reviews",
              points: [{ x: 3, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 3 }],
            },
          ],
        },
      },
      {
        name: "unknown-axis-scale",
        code: "chart/invalid-spec",
        spec: { ...minimum, x: { scale: "sqrt" } },
      },
      {
        name: "bidi-title",
        code: "chart/invalid-text",
        spec: { ...minimum, title: "Unsafe\u202Etitle" },
      },
      {
        name: "unexpected-renderer-field",
        code: "chart/invalid-spec",
        spec: { ...minimum, renderer: "host" },
      },
    ],
  } as const,
);

const fixtures = chartReleaseFixtures(releaseCorpus);

export default fixtures;
