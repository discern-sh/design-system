/** Complete semantic preflight for slope charts. */

import {
  type ChartDecimal,
  chartDecimalFromNumber,
  chartDecimalOrder,
  renderChartDecimal,
  subtractChartDecimals,
} from "../../decimal.ts";
import { ChartValidationError } from "../../errors.ts";
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
import meta from "./slope.meta.ts";
import type {
  SlopeChartDirection,
  ValidatedSlopeChart,
  ValidatedSlopeChartEndpoints,
  ValidatedSlopeChartItem,
} from "./slope.spec.ts";

/** Endpoint names used when the author states none. */
const DEFAULT_ENDPOINTS: ValidatedSlopeChartEndpoints = Object.freeze({
  before: "Before",
  after: "After",
});

function invalid(
  code: "chart/invalid-spec" | "chart/duplicate-id",
  message: string,
  path: string,
  remedy: string,
  facts: Readonly<Record<string, string | number | boolean>> = {},
): never {
  throw new ChartValidationError({ code, message, path, remedy, facts });
}

/** The exact movement facts one before/after pair yields on every surface. */
export interface SlopeChartDelta {
  readonly direction: SlopeChartDirection;
  /** Signed delta text: `+` up, ASCII `-` down, unsigned `0` level. */
  readonly deltaText: string;
  /** The exact decimal difference `after − before` for magnitude ranking. */
  readonly delta: ChartDecimal;
}

/**
 * Compute one item's signed delta in exact decimal space: both values align
 * at a shared exponent, the integer coefficients subtract, and the rendered
 * digits are canonical — a printed delta can never carry a floating-point
 * artifact.
 */
export function computeSlopeDelta(
  before: number,
  after: number,
): SlopeChartDelta {
  const delta = subtractChartDecimals(
    chartDecimalFromNumber(after, "slope after value"),
    chartDecimalFromNumber(before, "slope before value"),
  );
  if (delta.coefficient === 0n) {
    return { direction: "level", deltaText: "0", delta };
  }
  const rendered = renderChartDecimal(delta);
  return delta.coefficient > 0n
    ? { direction: "up", deltaText: `+${rendered}`, delta }
    : { direction: "down", deltaText: rendered, delta };
}

function finiteNumber(stated: unknown, path: string): number {
  if (typeof stated !== "number" || !Number.isFinite(stated)) {
    invalid(
      "chart/invalid-spec",
      `${path} must be a finite number.`,
      path,
      "State the measured value at each of the two positions.",
    );
  }
  return stated;
}

function validateEndpoints(value: unknown): ValidatedSlopeChartEndpoints {
  if (value === undefined) return DEFAULT_ENDPOINTS;
  if (!isChartRecord(value)) {
    invalid(
      "chart/invalid-spec",
      "spec.endpoints must be an object.",
      "spec.endpoints",
      "Name the two ordinal positions with before and after text.",
    );
  }
  assertChartExactKeys(value, ["before", "after"], "spec.endpoints");
  const named = { ...DEFAULT_ENDPOINTS };
  for (const key of ["before", "after"] as const) {
    const text = value[key];
    if (text === undefined) continue;
    assertChartText(text, `spec.endpoints.${key}`);
    assertChartKindBudget(
      meta,
      "endpointLabelGraphemes",
      chartGraphemeCount(text),
      `spec.endpoints.${key}`,
    );
    named[key] = text;
  }
  return Object.freeze(named);
}

/** Validate all authored semantics before layout sees the slope chart. */
export default function validateSlopeChart(
  input: unknown,
): ValidatedSlopeChart {
  const spec = validateChartCommonSpec(input, "slope", [
    "kind",
    "title",
    "summary",
    "items",
    "endpoints",
    "value",
  ]);
  const endpoints = validateEndpoints(spec.endpoints);
  if (!Array.isArray(spec.items) || spec.items.length < 2) {
    invalid(
      "chart/invalid-spec",
      "spec.items must contain at least two items; a single before/after pair is a Stat with a trend, not a slope comparison.",
      "spec.items",
      "Author the two or more items whose movements the reader compares, or present one pair as a Stat.",
    );
  }
  assertChartKindBudget(meta, "items", spec.items.length, "spec.items");

  const identities = new Set<string>();
  const items: ValidatedSlopeChartItem[] = spec.items.map((value, index) => {
    const path = `spec.items[${index}]`;
    if (!isChartRecord(value)) {
      invalid(
        "chart/invalid-spec",
        `${path} must be an object.`,
        path,
        "Use the documented item fields.",
      );
    }
    assertChartExactKeys(value, ["id", "label", "before", "after"], path);
    assertChartIdentifier(value.id, `${path}.id`);
    if (identities.has(value.id)) {
      invalid(
        "chart/duplicate-id",
        `Duplicate semantic identity ${value.id}.`,
        `${path}.id`,
        "Give every item one stable unique identifier.",
        { id: value.id },
      );
    }
    identities.add(value.id);
    assertChartText(value.label, `${path}.label`);
    assertChartKindBudget(
      meta,
      "itemLabelGraphemes",
      chartGraphemeCount(value.label),
      `${path}.label`,
    );
    const before = finiteNumber(value.before, `${path}.before`);
    const after = finiteNumber(value.after, `${path}.after`);
    const movement = computeSlopeDelta(before, after);
    return Object.freeze({
      id: value.id,
      label: value.label,
      before,
      after,
      deltaText: movement.deltaText,
      direction: movement.direction,
    });
  });

  const stated = items.flatMap((item) => [item.before, item.after]);
  const orders = stated
    .filter((value) => value !== 0)
    .map((value) =>
      chartDecimalOrder(chartDecimalFromNumber(value, "slope value"))
    );
  if (orders.length > 0) {
    assertChartKindBudget(
      meta,
      "valueMagnitudeSpan",
      Math.max(...orders) - Math.min(...orders),
      "spec.items",
    );
  }

  return Object.freeze({
    kind: "slope",
    title: spec.title,
    summary: spec.summary,
    items: Object.freeze(items),
    endpoints,
    value: validateChartValueAxis(spec.value, "spec.value"),
    minimumValue: Math.min(...stated),
    maximumValue: Math.max(...stated),
  });
}
