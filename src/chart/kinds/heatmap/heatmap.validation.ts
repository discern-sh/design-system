/** Complete semantic preflight for heatmap charts. */

import { chartDecimalFromNumber, compareChartDecimals } from "../../decimal.ts";
import { ChartValidationError } from "../../errors.ts";
import type { ChartRampPaintSlot } from "../../scene.ts";
import {
  assertChartExactKeys,
  assertChartIdentifier,
  assertChartKindBudget,
  assertChartText,
  chartGraphemeCount,
  isChartRecord,
  validateChartCommonSpec,
  validateChartValueAxis,
} from "../../validation.ts";
import {
  heatmapBinRangeLabels,
  heatmapUnitSuffix,
} from "./heatmap.description.ts";
import meta from "./heatmap.meta.ts";
import type {
  HeatmapChartCategorySpec,
  ValidatedHeatmapCell,
  ValidatedHeatmapChart,
} from "./heatmap.spec.ts";

function invalid(
  code:
    | "chart/invalid-spec"
    | "chart/duplicate-id"
    | "chart/degenerate-domain",
  message: string,
  path: string,
  remedy: string,
  facts: Readonly<Record<string, string | number | boolean>> = {},
): never {
  throw new ChartValidationError({ code, message, path, remedy, facts });
}

function badBinEdges(
  message: string,
  facts: Readonly<Record<string, string | number | boolean>> = {},
): never {
  throw new ChartValidationError({
    code: "chart/bin-edges",
    message,
    path: "spec.bins.edges",
    facts,
    remedy:
      "Declare one to three strictly increasing finite inner thresholds; each threshold belongs to the bin above it.",
  });
}

/** Validate all authored semantics before layout sees the heatmap chart. */
export default function validateHeatmapChart(
  input: unknown,
): ValidatedHeatmapChart {
  const spec = validateChartCommonSpec(input, "heatmap", [
    "kind",
    "title",
    "summary",
    "rows",
    "columns",
    "values",
    "bins",
    "value",
  ]);
  if (!Array.isArray(spec.rows) || spec.rows.length === 0) {
    invalid(
      "chart/invalid-spec",
      "spec.rows must contain at least one named row.",
      "spec.rows",
      "Author the row categories the grid reads across.",
    );
  }
  if (!Array.isArray(spec.columns) || spec.columns.length === 0) {
    invalid(
      "chart/invalid-spec",
      "spec.columns must contain at least one named column.",
      "spec.columns",
      "Author the column categories the grid reads across.",
    );
  }
  if (spec.rows.length === 1 && spec.columns.length === 1) {
    invalid(
      "chart/invalid-spec",
      "A 1 × 1 grid states one value with nothing to read it against; a genuine grid needs at least two positions on one axis.",
      "spec",
      "Present the single value as text or a stat, or author more rows or columns.",
    );
  }
  assertChartKindBudget(meta, "rows", spec.rows.length, "spec.rows");
  assertChartKindBudget(meta, "columns", spec.columns.length, "spec.columns");

  const identities = new Set<string>();
  const category = (
    value: unknown,
    path: string,
    budget: "rowLabelGraphemes" | "columnLabelGraphemes",
  ): HeatmapChartCategorySpec => {
    if (!isChartRecord(value)) {
      invalid(
        "chart/invalid-spec",
        `${path} must be an object.`,
        path,
        "Use the documented category fields.",
      );
    }
    assertChartExactKeys(value, ["id", "label"], path);
    assertChartIdentifier(value.id, `${path}.id`);
    if (identities.has(value.id)) {
      invalid(
        "chart/duplicate-id",
        `Duplicate semantic identity ${value.id}.`,
        `${path}.id`,
        "Give every row and column one stable unique identifier.",
        { id: value.id },
      );
    }
    identities.add(value.id);
    assertChartText(value.label, `${path}.label`);
    assertChartKindBudget(
      meta,
      budget,
      chartGraphemeCount(value.label),
      `${path}.label`,
    );
    return Object.freeze({ id: value.id, label: value.label });
  };
  const rows = spec.rows.map((value, index) =>
    category(value, `spec.rows[${index}]`, "rowLabelGraphemes")
  );
  const columns = spec.columns.map((value, index) =>
    category(value, `spec.columns[${index}]`, "columnLabelGraphemes")
  );

  if (!isChartRecord(spec.bins)) {
    invalid(
      "chart/invalid-spec",
      "spec.bins must declare the bin edges object.",
      "spec.bins",
      "Declare the bins as { edges: [...] } with strictly increasing thresholds.",
    );
  }
  assertChartExactKeys(spec.bins, ["edges"], "spec.bins");
  const rawEdges = spec.bins.edges;
  if (!Array.isArray(rawEdges) || rawEdges.length === 0) {
    badBinEdges("spec.bins.edges must declare at least one inner threshold.", {
      edgeCount: Array.isArray(rawEdges) ? rawEdges.length : "non-array",
    });
  }
  const edges: number[] = rawEdges.map((edge, index) => {
    if (typeof edge !== "number" || !Number.isFinite(edge)) {
      badBinEdges(`spec.bins.edges[${index}] must be a finite number.`, {
        index,
      });
    }
    return edge;
  });
  for (let index = 1; index < edges.length; index += 1) {
    const previous = edges[index - 1];
    const current = edges[index];
    if (previous === undefined || current === undefined) continue;
    if (!(previous < current)) {
      badBinEdges(
        `spec.bins.edges must increase strictly; edges[${index}] (${current}) does not exceed edges[${
          index - 1
        }] (${previous}).`,
        { index, value: current, previous },
      );
    }
  }
  assertChartKindBudget(meta, "bins", edges.length + 1, "spec.bins.edges");

  if (!Array.isArray(spec.values) || spec.values.length !== rows.length) {
    invalid(
      "chart/invalid-spec",
      `spec.values must state one array of cells per named row (${rows.length}).`,
      "spec.values",
      "Align the value grid row-major with the rows, one array per row.",
    );
  }
  const grid: (number | null)[][] = spec.values.map((rowValues, rowIndex) => {
    const path = `spec.values[${rowIndex}]`;
    if (!Array.isArray(rowValues) || rowValues.length !== columns.length) {
      invalid(
        "chart/invalid-spec",
        `${path} must state one value or null per column (${columns.length}).`,
        path,
        "Align each row's cells index-for-index with the columns.",
      );
    }
    return rowValues.map((cell, columnIndex) => {
      if (cell === null) return null;
      if (typeof cell !== "number") {
        invalid(
          "chart/invalid-spec",
          `${path}[${columnIndex}] must be a number or an explicit null gap.`,
          `${path}[${columnIndex}]`,
          "State the measured value, or declare a gap with null.",
        );
      }
      return cell;
    });
  });
  const stated = grid.flat().filter((cell): cell is number => cell !== null);
  if (stated.length === 0) {
    invalid(
      "chart/degenerate-domain",
      "Every cell declares a gap, so the grid states no magnitude to bin.",
      "spec.values",
      "State at least one measured value, or present the empty grid as a table.",
    );
  }

  const edgeDecimals = edges.map((edge, index) =>
    chartDecimalFromNumber(edge, `heatmap bin edge ${index}`)
  );
  /**
   * Assign the declared bin by exact decimal comparison: bin `i` holds
   * values below `edges[i - 1]`, and a value exactly equal to a threshold
   * lands in the upper bin, so the bins partition every real value with the
   * last bin open-ended at or above the final threshold.
   */
  const binFor = (value: number): ChartRampPaintSlot => {
    const decimal = chartDecimalFromNumber(value, "heatmap value");
    for (const [index, edge] of edgeDecimals.entries()) {
      if (compareChartDecimals(decimal, edge) < 0) {
        return (index + 1) as ChartRampPaintSlot;
      }
    }
    return (edgeDecimals.length + 1) as ChartRampPaintSlot;
  };
  const cells: ValidatedHeatmapCell[] = rows.flatMap((row, rowIndex) =>
    columns.map((column, columnIndex) => {
      const value = grid[rowIndex]?.[columnIndex] ?? null;
      return Object.freeze({
        rowId: row.id,
        columnId: column.id,
        value,
        bin: value === null ? null : binFor(value),
      });
    })
  );

  const value = validateChartValueAxis(spec.value, "spec.value");
  return Object.freeze({
    kind: "heatmap",
    title: spec.title,
    summary: spec.summary,
    rows: Object.freeze(rows),
    columns: Object.freeze(columns),
    cells: Object.freeze(cells),
    binEdges: Object.freeze(edges),
    binRangeLabels: heatmapBinRangeLabels(edges, heatmapUnitSuffix(value)),
    value,
  });
}
