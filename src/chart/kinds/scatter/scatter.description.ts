/** Stable, colour-independent structural description for scatter charts. */

import {
  chartNumberText,
  chartUnitSuffix,
  chartValueText,
} from "../../value-text.ts";
import type {
  ValidatedScatterChart,
  ValidatedScatterChartAxis,
} from "./scatter.spec.ts";

/** One data-table column header with its numeric alignment fact. */
export interface ScatterChartTableColumn {
  readonly header: string;
  readonly numeric: boolean;
}

/** The exact-pair table every scatter surface can rebuild losslessly. */
export interface ScatterChartTableFacts {
  readonly columns: readonly ScatterChartTableColumn[];
  /** One row per authored point, series-major, matching data lines 1:1. */
  readonly rows: readonly (readonly [string, string, string])[];
}

function axisTitle(name: "X" | "Y", axis: ValidatedScatterChartAxis): string {
  return axis.label === undefined
    ? `${name} axis`
    : `${name} axis (${axis.label})`;
}

function pointCountText(count: number): string {
  return count === 1 ? "1 point" : `${count} points`;
}

interface ScatterExtreme {
  readonly value: number;
  readonly series: string;
}

/** First authored occurrence wins a tie, so extremes stay deterministic. */
function extremes(
  spec: ValidatedScatterChart,
  read: (point: { readonly x: number; readonly y: number }) => number,
): { readonly largest: ScatterExtreme; readonly smallest: ScatterExtreme } {
  let largest: ScatterExtreme | undefined;
  let smallest: ScatterExtreme | undefined;
  for (const series of spec.series) {
    for (const point of series.points) {
      const value = read(point);
      if (largest === undefined || value > largest.value) {
        largest = { value, series: series.label };
      }
      if (smallest === undefined || value < smallest.value) {
        smallest = { value, series: series.label };
      }
    }
  }
  if (largest === undefined || smallest === undefined) {
    throw new TypeError("a validated scatter chart states at least one point");
  }
  return { largest, smallest };
}

/**
 * The lossless exact-pair table behind every scatter surface: one row per
 * authored point in authored order, printing the same value texts as the
 * description's data lines.
 */
export function scatterDataTableFacts(
  spec: ValidatedScatterChart,
): ScatterChartTableFacts {
  const xUnit = chartUnitSuffix(spec.x);
  const yUnit = chartUnitSuffix(spec.y);
  return {
    columns: [
      { header: "Series", numeric: false },
      { header: "X", numeric: true },
      { header: "Y", numeric: true },
    ],
    rows: spec.series.flatMap((series) =>
      series.points.map((point) =>
        [
          series.label,
          chartValueText(point.x, xUnit, spec.x.format),
          chartValueText(point.y, yUnit, spec.y.format),
        ] as const
      )
    ),
  };
}

/** Describe every accessible fact and the exact-pair table in authored order. */
export default function describeScatterChart(
  spec: ValidatedScatterChart,
): string {
  const xUnit = chartUnitSuffix(spec.x);
  const yUnit = chartUnitSuffix(spec.y);
  const totalPoints = spec.series.reduce(
    (sum, series) => sum + series.points.length,
    0,
  );
  const lines = [
    `Title: ${spec.title}`,
    `Summary: ${spec.summary}`,
    `${axisTitle("X", spec.x)}: ${spec.x.scale} scale from ${
      chartNumberText(spec.minimumX, spec.x.format)
    } to ${chartNumberText(spec.maximumX, spec.x.format)}${xUnit}.`,
    `${axisTitle("Y", spec.y)}: ${spec.y.scale} scale from ${
      chartNumberText(spec.minimumY, spec.y.format)
    } to ${chartNumberText(spec.maximumY, spec.y.format)}${yUnit}.`,
    `Series (${spec.series.length}):`,
  ];
  spec.series.forEach((series, index) => {
    lines.push(
      `${index + 1}. ${series.label} (${series.id}) — ${
        pointCountText(series.points.length)
      }`,
    );
  });
  lines.push(`Data (${pointCountText(totalPoints)}):`);
  for (const series of spec.series) {
    for (const point of series.points) {
      lines.push(
        `${series.label}: (${chartValueText(point.x, xUnit, spec.x.format)}, ${
          chartValueText(point.y, yUnit, spec.y.format)
        })`,
      );
    }
  }
  const xExtremes = extremes(spec, (point) => point.x);
  const yExtremes = extremes(spec, (point) => point.y);
  lines.push(
    `Largest x: ${
      chartNumberText(xExtremes.largest.value, spec.x.format)
    }${xUnit} (${xExtremes.largest.series}).`,
    `Smallest x: ${
      chartNumberText(xExtremes.smallest.value, spec.x.format)
    }${xUnit} (${xExtremes.smallest.series}).`,
    `Largest y: ${
      chartNumberText(yExtremes.largest.value, spec.y.format)
    }${yUnit} (${yExtremes.largest.series}).`,
    `Smallest y: ${
      chartNumberText(yExtremes.smallest.value, spec.y.format)
    }${yUnit} (${yExtremes.smallest.series}).`,
  );
  return `${lines.join("\n")}\n`;
}
