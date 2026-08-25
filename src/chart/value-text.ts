/**
 * The one textual form every chart surface prints a stated value in: the
 * canonical shortest decimal with the authored unit, or the declared-gap
 * wording. Descriptions, enhanced frames, and data tables all read from
 * here, so a value is byte-identical wherever it appears.
 *
 * @module
 */

import { chartDecimalFromNumber, renderChartDecimal } from "./decimal.ts";
import type { ChartValueAxisSpec } from "./spec.ts";

/** Render one number as its exact canonical shortest decimal. */
export function chartPlainValue(value: number): string {
  return renderChartDecimal(chartDecimalFromNumber(value, "chart value"));
}

/** The exact unit suffix every surface appends to a stated value. */
export function chartUnitSuffix(axis: ChartValueAxisSpec): string {
  return axis.unit === undefined ? "" : ` ${axis.unit}`;
}

/** One stated value or declared gap, exactly as every surface prints it. */
export function chartValueText(
  value: number | null,
  unitSuffix: string,
): string {
  return value === null
    ? "no stated value"
    : `${chartPlainValue(value)}${unitSuffix}`;
}
