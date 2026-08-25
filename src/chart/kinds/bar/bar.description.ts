/** Stable, colour-independent structural description for bar charts. */

import { chartDecimalFromNumber, renderChartDecimal } from "../../decimal.ts";
import type { ValidatedBarChart } from "./bar.spec.ts";

function plain(value: number): string {
  return renderChartDecimal(chartDecimalFromNumber(value, "bar value"));
}

/** Describe every accessible fact and the data table in authored order. */
export default function describeBarChart(spec: ValidatedBarChart): string {
  const unit = spec.value.unit === undefined ? "" : ` ${spec.value.unit}`;
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
    `${axisName}: linear scale from 0 to ${plain(spec.maximumValue)}${unit}.`,
    `Series (${spec.series.length}):`,
  ];
  spec.series.forEach((series, index) => {
    lines.push(`${index + 1}. ${series.label} (${series.id})`);
  });
  lines.push(`Data (${spec.categories.length} categories):`);
  spec.categories.forEach((category, categoryIndex) => {
    const cells = spec.series.map((series) => {
      const value = series.values[categoryIndex];
      return value === null || value === undefined
        ? `${series.label} no stated value`
        : `${series.label} ${plain(value)}${unit}`;
    });
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
        plain(largest.value)
      }${unit} (${largest.series} in ${largest.category}).`,
      `Smallest stated value: ${
        plain(smallest.value)
      }${unit} (${smallest.series} in ${smallest.category}).`,
    );
  }
  return `${lines.join("\n")}\n`;
}
