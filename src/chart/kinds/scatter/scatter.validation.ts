/** Complete semantic preflight for scatter charts. */

import { chartDecimalFromNumber, chartDecimalOrder } from "../../decimal.ts";
import { ChartValidationError } from "../../errors.ts";
import type {
  ChartPointMarkerShape,
  ChartSeriesPaintSlot,
} from "../../scene.ts";
import type { ChartValueScale } from "../../spec.ts";
import {
  assertChartExactKeys,
  assertChartIdentifier,
  assertChartKindBudget,
  assertChartText,
  chartGraphemeCount,
  isChartRecord,
  validateChartCommonSpec,
  validateChartScaledValueAxis,
} from "../../validation.ts";
import meta from "./scatter.meta.ts";
import type {
  ScatterChartPointSpec,
  ValidatedScatterChart,
  ValidatedScatterChartAxis,
  ValidatedScatterChartSeries,
} from "./scatter.spec.ts";

function invalid(
  code:
    | "chart/invalid-spec"
    | "chart/duplicate-id"
    | "chart/log-domain"
    | "chart/degenerate-domain",
  message: string,
  path: string,
  remedy: string,
  facts: Readonly<Record<string, string | number | boolean>> = {},
): never {
  throw new ChartValidationError({ code, message, path, remedy, facts });
}

/**
 * The paired non-colour cue each series slot wears, in slot order. The
 * vocabulary is exactly three shapes, which is why the series budget is
 * three: a fourth population would differ by colour alone.
 */
function markerForSlot(slot: ChartSeriesPaintSlot): ChartPointMarkerShape {
  return slot === 1 ? "circle" : slot === 2 ? "square" : "triangle";
}

function coordinate(
  value: Record<string, unknown>,
  key: "x" | "y",
  path: string,
): number {
  const stated = value[key];
  if (typeof stated !== "number") {
    invalid(
      "chart/invalid-spec",
      `${path}.${key} must be a finite number.`,
      `${path}.${key}`,
      "State both measured quantities as plain numbers.",
    );
  }
  return stated;
}

function assertLogDomain(
  scale: ChartValueScale,
  axis: "x" | "y",
  stated: number,
  path: string,
): void {
  if (scale !== "log" || stated > 0) return;
  invalid(
    "chart/log-domain",
    `${path} states ${stated}, but the ${axis} axis uses a log scale and position on a log scale exists only for strictly positive values.`,
    path,
    "State strictly positive values on the log axis, or keep the linear scale.",
    { value: stated },
  );
}

/**
 * Apply the per-axis magnitude-span budget over the nonzero coordinate
 * magnitudes. The budget guards linear scales only — a wide span is exactly
 * what the log scale exists to carry, so choosing it is the remedy.
 */
function assertMagnitudeSpan(
  dimension: "xMagnitudeSpan" | "yMagnitudeSpan",
  scale: ChartValueScale,
  values: readonly number[],
): void {
  if (scale !== "linear") return;
  const orders = values
    .filter((value) => value !== 0)
    .map((value) =>
      chartDecimalOrder(
        chartDecimalFromNumber(Math.abs(value), "scatter coordinate"),
      )
    );
  if (orders.length === 0) return;
  assertChartKindBudget(
    meta,
    dimension,
    Math.max(...orders) - Math.min(...orders),
    "spec.series",
  );
}

/** Validate all authored semantics before layout sees the scatter chart. */
export default function validateScatterChart(
  input: unknown,
): ValidatedScatterChart {
  const spec = validateChartCommonSpec(input, "scatter", [
    "kind",
    "title",
    "summary",
    "series",
    "x",
    "y",
  ]);
  const x: ValidatedScatterChartAxis = validateChartScaledValueAxis(
    spec.x,
    "spec.x",
  );
  const y: ValidatedScatterChartAxis = validateChartScaledValueAxis(
    spec.y,
    "spec.y",
  );
  if (!Array.isArray(spec.series) || spec.series.length === 0) {
    invalid(
      "chart/invalid-spec",
      "spec.series must contain at least one series.",
      "spec.series",
      "Author at least one observed series.",
    );
  }
  assertChartKindBudget(meta, "series", spec.series.length, "spec.series");

  const identities = new Set<string>();
  const series: ValidatedScatterChartSeries[] = spec.series.map(
    (value, index) => {
      const path = `spec.series[${index}]`;
      if (!isChartRecord(value)) {
        invalid(
          "chart/invalid-spec",
          `${path} must be an object.`,
          path,
          "Use the documented series fields.",
        );
      }
      assertChartExactKeys(value, ["id", "label", "points"], path);
      assertChartIdentifier(value.id, `${path}.id`);
      if (identities.has(value.id)) {
        invalid(
          "chart/duplicate-id",
          `Duplicate semantic identity ${value.id}.`,
          `${path}.id`,
          "Give every series one stable unique identifier.",
          { id: value.id },
        );
      }
      identities.add(value.id);
      assertChartText(value.label, `${path}.label`);
      assertChartKindBudget(
        meta,
        "seriesLabelGraphemes",
        chartGraphemeCount(value.label),
        `${path}.label`,
      );
      if (!Array.isArray(value.points) || value.points.length === 0) {
        invalid(
          "chart/invalid-spec",
          `${path}.points must state at least one observation.`,
          `${path}.points`,
          "Author the observed (x, y) pairs the series plots.",
        );
      }
      assertChartKindBudget(
        meta,
        "pointsPerSeries",
        value.points.length,
        `${path}.points`,
      );
      const points: ScatterChartPointSpec[] = value.points.map(
        (point, pointIndex) => {
          const pointPath = `${path}.points[${pointIndex}]`;
          if (!isChartRecord(point)) {
            invalid(
              "chart/invalid-spec",
              `${pointPath} must be an object.`,
              pointPath,
              "State each observation as { x, y }.",
            );
          }
          assertChartExactKeys(point, ["x", "y"], pointPath);
          const statedX = coordinate(point, "x", pointPath);
          const statedY = coordinate(point, "y", pointPath);
          assertLogDomain(x.scale, "x", statedX, `${pointPath}.x`);
          assertLogDomain(y.scale, "y", statedY, `${pointPath}.y`);
          return Object.freeze({ x: statedX, y: statedY });
        },
      );
      const slot = (index + 1) as ChartSeriesPaintSlot;
      return Object.freeze({
        id: value.id,
        label: value.label,
        slot,
        marker: markerForSlot(slot),
        points: Object.freeze(points),
      });
    },
  );

  const all = series.flatMap((entry) => entry.points);
  const first = all[0];
  if (first === undefined) {
    invalid(
      "chart/invalid-spec",
      "spec.series must state at least one observation.",
      "spec.series",
      "Author the observed (x, y) pairs the chart plots.",
    );
  }
  if (all.every((point) => point.x === first.x && point.y === first.y)) {
    invalid(
      "chart/degenerate-domain",
      "Every stated point is identical, so position cannot encode a relationship.",
      "spec.series",
      "Present one repeated pair as text instead of a chart.",
    );
  }
  assertMagnitudeSpan("xMagnitudeSpan", x.scale, all.map(({ x }) => x));
  assertMagnitudeSpan("yMagnitudeSpan", y.scale, all.map(({ y }) => y));

  return Object.freeze({
    kind: "scatter",
    title: spec.title,
    summary: spec.summary,
    series: Object.freeze(series),
    x,
    y,
    minimumX: Math.min(...all.map(({ x }) => x)),
    maximumX: Math.max(...all.map(({ x }) => x)),
    minimumY: Math.min(...all.map(({ y }) => y)),
    maximumY: Math.max(...all.map(({ y }) => y)),
  });
}
