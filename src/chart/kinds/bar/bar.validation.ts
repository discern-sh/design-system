/** Complete semantic preflight for bar charts. */

import { chartDecimalFromNumber, chartDecimalOrder } from "../../decimal.ts";
import { ChartValidationError } from "../../errors.ts";
import type { ChartSeriesPaintSlot } from "../../scene.ts";
import {
  assertChartExactKeys,
  assertChartIdentifier,
  assertChartKindBudget,
  assertChartText,
  chartGraphemeCount,
  chartOneOf,
  isChartRecord,
  validateChartCommonSpec,
  validateChartValueAxis,
} from "../../validation.ts";
import meta from "./bar.meta.ts";
import type {
  BarChartOrientation,
  BarChartVariant,
  ValidatedBarChart,
  ValidatedBarChartSeries,
} from "./bar.spec.ts";

const VARIANTS: readonly BarChartVariant[] = ["grouped", "proportion"];
const ORIENTATIONS: readonly BarChartOrientation[] = [
  "vertical",
  "horizontal",
];

function invalid(
  code:
    | "chart/invalid-spec"
    | "chart/duplicate-id"
    | "chart/negative-value"
    | "chart/proportion-gap"
    | "chart/zero-total"
    | "chart/degenerate-domain",
  message: string,
  path: string,
  remedy: string,
  facts: Readonly<Record<string, string | number | boolean>> = {},
): never {
  throw new ChartValidationError({ code, message, path, remedy, facts });
}

/** Validate all authored semantics before layout sees the bar chart. */
export default function validateBarChart(
  input: unknown,
): ValidatedBarChart {
  const spec = validateChartCommonSpec(input, "bar", [
    "kind",
    "title",
    "summary",
    "variant",
    "orientation",
    "categories",
    "series",
    "value",
  ]);
  const variant = chartOneOf(
    spec.variant,
    VARIANTS,
    "grouped",
    "spec.variant",
  );
  const orientation = chartOneOf(
    spec.orientation,
    ORIENTATIONS,
    "vertical",
    "spec.orientation",
  );
  if (!Array.isArray(spec.categories) || spec.categories.length === 0) {
    invalid(
      "chart/invalid-spec",
      "spec.categories must contain at least one named category.",
      "spec.categories",
      "Author the categories the bars compare.",
    );
  }
  if (!Array.isArray(spec.series) || spec.series.length === 0) {
    invalid(
      "chart/invalid-spec",
      "spec.series must contain at least one series.",
      "spec.series",
      "Author at least one measured series.",
    );
  }
  assertChartKindBudget(
    meta,
    "categories",
    spec.categories.length,
    "spec.categories",
  );
  assertChartKindBudget(meta, "series", spec.series.length, "spec.series");

  const identities = new Set<string>();
  const requireUnique = (id: string, path: string): void => {
    if (identities.has(id)) {
      invalid(
        "chart/duplicate-id",
        `Duplicate semantic identity ${id}.`,
        path,
        "Give every category and series one stable unique identifier.",
        { id },
      );
    }
    identities.add(id);
  };

  const categories = spec.categories.map((value, index) => {
    const path = `spec.categories[${index}]`;
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
    requireUnique(value.id, `${path}.id`);
    assertChartText(value.label, `${path}.label`);
    assertChartKindBudget(
      meta,
      "categoryLabelGraphemes",
      chartGraphemeCount(value.label),
      `${path}.label`,
    );
    return Object.freeze({ id: value.id, label: value.label });
  });

  const series: ValidatedBarChartSeries[] = spec.series.map((value, index) => {
    const path = `spec.series[${index}]`;
    if (!isChartRecord(value)) {
      invalid(
        "chart/invalid-spec",
        `${path} must be an object.`,
        path,
        "Use the documented series fields.",
      );
    }
    assertChartExactKeys(value, ["id", "label", "values"], path);
    assertChartIdentifier(value.id, `${path}.id`);
    requireUnique(value.id, `${path}.id`);
    assertChartText(value.label, `${path}.label`);
    assertChartKindBudget(
      meta,
      "seriesLabelGraphemes",
      chartGraphemeCount(value.label),
      `${path}.label`,
    );
    if (
      !Array.isArray(value.values) ||
      value.values.length !== categories.length
    ) {
      invalid(
        "chart/invalid-spec",
        `${path}.values must state one value or null per category (${categories.length}).`,
        `${path}.values`,
        "Align each series' values index-for-index with the categories.",
      );
    }
    const values = value.values.map((cell, cellIndex) => {
      const cellPath = `${path}.values[${cellIndex}]`;
      if (cell === null) {
        if (variant === "proportion") {
          invalid(
            "chart/proportion-gap",
            `${cellPath} declares a gap, but proportions need a stated value for every series in every category.`,
            cellPath,
            "State every share, or compare the categories with the grouped variant.",
          );
        }
        return null;
      }
      if (typeof cell !== "number") {
        invalid(
          "chart/invalid-spec",
          `${cellPath} must be a number or an explicit null gap.`,
          cellPath,
          "State the measured value, or declare a gap with null.",
        );
      }
      if (cell < 0) {
        invalid(
          "chart/negative-value",
          `${cellPath} is negative (${cell}); bars chart magnitudes from a zero baseline, and the diverging variant that would carry signed values is deferred.`,
          cellPath,
          "Chart the magnitude and state its direction in the data, or wait for the deferred diverging bar variant.",
          { value: cell },
        );
      }
      return cell;
    });
    return Object.freeze({
      id: value.id,
      label: value.label,
      slot: (index + 1) as ChartSeriesPaintSlot,
      values: Object.freeze(values),
    });
  });

  if (variant === "proportion") {
    categories.forEach((category, index) => {
      const total = series.reduce(
        (sum, entry) => sum + (entry.values[index] ?? 0),
        0,
      );
      if (total <= 0) {
        invalid(
          "chart/zero-total",
          `Category ${category.id} has no nonzero share to proportion.`,
          `spec.categories[${index}]`,
          "Give the category a nonzero total, or drop it from the proportion figure.",
          { categoryId: category.id },
        );
      }
    });
  }

  const stated = series.flatMap((entry) =>
    entry.values.filter((cell): cell is number => cell !== null)
  );
  const positive = stated.filter((cell) => cell > 0);
  if (positive.length === 0) {
    invalid(
      "chart/degenerate-domain",
      "Every stated value is zero, so bar length cannot encode anything.",
      "spec.series",
      "Present all-zero data as a table instead of a chart.",
    );
  }
  const orders = positive.map((cell) =>
    chartDecimalOrder(chartDecimalFromNumber(cell, "bar value"))
  );
  assertChartKindBudget(
    meta,
    "valueMagnitudeSpan",
    Math.max(...orders) - Math.min(...orders),
    "spec.series",
  );

  return Object.freeze({
    kind: "bar",
    title: spec.title,
    summary: spec.summary,
    variant,
    orientation,
    categories: Object.freeze(categories),
    series: Object.freeze(series),
    value: validateChartValueAxis(spec.value, "spec.value"),
    maximumValue: Math.max(...stated),
  });
}
