/**
 * Chart binding of the shared proleptic-Gregorian date grammar.
 *
 * The calendar arithmetic lives once in `src/internal/iso-date.ts`; this
 * facade binds the chart refusal vocabulary, exactly as the timeline kind
 * binds the diagram vocabulary. No `Date`, locale, timezone, or clock access
 * exists anywhere in the path.
 *
 * @module
 */

import {
  type IsoCalendarDate,
  parseIsoCalendarDate,
} from "../internal/iso-date.ts";
import { ChartValidationError } from "./errors.ts";

export type { IsoCalendarDate } from "../internal/iso-date.ts";

/** Day ordinal of `9999-12-31`, the last representable chart date. */
export const CHART_MAX_DATE_ORDINAL = 3_652_058;

/** Parse one authored `YYYY-MM-DD` date, or refuse with the chart vocabulary. */
export function parseChartIsoDate(
  value: unknown,
  path: string,
): IsoCalendarDate {
  if (typeof value !== "string") {
    throw new ChartValidationError({
      code: "chart/invalid-spec",
      message: `${path} must be a calendar date string.`,
      path,
      remedy: "Author the date as YYYY-MM-DD.",
    });
  }
  const parsed = parseIsoCalendarDate(value);
  if (parsed === "malformed") {
    throw new ChartValidationError({
      code: "chart/invalid-spec",
      message: `${path} is not a canonical YYYY-MM-DD date.`,
      path,
      facts: { value },
      remedy: "Author the date as zero-padded YYYY-MM-DD.",
    });
  }
  if (parsed === "not-a-real-date") {
    throw new ChartValidationError({
      code: "chart/invalid-spec",
      message: `${path} names a day that does not exist in its month.`,
      path,
      facts: { value },
      remedy: "Author a real proleptic-Gregorian calendar date.",
    });
  }
  return parsed;
}
