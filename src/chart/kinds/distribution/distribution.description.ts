/** Stable, colour-independent structural description for distribution charts. */

import {
  chartDecimalFromNumber,
  renderChartDecimal,
  subtractChartDecimals,
} from "../../decimal.ts";
import {
  chartNumberText,
  chartPlainValue as plain,
  chartUnitSuffix,
  chartValueText,
} from "../../value-text.ts";
import { type ChartNumberFormat, formatChartDecimal } from "../../format.ts";
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
  format?: ChartNumberFormat,
): string {
  return `${chartNumberText(start, format)}${dash}${
    chartNumberText(end, format)
  }`;
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
function exactDifference(
  left: number,
  right: number,
  format?: ChartNumberFormat,
): string {
  const difference = subtractChartDecimals(
    chartDecimalFromNumber(left, "distribution difference"),
    chartDecimalFromNumber(right, "distribution difference"),
  );
  return format === undefined
    ? renderChartDecimal(difference)
    : formatChartDecimal(difference, format);
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
    `${axisName(spec)}: linear scale from ${
      chartNumberText(first.start, spec.value.format)
    }${unit} to ${chartNumberText(last.end, spec.value.format)}${unit}.`,
    ...recordedValueLines(spec),
    `Bins (${spec.bins.length}):`,
    `Source: ${
      spec.binsRule === "edges"
        ? "author-declared edges"
        : "Sturges rule over nice-step edges"
    }.`,
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
    `${axisName(spec)}: linear scale from ${
      chartNumberText(five.minimum, spec.value.format)
    }${unit} to ${chartNumberText(five.maximum, spec.value.format)}${unit}.`,
    ...recordedValueLines(spec),
    "Five-number summary (5):",
    `Minimum: ${chartNumberText(five.minimum, spec.value.format)}${unit}`,
    `Lower quartile: ${
      chartNumberText(five.lowerQuartile, spec.value.format)
    }${unit}`,
    `Median: ${chartNumberText(five.median, spec.value.format)}${unit}`,
    `Upper quartile: ${
      chartNumberText(five.upperQuartile, spec.value.format)
    }${unit}`,
    `Maximum: ${chartNumberText(five.maximum, spec.value.format)}${unit}`,
    `Interquartile range: ${
      exactDifference(
        five.upperQuartile,
        five.lowerQuartile,
        spec.value.format,
      )
    }${unit}.`,
  ];
}

/** Indexed recorded values in authored order, shared by prose and tables. */
export function distributionRecordedValueRows(
  spec: ValidatedDistributionChart,
): readonly (readonly [string, string])[] {
  const unit = distributionUnitSuffix(spec.value);
  return Object.freeze(spec.authoredValues.map((value, index) =>
    Object.freeze(
      [
        String(index + 1),
        chartValueText(value, unit, spec.value.format),
      ] as const,
    )
  ));
}

function recordedValueLines(
  spec: ValidatedDistributionChart,
): readonly string[] {
  return [
    `Data (${spec.authoredValues.length} recorded values, authored order):`,
    ...distributionRecordedValueRows(spec).map(([index, value]) =>
      `${index}: ${value}`
    ),
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
 * The description's lossless data lines as table facts: one indexed row per
 * recorded value in authored order. Derived bins and summary statistics stay
 * in their own description sections instead of replacing source facts.
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
  return {
    columns: [
      { header: "#", numeric: true },
      { header: "Value", numeric: true },
    ],
    rows: distributionRecordedValueRows(spec),
  };
}
