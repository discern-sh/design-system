/** Canonical product-neutral Slope release evidence. */

import {
  chartReleaseFixtures,
  defineChartKindReleaseCorpus,
} from "../../kind-meta.ts";
import type { SlopeChartSpec } from "./slope.spec.ts";

const minimum = {
  kind: "slope",
  title: "Compare two movements",
  summary: "Two measured items move between the default endpoints.",
  items: [
    { id: "first", label: "First", before: 12, after: 18 },
    { id: "second", label: "Second", before: 20, after: 14 },
  ],
} as const satisfies SlopeChartSpec;

/**
 * The semantic-roles posture rides here: every slope line shares the single
 * first series slot, and the up, down, and level direction triad carries the
 * movement vocabulary instead of categorical colour.
 */
const representative = {
  kind: "slope",
  title: "Reviews per team across the process change",
  summary:
    "Weekly reviews per team before and after the process change; one team held level.",
  value: { label: "Reviews", unit: "reviews" },
  items: [
    { id: "intake", label: "Intake", before: 12, after: 18 },
    { id: "triage", label: "Triage", before: 24, after: 24 },
    { id: "review", label: "Review", before: 30, after: 21 },
    { id: "docs", label: "Docs", before: 6, after: 9 },
    { id: "release", label: "Release", before: 18, after: 12 },
  ],
} as const satisfies SlopeChartSpec;

const negatives = {
  kind: "slope",
  title: "Net queue balance across the rebalance",
  summary:
    "Signed net balances before and after the rebalance; position encodes the value, so negatives stay honest.",
  endpoints: { before: "Start", after: "Finish" },
  items: [
    { id: "intake", label: "Intake", before: -8, after: 5 },
    { id: "holdover", label: "Holdover", before: 2, after: -4 },
    { id: "reserve", label: "Reserve", before: 8, after: 8 },
  ],
} as const satisfies SlopeChartSpec;

const longText = {
  kind: "slope",
  title: "Compare long-named rotations",
  summary:
    "Budget-length item labels and endpoint names stay legible beside the plot.",
  endpoints: { before: "Previous quarter", after: "Current quarter" },
  items: [
    {
      id: "ci",
      label: "Continuous integration pipeline",
      before: 14,
      after: 9,
    },
    {
      id: "docs",
      label: "Documentation review rotation",
      before: 6,
      after: 11,
    },
  ],
} as const satisfies SlopeChartSpec;

const maximumDensity = {
  kind: "slope",
  title: "Coordinate twelve movements at the ceiling",
  summary:
    "Twelve items cross between the endpoints at the direct-label density ceiling.",
  items: Array.from({ length: 12 }, (_, index) => ({
    id: `team-${index + 1}`,
    label: `Team ${index + 1}`,
    before: (index + 1) * 5,
    after: (12 - index) * 5,
  })),
} satisfies SlopeChartSpec;

const quantizationEdge = {
  kind: "slope",
  title: "Fractional deltas stay exact",
  summary:
    "Deltas over tenth-scale inputs compute in decimal space, never as floating subtraction.",
  items: [
    { id: "one", label: "One", before: 0.1, after: 0.3 },
    { id: "two", label: "Two", before: 1.05, after: 1.25 },
    { id: "three", label: "Three", before: 0.7, after: 0.1 },
  ],
} as const satisfies SlopeChartSpec;

const formatterTable = {
  kind: "slope",
  title: "Throughput by pipeline across the upgrade",
  summary:
    "Requests per day before and after the upgrade, labelled through the compact SI format.",
  value: { label: "Requests", format: { kind: "si", decimals: 1 } },
  items: [
    { id: "ingest", label: "Ingest", before: 12_500, after: 15_000 },
    { id: "transform", label: "Transform", before: 8_400, after: 8_400 },
    { id: "publish", label: "Publish", before: 24_000, after: 18_000 },
  ],
} as const satisfies SlopeChartSpec;

/** Package-owned Slope corpus; every projection derives from these specs. */
export const releaseCorpus = defineChartKindReleaseCorpus(
  {
    kind: "slope",
    cases: [
      { name: "minimum", postures: ["minimal"], spec: minimum },
      {
        name: "teams",
        postures: ["representative", "semantic-roles"],
        spec: representative,
      },
      { name: "negative-balances", postures: ["structural"], spec: negatives },
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
      dimension: "items",
      authorAction: "aggregate-categories",
      spec: {
        ...minimum,
        items: Array.from({ length: 13 }, (_, index) => ({
          id: `team-${index + 1}`,
          label: `Team ${index + 1}`,
          before: (index + 1) * 2,
          after: (index + 1) * 2 + 1,
        })),
      },
    },
    invalid: [
      {
        name: "duplicate-identity",
        code: "chart/duplicate-id",
        spec: {
          ...minimum,
          items: [
            { id: "first", label: "First", before: 12, after: 18 },
            { id: "first", label: "Second", before: 20, after: 14 },
          ],
        },
      },
      {
        name: "single-item",
        code: "chart/invalid-spec",
        spec: {
          ...minimum,
          items: [{ id: "only", label: "Only", before: 12, after: 18 }],
        },
      },
      {
        name: "non-finite-value",
        code: "chart/invalid-spec",
        spec: {
          ...minimum,
          items: [
            { id: "first", label: "First", before: 12, after: Infinity },
            { id: "second", label: "Second", before: 20, after: 14 },
          ],
        },
      },
      {
        name: "bidi-label",
        code: "chart/invalid-text",
        spec: {
          ...minimum,
          items: [
            { id: "first", label: "Unsafe\u202Elabel", before: 12, after: 18 },
            { id: "second", label: "Second", before: 20, after: 14 },
          ],
        },
      },
      {
        name: "unexpected-renderer-field",
        code: "chart/invalid-spec",
        spec: { ...minimum, renderer: "host" },
      },
      {
        name: "magnitude-span-blowout",
        code: "chart/budget/valueMagnitudeSpan",
        spec: {
          ...minimum,
          items: [
            { id: "small", label: "Small", before: 1, after: 2 },
            { id: "large", label: "Large", before: 50_000, after: 100_000 },
          ],
        },
      },
    ],
  } as const,
);

const fixtures = chartReleaseFixtures(releaseCorpus);

export default fixtures;
