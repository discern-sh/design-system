/** Stable, colour-independent structural description for distribution charts. */

import {
  alignChartDecimals,
  chartDecimalFromNumber,
  normalizeChartDecimal,
  renderChartDecimal,
} from "../../decimal.ts";
import { chartPlainValue as plain, chartUnitSuffix } from "../../value-text.ts";
import type {
  DistributionChartValueAxisSpec,
  ValidatedDistributionBin,
  ValidatedDistributionBoxChart,
  ValidatedDistributionChart,
  ValidatedDistributionHistogramChart,
} from "./distribution.spec.ts";

/** The exact unit suffix every distribution surface appends to a value. */
export function distributionUnitSuffix(
  value: DistributionChartValueAxisSpec,
): string {
  return chartUnitSuffix(value);
}

/**
 * The one shared bin-range text: exact shortest decimals joined by a dash.
 * The en dash default is the canonical form validated bins record as their
 * label; the ASCII terminal repertoire passes `"-"` instead, changing only
 * the renderer-owned dash and never a digit.
 */
export function distributionRangeText(
  start: number,
  end: number,
  dash = "–",
): string {
  return `${plain(start)}${dash}${plain(end)}`;
}

/** One bin's count exactly as every surface prints it: `12 values` style. */
export function distributionCountText(count: number): string {
  return count === 1 ? "1 value" : `${plain(count)} values`;
}

/**
 * Exact difference of two recorded numbers in decimal space, so derived
 * spans such as the interquartile range never print a floating-point
 * artifact.
 */
function exactDifference(left: number, right: number): string {
  const aligned = alignChartDecimals(
    chartDecimalFromNumber(left, "distribution difference"),
    chartDecimalFromNumber(right, "distribution difference"),
  );
  return renderChartDecimal(normalizeChartDecimal({
    coefficient: aligned.left - aligned.right,
    exponent: aligned.exponent,
  }));
}

function axisName(spec: ValidatedDistributionChart): string {
  return spec.value.label === undefined
    ? "Value axis"
    : `Value axis (${spec.value.label})`;
}

/** The bin with the highest count; ties resolve to the earliest bin. */
function largestBin(
  bins: readonly ValidatedDistributionBin[],
): ValidatedDistributionBin | undefined {
  let largest: ValidatedDistributionBin | undefined;
  for (const bin of bins) {
    if (largest === undefined || bin.count > largest.count) largest = bin;
  }
  return largest;
}

function histogramLines(
  spec: ValidatedDistributionHistogramChart,
): readonly string[] {
  const unit = distributionUnitSuffix(spec.value);
  const first = spec.bins[0];
  const last = spec.bins[spec.bins.length - 1];
  if (first === undefined || last === undefined) {
    throw new TypeError("a validated histogram states at least one bin");
  }
  const lines = [
    `Variant: histogram of ${distributionCountText(spec.values.length)}`,
    `${axisName(spec)}: linear scale from ${plain(first.start)}${unit} to ${
      plain(last.end)
    }${unit}.`,
    `Bins (${spec.bins.length}): ${
      spec.binsRule === "edges"
        ? "author-declared edges"
        : "Sturges rule over nice-step edges"
    }.`,
    `Data (${spec.bins.length} bins):`,
    ...spec.bins.map((bin) =>
      `${bin.label}${unit}: ${distributionCountText(bin.count)}`
    ),
  ];
  const modal = largestBin(spec.bins);
  if (modal !== undefined) {
    lines.push(
      `Largest bin: ${modal.label}${unit} (${
        distributionCountText(modal.count)
      }).`,
    );
  }
  const empty = spec.bins.filter((bin) => bin.count === 0).length;
  if (empty > 0) {
    lines.push(`Empty bins: ${plain(empty)}.`);
  }
  return lines;
}

function boxLines(spec: ValidatedDistributionBoxChart): readonly string[] {
  const unit = distributionUnitSuffix(spec.value);
  const five = spec.fiveNumberSummary;
  return [
    `Variant: box summary of ${distributionCountText(spec.values.length)}`,
    `${axisName(spec)}: linear scale from ${plain(five.minimum)}${unit} to ${
      plain(five.maximum)
    }${unit}.`,
    "Data (5 numbers):",
    `Minimum: ${plain(five.minimum)}${unit}`,
    `Lower quartile: ${plain(five.lowerQuartile)}${unit}`,
    `Median: ${plain(five.median)}${unit}`,
    `Upper quartile: ${plain(five.upperQuartile)}${unit}`,
    `Maximum: ${plain(five.maximum)}${unit}`,
    `Interquartile range: ${
      exactDifference(five.upperQuartile, five.lowerQuartile)
    }${unit}.`,
  ];
}

/** Describe every accessible fact and the data lines in bin or stat order. */
export default function describeDistributionChart(
  spec: ValidatedDistributionChart,
): string {
  const lines = [
    `Title: ${spec.title}`,
    `Summary: ${spec.summary}`,
    ...(spec.variant === "histogram" ? histogramLines(spec) : boxLines(spec)),
  ];
  return `${lines.join("\n")}\n`;
}

/**
 * The description's data lines as table facts, one row per data line in the
 * same order: `Range | Count` for every histogram bin, `Statistic | Value`
 * for the five box numbers.
 */
export function distributionDataTableFacts(
  spec: ValidatedDistributionChart,
): {
  readonly columns: readonly {
    readonly header: string;
    readonly numeric: boolean;
  }[];
  readonly rows: readonly (readonly string[])[];
} {
  const unit = distributionUnitSuffix(spec.value);
  if (spec.variant === "histogram") {
    return {
      columns: [
        { header: "Range", numeric: false },
        { header: "Count", numeric: true },
      ],
      rows: spec.bins.map((bin) => [`${bin.label}${unit}`, plain(bin.count)]),
    };
  }
  const five = spec.fiveNumberSummary;
  return {
    columns: [
      { header: "Statistic", numeric: false },
      { header: "Value", numeric: true },
    ],
    rows: [
      ["Minimum", `${plain(five.minimum)}${unit}`],
      ["Lower quartile", `${plain(five.lowerQuartile)}${unit}`],
      ["Median", `${plain(five.median)}${unit}`],
      ["Upper quartile", `${plain(five.upperQuartile)}${unit}`],
      ["Maximum", `${plain(five.maximum)}${unit}`],
    ],
  };
}
