/** Stable, colour-independent structural description for heatmap charts. */

import {
  chartPlainValue as plain,
  chartUnitSuffix,
  chartValueText,
} from "../../value-text.ts";
import type { ChartValueAxisSpec } from "../../spec.ts";
import type {
  ValidatedHeatmapCell,
  ValidatedHeatmapChart,
} from "./heatmap.spec.ts";

/** The exact unit suffix every heatmap surface appends to a stated value. */
export function heatmapUnitSuffix(value: ChartValueAxisSpec): string {
  return chartUnitSuffix(value);
}

/**
 * Render one grid cell exactly as every surface prints it: the canonical
 * shortest decimal with the authored unit, or the declared-gap wording.
 */
export function heatmapValueText(
  value: number | null,
  unitSuffix: string,
): string {
  return chartValueText(value, unitSuffix);
}

/**
 * The one bin-range wording every surface prints for the declared edges.
 * Bins are half-open with each threshold owned by the upper bin, and the
 * labels say so exactly: `below E1`, then `Ei to below Ei+1`, then `Ek and
 * above` — never an integer-style `E1–E2` range that would misstate where
 * fractional values and the thresholds themselves belong.
 */
export function heatmapBinRangeLabels(
  edges: readonly number[],
  unitSuffix: string,
): readonly string[] {
  const first = edges[0];
  const last = edges[edges.length - 1];
  if (first === undefined || last === undefined) {
    throw new TypeError(
      "heatmap bin edges must declare at least one threshold",
    );
  }
  const labels = [`below ${plain(first)}${unitSuffix}`];
  for (let index = 1; index < edges.length; index += 1) {
    const lower = edges[index - 1];
    const upper = edges[index];
    if (lower === undefined || upper === undefined) {
      throw new TypeError("heatmap bin edges are missing a threshold");
    }
    labels.push(
      `${plain(lower)}${unitSuffix} to below ${plain(upper)}${unitSuffix}`,
    );
  }
  labels.push(`${plain(last)}${unitSuffix} and above`);
  return Object.freeze(labels);
}

/** Read one validated cell by grid position from the row-major cells. */
export function heatmapCellAt(
  spec: ValidatedHeatmapChart,
  rowIndex: number,
  columnIndex: number,
): ValidatedHeatmapCell {
  const cell = spec.cells[rowIndex * spec.columns.length + columnIndex];
  if (cell === undefined) {
    throw new TypeError(
      `heatmap cell ${rowIndex},${columnIndex} lies outside the validated grid`,
    );
  }
  return cell;
}

interface HeatmapExtremeCell {
  readonly value: number;
  readonly row: string;
  readonly column: string;
}

/**
 * The two extreme annotations every surface prints verbatim: the largest and
 * smallest stated values with their row and column. Empty only for a grid
 * with no stated value, which validation refuses before any surface runs.
 */
export function heatmapExtremeLines(
  spec: ValidatedHeatmapChart,
): readonly string[] {
  const unit = heatmapUnitSuffix(spec.value);
  let largest: HeatmapExtremeCell | undefined;
  let smallest: HeatmapExtremeCell | undefined;
  spec.cells.forEach((cell, index) => {
    if (cell.value === null) return;
    const row = spec.rows[Math.floor(index / spec.columns.length)];
    const column = spec.columns[index % spec.columns.length];
    if (row === undefined || column === undefined) return;
    const record = { value: cell.value, row: row.label, column: column.label };
    if (largest === undefined || cell.value > largest.value) largest = record;
    if (smallest === undefined || cell.value < smallest.value) {
      smallest = record;
    }
  });
  if (largest === undefined || smallest === undefined) {
    return Object.freeze([]);
  }
  return Object.freeze([
    `Largest value: ${
      plain(largest.value)
    }${unit} (${largest.row}, ${largest.column}).`,
    `Smallest stated value: ${
      plain(smallest.value)
    }${unit} (${smallest.row}, ${smallest.column}).`,
  ]);
}

/**
 * The universal data-table facts every terminal projection renders: one grid
 * row of exact value texts beneath the column-labelled headers, matching the
 * description's data lines 1:1.
 */
export function heatmapDataTableFacts(spec: ValidatedHeatmapChart): {
  readonly columns: readonly {
    readonly header: string;
    readonly numeric: boolean;
  }[];
  readonly rows: readonly (readonly string[])[];
} {
  const unit = heatmapUnitSuffix(spec.value);
  return {
    columns: [
      { header: "Row", numeric: false },
      ...spec.columns.map((column) => ({
        header: column.label,
        numeric: true,
      })),
    ],
    rows: spec.rows.map((row, rowIndex) => [
      `${row.label} (${row.id})`,
      ...spec.columns.map((_column, columnIndex) =>
        heatmapValueText(heatmapCellAt(spec, rowIndex, columnIndex).value, unit)
      ),
    ]),
  };
}

function counted(count: number, word: string): string {
  return `${count} ${count === 1 ? word : `${word}s`}`;
}

/** Describe every accessible fact and the data table in authored order. */
export default function describeHeatmapChart(
  spec: ValidatedHeatmapChart,
): string {
  const unit = heatmapUnitSuffix(spec.value);
  const binsHeader = spec.value.label === undefined
    ? `Bins (${spec.binRangeLabels.length})`
    : `Bins (${spec.binRangeLabels.length}, ${spec.value.label})`;
  const lines = [
    `Title: ${spec.title}`,
    `Summary: ${spec.summary}`,
    `Grid: ${counted(spec.rows.length, "row")} × ${
      counted(spec.columns.length, "column")
    }.`,
    `${binsHeader}: ${spec.binRangeLabels.join("; ")}.`,
    `Data (${counted(spec.rows.length, "row")}):`,
  ];
  spec.rows.forEach((row, rowIndex) => {
    const cells = spec.columns.map((column, columnIndex) =>
      `${column.label} ${
        heatmapValueText(heatmapCellAt(spec, rowIndex, columnIndex).value, unit)
      }`
    );
    lines.push(`${row.label} (${row.id}): ${cells.join(", ")}`);
  });
  lines.push(...heatmapExtremeLines(spec));
  return `${lines.join("\n")}\n`;
}
