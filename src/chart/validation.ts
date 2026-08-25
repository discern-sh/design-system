/**
 * Shared JSON, identifier, text, and budget validation for chart kinds.
 *
 * The data-safety facts live in the shared internal authority
 * `src/internal/validation.ts`; this facade binds the chart error classes,
 * codes, limits, and remedies.
 *
 * @module
 */

import { sceneGraphemeCount } from "../internal/font-metrics.ts";
import {
  findTextDefect,
  findUnsupportedKey,
  isPlainRecord,
  isSafeIdentifier,
  snapshotJsonSafe,
} from "../internal/validation.ts";
import {
  ChartBudgetError,
  ChartConformanceError,
  ChartValidationError,
} from "./errors.ts";
import {
  type ChartNumberFormat,
  findChartNumberFormatDefect,
} from "./format.ts";
import type { ChartKindMeta } from "./kind-meta.ts";
import { CHART_COMMON_LIMITS } from "./limits.ts";
import type {
  ChartCommonSpec,
  ChartValueAxisSpec,
  ChartValueScale,
} from "./spec.ts";

export { isPlainRecord as isChartRecord } from "../internal/validation.ts";

function invalidSpec(message: string, path: string): never {
  throw new ChartValidationError({
    code: "chart/invalid-spec",
    message,
    path,
    remedy:
      "Author the chart as readonly JSON-safe data with the exact kind schema.",
  });
}

/** Reject functions, special objects, cycles, and non-finite JSON numbers. */
export function assertChartJsonSafe(value: unknown): void {
  snapshotChartJsonSafe(value);
}

/** Inspect once and return an immutable plain-data snapshot for dispatch. */
export function snapshotChartJsonSafe(value: unknown): unknown {
  try {
    return snapshotJsonSafe(value, {
      rootPath: "spec",
      maximumDepth: CHART_COMMON_LIMITS.jsonDepth,
      onTooDeep: (path, depth) => {
        throw new ChartBudgetError({
          dimension: "jsonDepth",
          limit: CHART_COMMON_LIMITS.jsonDepth,
          actual: depth,
          unit: "levels",
          authorAction: "split-figure",
          path,
        });
      },
      onInvalid: invalidSpec,
    });
  } catch (error) {
    if (error instanceof ChartValidationError) throw error;
    invalidSpec(
      "spec could not be inspected as stable JSON-safe data.",
      "spec",
    );
  }
}

/** Require an object to carry only its kind's declared data fields. */
export function assertChartExactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
): void {
  const extra = findUnsupportedKey(value, allowed);
  if (extra !== undefined) {
    invalidSpec(
      `${path} has unsupported field ${JSON.stringify(extra)}.`,
      path,
    );
  }
}

/** Validate one normalized, single-line semantic text field. */
export function assertChartText(
  value: unknown,
  path: string,
): asserts value is string {
  const defect = findTextDefect(value);
  if (defect === undefined) return;
  if (defect.kind === "not-single-line") {
    throw new ChartValidationError({
      code: "chart/invalid-text",
      message: `${path} must be non-empty text without edge whitespace.`,
      path,
      remedy: "Use one concise plain-text line.",
    });
  }
  if (defect.kind === "repeated-spaces") {
    throw new ChartValidationError({
      code: "chart/invalid-text",
      message: `${path} contains repeated spaces.`,
      path,
      remedy:
        "Use single ordinary spaces so measurement has one deterministic form.",
    });
  }
  throw new ChartValidationError({
    code: "chart/invalid-text",
    message:
      `${path} contains a control, format, or unsupported whitespace character.`,
    path,
    facts: { codePoint: `U+${defect.codePoint.toString(16).toUpperCase()}` },
    remedy: "Replace it with visible plain text and ordinary spaces.",
  });
}

/** Validate one stable printable ASCII semantic identifier. */
export function assertChartIdentifier(
  value: unknown,
  path: string,
): asserts value is string {
  if (
    typeof value !== "string" ||
    !isSafeIdentifier(value, CHART_COMMON_LIMITS.identifierCharacters)
  ) {
    throw new ChartValidationError({
      code: "chart/invalid-identifier",
      message:
        `${path} must begin with an ASCII letter, continue with printable letters, digits, dot, underscore, colon, or hyphen, and stay within ${CHART_COMMON_LIMITS.identifierCharacters} characters.`,
      path,
      remedy: "Choose a short stable semantic identifier such as revenue-2025.",
    });
  }
}

/** Count user-visible units through the shared scene segmentation. */
export function chartGraphemeCount(value: string): number {
  return sceneGraphemeCount(value);
}

/** Validate and return the accessible facts common to every kind. */
export function validateChartCommonSpec(
  value: unknown,
  expectedKind: string,
  allowedKeys: readonly string[],
): ChartCommonSpec & Record<string, unknown> {
  assertChartJsonSafe(value);
  if (!isPlainRecord(value)) invalidSpec("spec must be an object.", "spec");
  assertChartExactKeys(value, allowedKeys, "spec");
  if (value.kind !== expectedKind) {
    throw new ChartValidationError({
      code: "chart/unknown-kind",
      message: `Expected chart kind ${JSON.stringify(expectedKind)}.`,
      path: "spec.kind",
      facts: {
        expectedKind,
        receivedKind: typeof value.kind === "string"
          ? value.kind
          : "non-string",
      },
      remedy: "Use one of the generated built-in chart kind identities.",
    });
  }
  assertChartText(value.title, "spec.title");
  assertChartText(value.summary, "spec.summary");
  const commonTextBudgets = [
    ["titleGraphemes", value.title, CHART_COMMON_LIMITS.titleGraphemes],
    ["summaryGraphemes", value.summary, CHART_COMMON_LIMITS.summaryGraphemes],
  ] as const;
  for (const [dimension, text, limit] of commonTextBudgets) {
    const actual = chartGraphemeCount(text);
    if (actual > limit) {
      throw new ChartBudgetError({
        dimension,
        limit,
        actual,
        unit: "graphemes",
        authorAction: "shorten-label",
        path: dimension === "titleGraphemes" ? "spec.title" : "spec.summary",
      });
    }
  }
  return value as ChartCommonSpec & Record<string, unknown>;
}

/** Read one closed-vocabulary field, falling back when it is omitted. */
export function chartOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
  path: string,
): T {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    invalidSpec(`${path} must be one of ${allowed.join(", ")}.`, path);
  }
  return value as T;
}

/** Validate one closed chart number format authored on an axis or annotation. */
export function validateChartNumberFormat(
  value: unknown,
  path: string,
): ChartNumberFormat {
  const defect = findChartNumberFormatDefect(value);
  if (defect !== undefined) {
    const defectPath = `${path}${defect.path}`;
    throw new ChartValidationError({
      code: "chart/invalid-spec",
      message: `${defectPath} ${defect.message}`,
      path: defectPath,
      remedy: defect.path === ".decimals"
        ? "State the exact fraction digits the labels should carry."
        : defect.path === ".grouping"
        ? "Request canonical thousands grouping with true."
        : "Use one of the closed decimal, percent, or si formats.",
    });
  }
  return value as unknown as ChartNumberFormat;
}

/** Validate the optional value-axis facts every quantitative kind shares. */
export function validateChartValueAxis(
  value: unknown,
  path: string,
): ChartValueAxisSpec {
  if (value === undefined) return {};
  if (!isPlainRecord(value)) {
    invalidSpec(`${path} must be an object.`, path);
  }
  assertChartExactKeys(value, ["label", "unit", "format"], path);
  const axis: {
    label?: string;
    unit?: string;
    format?: ChartNumberFormat;
  } = {};
  if (value.label !== undefined) {
    assertChartText(value.label, `${path}.label`);
    axis.label = value.label;
  }
  if (value.unit !== undefined) {
    assertChartText(value.unit, `${path}.unit`);
    axis.unit = value.unit;
  }
  if (value.format !== undefined) {
    axis.format = validateChartNumberFormat(value.format, `${path}.format`);
  }
  return Object.freeze(axis);
}

const VALUE_SCALES: readonly ChartValueScale[] = ["linear", "log"];

/**
 * Validate the value-axis facts of a position-encoding kind, normalizing
 * the closed scale choice to `linear` when the author omits it.
 */
export function validateChartScaledValueAxis(
  value: unknown,
  path: string,
): ChartValueAxisSpec & { readonly scale: ChartValueScale } {
  if (value === undefined) return Object.freeze({ scale: "linear" as const });
  if (!isPlainRecord(value)) {
    invalidSpec(`${path} must be an object.`, path);
  }
  assertChartExactKeys(value, ["label", "unit", "format", "scale"], path);
  const scale = chartOneOf(
    value.scale,
    VALUE_SCALES,
    "linear",
    `${path}.scale`,
  );
  const { scale: _scale, ...axisFields } = value;
  const axis = validateChartValueAxis(
    Object.keys(axisFields).length === 0 ? undefined : axisFields,
    path,
  );
  return Object.freeze({ ...axis, scale });
}

/** Apply one Metadata-owned kind budget by its declared dimension. */
export function assertChartKindBudget(
  meta: ChartKindMeta,
  dimension: string,
  actual: number,
  path?: string,
): void {
  const budget = meta.budgets[dimension];
  if (budget === undefined) {
    throw new ChartConformanceError(
      `${meta.slug} has no Metadata budget named ${dimension}.`,
      { kind: meta.slug, dimension },
    );
  }
  if (actual > budget.limit) {
    const options = {
      dimension,
      limit: budget.limit,
      actual,
      unit: budget.unit,
      authorAction: budget.remedy,
    } as const;
    throw path === undefined
      ? new ChartBudgetError(options)
      : new ChartBudgetError({ ...options, path });
  }
}
