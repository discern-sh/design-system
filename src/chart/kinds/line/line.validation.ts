/** Complete semantic preflight for line charts. */

import { parseChartIsoDate } from "../../dates.ts";
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
  validateChartNumberFormat,
  validateChartScaledValueAxis,
} from "../../validation.ts";
import meta from "./line.meta.ts";
import type {
  LineChartVariant,
  ValidatedLineChart,
  ValidatedLineChartDomain,
  ValidatedLineChartSeries,
} from "./line.spec.ts";

const VARIANTS: readonly LineChartVariant[] = ["line", "area"];
const DOMAIN_KINDS = ["number", "date"] as const;

function invalid(
  code:
    | "chart/invalid-spec"
    | "chart/duplicate-id"
    | "chart/negative-value"
    | "chart/degenerate-domain"
    | "chart/log-domain",
  message: string,
  path: string,
  remedy: string,
  facts: Readonly<Record<string, string | number | boolean>> = {},
): never {
  throw new ChartValidationError({ code, message, path, remedy, facts });
}

/** Refuse any x domain that does not climb strictly upward. */
function assertStrictlyIncreasing(
  positions: readonly number[],
  path: string,
): void {
  for (let index = 1; index < positions.length; index += 1) {
    const previous = positions[index - 1];
    const current = positions[index];
    if (
      previous !== undefined && current !== undefined && current <= previous
    ) {
      invalid(
        "chart/invalid-spec",
        `${path}[${index}] does not increase past its predecessor; the x domain must be strictly increasing.`,
        `${path}[${index}]`,
        "Sort the domain positions upward and remove duplicates.",
      );
    }
  }
}

function validateDomain(value: unknown): ValidatedLineChartDomain {
  const path = "spec.x";
  if (!isChartRecord(value)) {
    invalid(
      "chart/invalid-spec",
      `${path} must be an object.`,
      path,
      "Use the documented ordered-domain fields.",
    );
  }
  const kind = value.kind;
  if (kind !== "number" && kind !== "date") {
    invalid(
      "chart/invalid-spec",
      `${path}.kind must be one of ${DOMAIN_KINDS.join(", ")}.`,
      `${path}.kind`,
      "Follow an ordered numeric or calendar-date domain.",
    );
  }
  assertChartExactKeys(
    value,
    kind === "number"
      ? ["kind", "values", "label", "format"]
      : ["kind", "values", "label"],
    path,
  );
  if (!Array.isArray(value.values) || value.values.length < 2) {
    invalid(
      "chart/degenerate-domain",
      `${path}.values must state at least two ordered domain positions; a single position draws no line.`,
      `${path}.values`,
      "Author at least two ordered positions, or present the value in a table.",
    );
  }
  assertChartKindBudget(meta, "points", value.values.length, `${path}.values`);
  const label = value.label;
  if (label !== undefined) assertChartText(label, `${path}.label`);
  if (kind === "number") {
    const values = value.values.map((entry, index) => {
      if (typeof entry !== "number") {
        invalid(
          "chart/invalid-spec",
          `${path}.values[${index}] must be a number.`,
          `${path}.values[${index}]`,
          "State every ordered domain position as a finite number.",
        );
      }
      return entry;
    });
    assertStrictlyIncreasing(values, `${path}.values`);
    const format = value.format === undefined
      ? undefined
      : validateChartNumberFormat(value.format, `${path}.format`);
    return Object.freeze({
      kind: "number" as const,
      values: Object.freeze(values),
      ...(label === undefined ? {} : { label }),
      ...(format === undefined ? {} : { format }),
    });
  }
  const dates: string[] = [];
  const ordinals: number[] = [];
  value.values.forEach((entry, index) => {
    const parsed = parseChartIsoDate(entry, `${path}.values[${index}]`);
    dates.push(parsed.iso);
    ordinals.push(parsed.ordinal);
  });
  assertStrictlyIncreasing(ordinals, `${path}.values`);
  return Object.freeze({
    kind: "date" as const,
    values: Object.freeze(dates),
    ordinals: Object.freeze(ordinals),
    ...(label === undefined ? {} : { label }),
  });
}

/** Validate all authored semantics before layout sees the line chart. */
export default function validateLineChart(
  input: unknown,
): ValidatedLineChart {
  const spec = validateChartCommonSpec(input, "line", [
    "kind",
    "title",
    "summary",
    "variant",
    "x",
    "series",
    "value",
  ]);
  const variant = chartOneOf(spec.variant, VARIANTS, "line", "spec.variant");
  const value = validateChartScaledValueAxis(spec.value, "spec.value");
  const x = validateDomain(spec.x);
  if (!Array.isArray(spec.series) || spec.series.length === 0) {
    invalid(
      "chart/invalid-spec",
      "spec.series must contain at least one series.",
      "spec.series",
      "Author at least one measured series.",
    );
  }
  assertChartKindBudget(meta, "series", spec.series.length, "spec.series");

  const identities = new Set<string>();
  const series: ValidatedLineChartSeries[] = spec.series.map((entry, index) => {
    const path = `spec.series[${index}]`;
    if (!isChartRecord(entry)) {
      invalid(
        "chart/invalid-spec",
        `${path} must be an object.`,
        path,
        "Use the documented series fields.",
      );
    }
    assertChartExactKeys(entry, ["id", "label", "values"], path);
    assertChartIdentifier(entry.id, `${path}.id`);
    if (identities.has(entry.id)) {
      invalid(
        "chart/duplicate-id",
        `Duplicate semantic identity ${entry.id}.`,
        `${path}.id`,
        "Give every series one stable unique identifier.",
        { id: entry.id },
      );
    }
    identities.add(entry.id);
    assertChartText(entry.label, `${path}.label`);
    assertChartKindBudget(
      meta,
      "seriesLabelGraphemes",
      chartGraphemeCount(entry.label),
      `${path}.label`,
    );
    if (
      !Array.isArray(entry.values) || entry.values.length !== x.values.length
    ) {
      invalid(
        "chart/invalid-spec",
        `${path}.values must state one value or null per domain position (${x.values.length}).`,
        `${path}.values`,
        "Align each series' values index-for-index with the x positions.",
      );
    }
    let statedCount = 0;
    const values = entry.values.map((cell, cellIndex) => {
      const cellPath = `${path}.values[${cellIndex}]`;
      if (cell === null) return null;
      if (typeof cell !== "number") {
        invalid(
          "chart/invalid-spec",
          `${cellPath} must be a number or an explicit null gap.`,
          cellPath,
          "State the measured value, or declare a gap with null.",
        );
      }
      if (value.scale === "log" && cell <= 0) {
        invalid(
          "chart/log-domain",
          `${cellPath} states ${cell}, but the log scale positions only strictly positive values.`,
          cellPath,
          "Use the linear scale, or chart strictly positive data.",
          { value: cell },
        );
      }
      if (variant === "area" && cell < 0) {
        invalid(
          "chart/negative-value",
          `${cellPath} is negative (${cell}); the area variant fills from a zero baseline and cannot carry signed values.`,
          cellPath,
          "Use the line variant for signed values, or chart the magnitude and state its direction in the data.",
          { value: cell },
        );
      }
      statedCount += 1;
      return cell;
    });
    if (statedCount < 2) {
      invalid(
        "chart/degenerate-domain",
        `${path} states fewer than two values; a single stated point draws no line.`,
        `${path}.values`,
        "State at least two values, or present the point in a table.",
      );
    }
    return Object.freeze({
      id: entry.id,
      label: entry.label,
      slot: (index + 1) as ChartSeriesPaintSlot,
      values: Object.freeze(values),
    });
  });

  if (variant === "area") {
    if (series.length !== 1) {
      invalid(
        "chart/invalid-spec",
        `The area variant fills beneath exactly one series; received ${series.length}.`,
        "spec.series",
        "Author a single series, or compare several with the line variant.",
        { seriesCount: series.length },
      );
    }
    if (value.scale !== "linear") {
      invalid(
        "chart/invalid-spec",
        "The area variant fills from a zero baseline, which the log scale cannot position.",
        "spec.value.scale",
        "Use the linear scale, or use the line variant.",
      );
    }
  }

  const stated = series.flatMap((entry) =>
    entry.values.filter((cell): cell is number => cell !== null)
  );
  const maximumValue = Math.max(...stated);
  const minimumValue = Math.min(...stated);
  if (variant === "area" && maximumValue === 0) {
    invalid(
      "chart/degenerate-domain",
      "Every stated value is zero, so the area fills nothing.",
      "spec.series",
      "Present all-zero data as a table, or use the line variant.",
    );
  }
  if (value.scale === "linear") {
    const positive = stated.filter((cell) => cell > 0);
    if (positive.length > 0) {
      const orders = positive.map((cell) =>
        chartDecimalOrder(chartDecimalFromNumber(cell, "line value"))
      );
      assertChartKindBudget(
        meta,
        "valueMagnitudeSpan",
        Math.max(...orders) - Math.min(...orders),
        "spec.series",
      );
    }
  }

  return Object.freeze({
    kind: "line",
    title: spec.title,
    summary: spec.summary,
    variant,
    x,
    series: Object.freeze(series),
    value,
    maximumValue,
    minimumValue,
  });
}
