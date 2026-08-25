/** Stable, colour-independent structural description for bar charts. */

import {
  chartNumberText,
  chartUnitSuffix,
  chartValueText,
} from "../../value-text.ts";
import type { ChartNumberFormat } from "../../format.ts";
import type { BarChartValueAxisSpec, ValidatedBarChart } from "./bar.spec.ts";

/** The exact unit suffix every bar surface appends to a stated value. */
export function barUnitSuffix(value: BarChartValueAxisSpec): string {
  return chartUnitSuffix(value);
}

/**
 * Render one bar cell exactly as every surface prints it: the canonical
 * shortest decimal with the authored unit, or the declared-gap wording.
 */
export function barValueText(
  value: number | null,
  unitSuffix: string,
  format?: ChartNumberFormat,
): string {
  return chartValueText(value, unitSuffix, format);
}

/**
 * The universal data-table facts every terminal projection renders: one
 * category row of exact value texts beneath the series-labelled columns.
 */
export function barDataTableFacts(spec: ValidatedBarChart): {
  readonly columns: readonly {
    readonly header: string;
    readonly numeric: boolean;
  }[];
  readonly rows: readonly (readonly string[])[];
} {
  const unit = barUnitSuffix(spec.value);
  return {
    columns: [
      { header: "Category", numeric: false },
      ...spec.series.map((series) => ({ header: series.label, numeric: true })),
    ],
    rows: spec.categories.map((category, index) => [
      `${category.label} (${category.id})`,
      ...spec.series.map((series) =>
        barValueText(series.values[index] ?? null, unit, spec.value.format)
      ),
    ]),
  };
}

/** Describe every accessible fact and the data table in authored order. */
export default function describeBarChart(spec: ValidatedBarChart): string {
  const unit = barUnitSuffix(spec.value);
  const axisName = spec.value.label === undefined
    ? "Value axis"
    : `Value axis (${spec.value.label})`;
  const lines = [
    `Title: ${spec.title}`,
    `Summary: ${spec.summary}`,
    `Variant: ${
      spec.variant === "proportion"
        ? "proportion of each category's whole"
        : "grouped comparison"
    }`,
    `${axisName}: linear scale from ${
      chartNumberText(0, spec.value.format)
    } to ${chartNumberText(spec.maximumValue, spec.value.format)}${unit}.`,
    `Series (${spec.series.length}):`,
  ];
  spec.series.forEach((series, index) => {
    lines.push(`${index + 1}. ${series.label} (${series.id})`);
  });
  lines.push(`Data (${spec.categories.length} categories):`);
  spec.categories.forEach((category, categoryIndex) => {
    const cells = spec.series.map((series) =>
      `${series.label} ${
        barValueText(
          series.values[categoryIndex] ?? null,
          unit,
          spec.value.format,
        )
      }`
    );
    lines.push(`${category.label} (${category.id}): ${cells.join(", ")}`);
  });

  let largest: { value: number; series: string; category: string } | undefined;
  let smallest:
    | { value: number; series: string; category: string }
    | undefined;
  spec.series.forEach((series) => {
    series.values.forEach((value, categoryIndex) => {
      if (value === null || value === undefined) return;
      const category = spec.categories[categoryIndex];
      if (category === undefined) return;
      const record = { value, series: series.label, category: category.label };
      if (largest === undefined || value > largest.value) largest = record;
      if (smallest === undefined || value < smallest.value) smallest = record;
    });
  });
  if (largest !== undefined && smallest !== undefined) {
    lines.push(
      `Largest value: ${
        chartNumberText(largest.value, spec.value.format)
      }${unit} (${largest.series} in ${largest.category}).`,
      `Smallest stated value: ${
        chartNumberText(smallest.value, spec.value.format)
      }${unit} (${smallest.series} in ${smallest.category}).`,
    );
  }
  return `${lines.join("\n")}\n`;
}
