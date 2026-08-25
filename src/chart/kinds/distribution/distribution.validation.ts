/** Complete semantic preflight for distribution charts. */

import {
  alignChartDecimals,
  type ChartDecimal,
  chartDecimalFromNumber,
  chartDecimalToNumber,
  compareChartDecimals,
} from "../../decimal.ts";
import { ChartValidationError } from "../../errors.ts";
import type { ChartNumberFormat } from "../../format.ts";
import { chartLinearTicks } from "../../ticks.ts";
import {
  assertChartExactKeys,
  assertChartKindBudget,
  chartGraphemeCount,
  chartOneOf,
  isChartRecord,
  validateChartCommonSpec,
  validateChartValueAxis,
} from "../../validation.ts";
import { distributionRangeText } from "./distribution.description.ts";
import meta from "./distribution.meta.ts";
import type {
  DistributionChartVariant,
  DistributionFiveNumberSummary,
  ValidatedDistributionBin,
  ValidatedDistributionChart,
} from "./distribution.spec.ts";

const VARIANTS: readonly DistributionChartVariant[] = ["histogram", "box"];

/**
 * Five-number floor: Tukey hinges need two two-value halves so each
 * quartile is a real interior statistic instead of restating an extreme.
 */
const BOX_MINIMUM_VALUES = 4;

/** A histogram needs two values before spread exists to bin. */
const HISTOGRAM_MINIMUM_VALUES = 2;

function invalid(
  code: "chart/invalid-spec" | "chart/bin-edges" | "chart/degenerate-domain",
  message: string,
  path: string,
  remedy: string,
  facts: Readonly<Record<string, string | number | boolean>> = {},
): never {
  throw new ChartValidationError({ code, message, path, remedy, facts });
}

function decimal(value: number): ChartDecimal {
  return chartDecimalFromNumber(value, "distribution value");
}

/**
 * Exact mean of two recorded values: align both decimals, sum the integer
 * coefficients, and halve. When the sum is odd, one extra decimal digit
 * makes the mean exact — `(a + b) / 2 = (a + b) × 5 / 10` — so a quartile
 * never carries a floating-point artifact.
 */
function exactMeanOfTwo(left: number, right: number): number {
  const aligned = alignChartDecimals(decimal(left), decimal(right));
  const sum = aligned.left + aligned.right;
  return chartDecimalToNumber(
    sum % 2n === 0n
      ? { coefficient: sum / 2n, exponent: aligned.exponent }
      : { coefficient: sum * 5n, exponent: aligned.exponent - 1 },
  );
}

/** Median of a sorted sample: the middle value, or the exact mean of the two middles. */
function medianOf(sorted: readonly number[]): number {
  const length = sorted.length;
  const lowerMiddle = sorted[Math.ceil(length / 2) - 1];
  const upperMiddle = sorted[Math.floor(length / 2)];
  if (lowerMiddle === undefined || upperMiddle === undefined) {
    throw new TypeError("distribution median needs a non-empty sample");
  }
  return length % 2 === 1
    ? lowerMiddle
    : exactMeanOfTwo(lowerMiddle, upperMiddle);
}

/**
 * The pinned Tukey five-number summary: quartiles are the medians of the
 * lower and upper halves, each half including the middle value when the
 * sample count is odd. Two-value medians compute exactly in decimal space.
 */
function fiveNumberSummary(
  sorted: readonly number[],
): DistributionFiveNumberSummary {
  const length = sorted.length;
  const minimum = sorted[0];
  const maximum = sorted[length - 1];
  if (minimum === undefined || maximum === undefined) {
    throw new TypeError("distribution summary needs a non-empty sample");
  }
  const half = Math.floor(length / 2);
  const lower = sorted.slice(0, length % 2 === 0 ? half : half + 1);
  const upper = sorted.slice(half);
  return Object.freeze({
    minimum,
    lowerQuartile: medianOf(lower),
    median: medianOf(sorted),
    upperQuartile: medianOf(upper),
    maximum,
  });
}

/**
 * The pinned Sturges edge rule: the bin count is `ceil(log2(n)) + 1`, and
 * the edges are the nice-step tick values of the shared tick authority over
 * the sample's extremes at a target of `clamp(k + 1, 2, 12)` ticks — an
 * outward-covering, exact-decimal edge set that depends only on the data.
 */
function sturgesEdges(sorted: readonly number[]): readonly number[] {
  const minimum = sorted[0];
  const maximum = sorted[sorted.length - 1];
  if (minimum === undefined || maximum === undefined) {
    throw new TypeError("distribution edges need a non-empty sample");
  }
  const binCount = Math.ceil(Math.log2(sorted.length)) + 1;
  const set = chartLinearTicks({
    minimum,
    maximum,
    targetCount: Math.min(12, Math.max(2, binCount + 1)),
    subject: "Distribution bin edges",
  });
  return set.ticks.map((tick) => tick.number);
}

/**
 * Assign sorted values to bins by exact decimal comparison: each bin is
 * half-open `[start, end)` and the final bin closes at its end, so a value
 * exactly on an inner edge lands deterministically in the upper bin and the
 * maximum lands in the last bin.
 */
function binCounts(
  sorted: readonly number[],
  edges: readonly number[],
): readonly number[] {
  const edgeDecimals = edges.map(decimal);
  const counts = new Array<number>(edges.length - 1).fill(0);
  for (const value of sorted) {
    const valueDecimal = decimal(value);
    let index = counts.length - 1;
    for (let bin = 0; bin < counts.length - 1; bin += 1) {
      const upperEdge = edgeDecimals[bin + 1];
      if (
        upperEdge !== undefined &&
        compareChartDecimals(valueDecimal, upperEdge) < 0
      ) {
        index = bin;
        break;
      }
    }
    counts[index] = (counts[index] ?? 0) + 1;
  }
  return counts;
}

function validatedBins(
  sorted: readonly number[],
  edges: readonly number[],
  format: ChartNumberFormat | undefined,
): readonly ValidatedDistributionBin[] {
  const counts = binCounts(sorted, edges);
  return Object.freeze(counts.map((count, index) => {
    const start = edges[index];
    const end = edges[index + 1];
    if (start === undefined || end === undefined) {
      throw new TypeError("distribution bins need one more edge than bins");
    }
    return Object.freeze({
      start,
      end,
      count,
      label: distributionRangeText(start, end, "–", format),
    });
  }));
}

/** Read the authored histogram edges, refusing every dishonest edge set. */
function authoredEdges(
  bins: Record<string, unknown>,
  sorted: readonly number[],
): readonly number[] {
  assertChartExactKeys(bins, ["kind", "values"], "spec.bins");
  if (!Array.isArray(bins.values) || bins.values.length < 2) {
    invalid(
      "chart/bin-edges",
      "spec.bins.values must state at least two bin edges.",
      "spec.bins.values",
      "Declare k+1 strictly increasing edges for k bins.",
    );
  }
  const edges = bins.values.map((edge, index) => {
    if (typeof edge !== "number" || !Number.isFinite(edge)) {
      invalid(
        "chart/invalid-spec",
        `spec.bins.values[${index}] must be a finite number.`,
        `spec.bins.values[${index}]`,
        "State every bin edge as a finite number.",
      );
    }
    return edge;
  });
  for (let index = 1; index < edges.length; index += 1) {
    const previous = edges[index - 1];
    const next = edges[index];
    if (
      previous === undefined || next === undefined ||
      compareChartDecimals(decimal(next), decimal(previous)) <= 0
    ) {
      invalid(
        "chart/bin-edges",
        `spec.bins.values must increase strictly; ${next} does not exceed ${previous}.`,
        `spec.bins.values[${index}]`,
        "Author strictly increasing bin edges.",
        { previous: previous ?? "", next: next ?? "" },
      );
    }
  }
  assertChartKindBudget(meta, "bins", edges.length - 1, "spec.bins.values");
  const first = edges[0];
  const last = edges[edges.length - 1];
  const minimum = sorted[0];
  const maximum = sorted[sorted.length - 1];
  if (
    first === undefined || last === undefined || minimum === undefined ||
    maximum === undefined
  ) {
    throw new TypeError("distribution coverage needs edges and values");
  }
  const outside = compareChartDecimals(decimal(minimum), decimal(first)) < 0
    ? minimum
    : compareChartDecimals(decimal(maximum), decimal(last)) > 0
    ? maximum
    : undefined;
  if (outside !== undefined) {
    invalid(
      "chart/bin-edges",
      `Recorded value ${outside} lies outside the declared edges [${first}, ${last}].`,
      "spec.bins.values",
      `Widen the declared edges to cover every recorded value, including ${outside}.`,
      { value: outside, firstEdge: first, lastEdge: last },
    );
  }
  return edges;
}

/** Derive the declared histogram bins from the authored bins declaration. */
function histogramBins(
  bins: unknown,
  sorted: readonly number[],
  format: ChartNumberFormat | undefined,
): {
  readonly binsRule: "edges" | "sturges";
  readonly bins: readonly ValidatedDistributionBin[];
} {
  if (bins === undefined) {
    invalid(
      "chart/invalid-spec",
      "spec.bins is required: a histogram declares its bins — authored edges or a named deterministic rule — so binning is never renderer-adaptive.",
      "spec.bins",
      'Declare bins as { kind: "edges", values: [...] } or { kind: "rule", rule: "sturges" }.',
    );
  }
  if (!isChartRecord(bins)) {
    invalid(
      "chart/invalid-spec",
      "spec.bins must be an object.",
      "spec.bins",
      "Use the documented bins declaration fields.",
    );
  }
  if (bins.kind === "edges") {
    return {
      binsRule: "edges",
      bins: validatedBins(sorted, authoredEdges(bins, sorted), format),
    };
  }
  if (bins.kind === "rule") {
    assertChartExactKeys(bins, ["kind", "rule"], "spec.bins");
    if (bins.rule !== "sturges") {
      invalid(
        "chart/invalid-spec",
        'spec.bins.rule must be the one pinned deterministic rule "sturges".',
        "spec.bins.rule",
        'Name the pinned rule: { kind: "rule", rule: "sturges" }.',
      );
    }
    const edges = sturgesEdges(sorted);
    assertChartKindBudget(meta, "bins", edges.length - 1, "spec.bins");
    return { binsRule: "sturges", bins: validatedBins(sorted, edges, format) };
  }
  invalid(
    "chart/invalid-spec",
    'spec.bins.kind must be "edges" or "rule".',
    "spec.bins.kind",
    "Declare authored edges or the named deterministic rule.",
  );
}

/** Validate all authored semantics before layout sees the distribution chart. */
export default function validateDistributionChart(
  input: unknown,
): ValidatedDistributionChart {
  const spec = validateChartCommonSpec(input, "distribution", [
    "kind",
    "title",
    "summary",
    "variant",
    "values",
    "bins",
    "value",
  ]);
  const variant = chartOneOf(
    spec.variant,
    VARIANTS,
    "histogram",
    "spec.variant",
  );
  if (!Array.isArray(spec.values)) {
    invalid(
      "chart/invalid-spec",
      "spec.values must be an array of recorded measurements.",
      "spec.values",
      "Author the recorded values the figure summarises.",
    );
  }
  const floor = variant === "box"
    ? BOX_MINIMUM_VALUES
    : HISTOGRAM_MINIMUM_VALUES;
  if (spec.values.length < floor) {
    invalid(
      "chart/invalid-spec",
      `spec.values must state at least ${floor} recorded values for a ${variant} figure.`,
      "spec.values",
      variant === "box"
        ? "Record at least four values so each Tukey hinge is a real interior statistic, or state the few values directly."
        : "Record at least two values, or state the single value directly.",
      { count: spec.values.length },
    );
  }
  assertChartKindBudget(meta, "values", spec.values.length, "spec.values");
  const values = spec.values.map((entry, index) => {
    if (typeof entry !== "number" || !Number.isFinite(entry)) {
      invalid(
        "chart/invalid-spec",
        `spec.values[${index}] must be a finite number.`,
        `spec.values[${index}]`,
        "State every recorded measurement as a finite number.",
      );
    }
    return entry;
  });
  const authoredValues = Object.freeze([...values]);
  const sorted = Object.freeze(values.toSorted((left, right) => left - right));
  const minimum = sorted[0];
  const maximum = sorted[sorted.length - 1];
  if (minimum !== undefined && maximum !== undefined && minimum === maximum) {
    invalid(
      "chart/degenerate-domain",
      variant === "histogram"
        ? `Every recorded value equals ${minimum}; a histogram cannot bin a zero-width domain.`
        : `Every recorded value equals ${minimum}; all five summary numbers coincide and the box would draw nothing honest.`,
      "spec.values",
      "Present the repeated measurement as a table or one stated value instead of a distribution figure.",
      { value: minimum },
    );
  }

  const value = validateChartValueAxis(spec.value, "spec.value");
  if (value.label !== undefined) {
    assertChartKindBudget(
      meta,
      "valueLabelGraphemes",
      chartGraphemeCount(value.label),
      "spec.value.label",
    );
  }

  if (variant === "box") {
    if (spec.bins !== undefined) {
      invalid(
        "chart/invalid-spec",
        "spec.bins is refused for the box variant; the box summarises with five numbers, and bins belong to the histogram.",
        "spec.bins",
        "Drop the bins declaration, or chart the bins with the histogram variant.",
      );
    }
    return Object.freeze({
      kind: "distribution",
      title: spec.title,
      summary: spec.summary,
      variant,
      authoredValues,
      values: sorted,
      value,
      fiveNumberSummary: fiveNumberSummary(sorted),
    });
  }

  const derived = histogramBins(spec.bins, sorted, value.format);
  return Object.freeze({
    kind: "distribution",
    title: spec.title,
    summary: spec.summary,
    variant,
    authoredValues,
    values: sorted,
    value,
    binsRule: derived.binsRule,
    bins: derived.bins,
  });
}
