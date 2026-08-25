/** Stable, colour-independent structural description for line charts. */

import {
  chartNumberText,
  chartUnitSuffix,
  chartValueText,
} from "../../value-text.ts";
import type { ChartNumberFormat } from "../../format.ts";
import type {
  ValidatedLineChart,
  ValidatedLineChartDomain,
  ValidatedLineChartValueAxis,
} from "./line.spec.ts";

/** The exact unit suffix every line surface appends to a stated value. */
export function lineUnitSuffix(value: ValidatedLineChartValueAxis): string {
  return chartUnitSuffix(value);
}

/**
 * Render one line cell exactly as every surface prints it: the canonical
 * shortest decimal with the authored unit, or the declared-gap wording.
 */
export function lineValueText(
  value: number | null,
  unitSuffix: string,
  format?: ChartNumberFormat,
): string {
  return chartValueText(value, unitSuffix, format);
}

/**
 * The exact text every surface prints for one ordered domain position: the
 * authored ISO date, or the canonical shortest decimal of the number.
 */
export function lineDomainText(
  x: ValidatedLineChartDomain,
  index: number,
): string {
  const value = x.values[index];
  if (value === undefined) {
    throw new TypeError(`line domain has no position ${index}`);
  }
  return typeof value === "string"
    ? value
    : chartNumberText(value, x.kind === "number" ? x.format : undefined);
}

function domainHeader(x: ValidatedLineChartDomain): string {
  if (x.label !== undefined) return x.label;
  return x.kind === "date" ? "Date" : "X";
}

/**
 * The universal data-table facts every terminal projection renders: one
 * domain-position row of exact value texts beneath the series-labelled
 * columns, matching the description's data lines one to one.
 */
export function lineDataTableFacts(spec: ValidatedLineChart): {
  readonly columns: readonly {
    readonly header: string;
    readonly numeric: boolean;
  }[];
  readonly rows: readonly (readonly string[])[];
} {
  const unit = lineUnitSuffix(spec.value);
  return {
    columns: [
      { header: domainHeader(spec.x), numeric: spec.x.kind === "number" },
      ...spec.series.map((series) => ({ header: series.label, numeric: true })),
    ],
    rows: Array.from({ length: spec.x.values.length }, (_, index) => [
      lineDomainText(spec.x, index),
      ...spec.series.map((series) =>
        lineValueText(
          series.values[index] ?? null,
          unit,
          spec.value.format,
        )
      ),
    ]),
  };
}

/** Describe every accessible fact and the data table in authored order. */
export default function describeLineChart(spec: ValidatedLineChart): string {
  const unit = lineUnitSuffix(spec.value);
  const axisName = spec.value.label === undefined
    ? "Value axis"
    : `Value axis (${spec.value.label})`;
  const lines = [
    `Title: ${spec.title}`,
    `Summary: ${spec.summary}`,
    `Variant: ${spec.variant} over ${
      spec.x.kind === "date" ? "date" : "numeric"
    } domain`,
    `${axisName}: ${spec.value.scale} scale from ${
      chartNumberText(spec.minimumValue, spec.value.format)
    } to ${chartNumberText(spec.maximumValue, spec.value.format)}${unit}.`,
    `Series (${spec.series.length}):`,
  ];
  spec.series.forEach((series, index) => {
    lines.push(`${index + 1}. ${series.label} (${series.id})`);
  });
  const pointCount = spec.x.values.length;
  lines.push(`Data (${pointCount} points):`);
  for (let index = 0; index < pointCount; index += 1) {
    const cells = spec.series.map((series) =>
      `${series.label} ${
        lineValueText(
          series.values[index] ?? null,
          unit,
          spec.value.format,
        )
      }`
    );
    lines.push(`${lineDomainText(spec.x, index)}: ${cells.join(", ")}`);
  }

  let largest: { value: number; series: string; position: string } | undefined;
  let smallest:
    | { value: number; series: string; position: string }
    | undefined;
  spec.series.forEach((series) => {
    series.values.forEach((value, index) => {
      if (value === null || value === undefined) return;
      const record = {
        value,
        series: series.label,
        position: lineDomainText(spec.x, index),
      };
      if (largest === undefined || value > largest.value) largest = record;
      if (smallest === undefined || value < smallest.value) smallest = record;
    });
  });
  if (largest !== undefined && smallest !== undefined) {
    lines.push(
      `Largest value: ${
        chartNumberText(largest.value, spec.value.format)
      }${unit} (${largest.series} at ${largest.position}).`,
      `Smallest stated value: ${
        chartNumberText(smallest.value, spec.value.format)
      }${unit} (${smallest.series} at ${smallest.position}).`,
    );
  }
  return `${lines.join("\n")}\n`;
}
