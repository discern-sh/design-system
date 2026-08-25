/** Stable, colour-independent structural description for slope charts. */

import { compareChartDecimals } from "../../decimal.ts";
import { type ChartNumberFormat, formatChartDecimal } from "../../format.ts";
import {
  chartNumberText,
  chartUnitSuffix,
  chartValueText,
} from "../../value-text.ts";
import { computeSlopeDelta } from "./slope.validation.ts";
import type {
  SlopeChartDirection,
  SlopeChartValueAxisSpec,
  ValidatedSlopeChart,
  ValidatedSlopeChartItem,
} from "./slope.spec.ts";

/** The exact unit suffix every slope surface appends to a stated value. */
export function slopeUnitSuffix(value: SlopeChartValueAxisSpec): string {
  return chartUnitSuffix(value);
}

/**
 * Render one stated endpoint value exactly as every surface prints it: the
 * canonical shortest decimal with the authored unit.
 */
export function slopeValueText(
  value: number,
  unitSuffix: string,
  format?: ChartNumberFormat,
): string {
  return chartValueText(value, unitSuffix, format);
}

/**
 * The one word every surface pairs with a direction: `level` reads as
 * `unchanged` so the sentence states the fact rather than the geometry.
 */
export function slopeDirectionWord(direction: SlopeChartDirection): string {
  return direction === "level" ? "unchanged" : direction;
}

/** One item's signed delta with the authored unit, byte-identical everywhere. */
export function slopeDeltaCell(
  item: ValidatedSlopeChartItem,
  unitSuffix: string,
  format?: ChartNumberFormat,
): string {
  if (format === undefined) return `${item.deltaText}${unitSuffix}`;
  const computed = computeSlopeDelta(item.before, item.after);
  const rendered = formatChartDecimal(computed.delta, format);
  return `${computed.direction === "up" ? "+" : ""}${rendered}${unitSuffix}`;
}

/**
 * The universal data-table facts every terminal projection renders: one item
 * row of exact value texts beneath the endpoint-labelled columns.
 */
export function slopeDataTableFacts(spec: ValidatedSlopeChart): {
  readonly columns: readonly {
    readonly header: string;
    readonly numeric: boolean;
  }[];
  readonly rows: readonly (readonly string[])[];
} {
  const unit = slopeUnitSuffix(spec.value);
  return {
    columns: [
      { header: "Item", numeric: false },
      { header: spec.endpoints.before, numeric: true },
      { header: spec.endpoints.after, numeric: true },
      { header: "Change", numeric: true },
    ],
    rows: spec.items.map((item) => [
      `${item.label} (${item.id})`,
      slopeValueText(item.before, unit, spec.value.format),
      slopeValueText(item.after, unit, spec.value.format),
      slopeDeltaCell(item, unit, spec.value.format),
    ]),
  };
}

/** The item whose exact delta ranks highest under the given comparison. */
function extremeItem(
  items: readonly ValidatedSlopeChartItem[],
  direction: SlopeChartDirection,
  prefer: -1 | 1,
): ValidatedSlopeChartItem | undefined {
  let found: ValidatedSlopeChartItem | undefined;
  for (const item of items) {
    if (item.direction !== direction) continue;
    if (
      found === undefined ||
      compareChartDecimals(
          computeSlopeDelta(item.before, item.after).delta,
          computeSlopeDelta(found.before, found.after).delta,
        ) === prefer
    ) {
      found = item;
    }
  }
  return found;
}

/** Describe every accessible fact and the data table in authored order. */
export default function describeSlopeChart(
  spec: ValidatedSlopeChart,
): string {
  const unit = slopeUnitSuffix(spec.value);
  const axisName = spec.value.label === undefined
    ? "Value axis"
    : `Value axis (${spec.value.label})`;
  const lines = [
    `Title: ${spec.title}`,
    `Summary: ${spec.summary}`,
    `Comparison: ${spec.endpoints.before} to ${spec.endpoints.after} across ${spec.items.length} items.`,
    `${axisName}: linear scale from ${
      chartNumberText(spec.minimumValue, spec.value.format)
    } to ${chartNumberText(spec.maximumValue, spec.value.format)}${unit}.`,
    `Data (${spec.items.length} items):`,
  ];
  for (const item of spec.items) {
    lines.push(
      `${item.label} (${item.id}): ${
        slopeValueText(item.before, unit, spec.value.format)
      } to ${slopeValueText(item.after, unit, spec.value.format)}, ${
        slopeDirectionWord(item.direction)
      } ${slopeDeltaCell(item, unit, spec.value.format)}`,
    );
  }
  const largestIncrease = extremeItem(spec.items, "up", 1);
  if (largestIncrease !== undefined) {
    lines.push(
      `Largest increase: ${
        slopeDeltaCell(largestIncrease, unit, spec.value.format)
      } (${largestIncrease.label}).`,
    );
  }
  const largestDecrease = extremeItem(spec.items, "down", -1);
  if (largestDecrease !== undefined) {
    lines.push(
      `Largest decrease: ${
        slopeDeltaCell(largestDecrease, unit, spec.value.format)
      } (${largestDecrease.label}).`,
    );
  }
  return `${lines.join("\n")}\n`;
}
