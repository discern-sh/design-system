/** Canonical product-neutral Bar release evidence. */

import {
  chartReleaseFixtures,
  defineChartKindReleaseCorpus,
} from "../../kind-meta.ts";
import type { BarChartSpec } from "./bar.spec.ts";

const minimum = {
  kind: "bar",
  title: "Compare two totals",
  summary: "One measured series compares a before and an after total.",
  categories: [
    { id: "before", label: "Before" },
    { id: "after", label: "After" },
  ],
  series: [
    { id: "total", label: "Total", values: [12, 18] },
  ],
} as const satisfies BarChartSpec;

const representative = {
  kind: "bar",
  title: "Quarterly reviews by region",
  summary:
    "Completed and open reviews per region; one region has no stated open count.",
  value: { label: "Reviews", unit: "reviews" },
  categories: [
    { id: "north", label: "North" },
    { id: "south", label: "South" },
    { id: "east", label: "East" },
    { id: "west", label: "West" },
  ],
  series: [
    { id: "completed", label: "Completed", values: [42, 35, 28, 19] },
    { id: "open", label: "Open", values: [8, 0, null, 5] },
  ],
} as const satisfies BarChartSpec;

const proportion = {
  kind: "bar",
  title: "Effort shares by area",
  summary: "Each area's whole divides across reading, writing, and review.",
  variant: "proportion",
  orientation: "horizontal",
  categories: [
    { id: "docs", label: "Docs" },
    { id: "code", label: "Code" },
    { id: "tests", label: "Tests" },
  ],
  series: [
    { id: "read", label: "Read", values: [6, 2, 3] },
    { id: "write", label: "Write", values: [3, 6, 5] },
    { id: "review", label: "Review", values: [1, 4, 2] },
  ],
} as const satisfies BarChartSpec;

const longText = {
  kind: "bar",
  title: "Compare multilingual reference counts",
  summary:
    "Latin, 中文, العربية, and combining café labels stay legible in the horizontal form.",
  orientation: "horizontal",
  categories: [
    { id: "zh", label: "中文参考资料集" },
    { id: "ar", label: "مراجع العربية" },
    { id: "fr", label: "Références café" },
  ],
  series: [
    { id: "count", label: "References", values: [14, 9, 11] },
  ],
} as const satisfies BarChartSpec;

const maximumDensity = {
  kind: "bar",
  title: "Coordinate a bounded six-series comparison",
  summary:
    "Six series across twelve categories exercise every palette slot at the density ceiling.",
  categories: Array.from({ length: 12 }, (_, index) => ({
    id: `c${index + 1}`,
    label: `C${index + 1}`,
  })),
  series: Array.from({ length: 6 }, (_, seriesIndex) => ({
    id: `s${seriesIndex + 1}`,
    label: `Series ${seriesIndex + 1}`,
    values: Array.from(
      { length: 12 },
      (_, categoryIndex) => 20 + seriesIndex * 7 + categoryIndex * 3,
    ),
  })),
} satisfies BarChartSpec;

const quantizationEdge = {
  kind: "bar",
  title: "Quantization edges stay exact",
  summary:
    "Fractional accumulation artifacts and tick boundaries keep exact labels.",
  categories: [
    { id: "jan", label: "Jan" },
    { id: "feb", label: "Feb" },
    { id: "mar", label: "Mar" },
    { id: "apr", label: "Apr" },
    { id: "may", label: "May" },
  ],
  series: [
    {
      id: "share",
      label: "Share",
      values: [0.1, 0.2, 0.30000000000000004, 0.25, 0.7],
    },
  ],
} as const satisfies BarChartSpec;

const formatterTable = {
  kind: "bar",
  title: "Throughput by pipeline",
  summary: "Requests per day, labelled through the compact SI format.",
  value: { label: "Requests", format: { kind: "si", decimals: 1 } },
  categories: [
    { id: "ingest", label: "Ingest" },
    { id: "transform", label: "Transform" },
    { id: "publish", label: "Publish" },
  ],
  series: [
    { id: "requests", label: "Requests", values: [12_500, 8_400, 24_000] },
  ],
} as const satisfies BarChartSpec;

/** Package-owned Bar corpus; every projection derives from these specs. */
export const releaseCorpus = defineChartKindReleaseCorpus(
  {
    kind: "bar",
    cases: [
      { name: "minimum", postures: ["minimal"], spec: minimum },
      {
        name: "regions",
        postures: ["representative"],
        spec: representative,
      },
      {
        name: "proportion-horizontal",
        postures: ["structural"],
        spec: proportion,
      },
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
          values: [index + 1, index + 2],
        })),
      },
    },
    invalid: [
      {
        name: "negative-value",
        code: "chart/negative-value",
        spec: {
          ...minimum,
          series: [{ id: "total", label: "Total", values: [12, -4] }],
        },
      },
      {
        name: "proportion-gap",
        code: "chart/proportion-gap",
        spec: {
          ...proportion,
          series: [
            { id: "read", label: "Read", values: [6, null, 3] },
            { id: "write", label: "Write", values: [3, 6, 5] },
            { id: "review", label: "Review", values: [1, 4, 2] },
          ],
        },
      },
      {
        name: "zero-total-category",
        code: "chart/zero-total",
        spec: {
          ...proportion,
          series: [
            { id: "read", label: "Read", values: [6, 0, 3] },
            { id: "write", label: "Write", values: [3, 0, 5] },
            { id: "review", label: "Review", values: [1, 0, 2] },
          ],
        },
      },
      {
        name: "duplicate-identity",
        code: "chart/duplicate-id",
        spec: {
          ...minimum,
          series: [{ id: "before", label: "Total", values: [12, 18] }],
        },
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
      {
        name: "all-zero",
        code: "chart/degenerate-domain",
        spec: {
          ...minimum,
          series: [{ id: "total", label: "Total", values: [0, 0] }],
        },
      },
      {
        name: "loose-format",
        code: "chart/invalid-spec",
        spec: {
          ...minimum,
          value: { format: { kind: "decimal", decimals: 99 } },
        },
      },
    ],
  } as const,
);

const fixtures = chartReleaseFixtures(releaseCorpus);

export default fixtures;
