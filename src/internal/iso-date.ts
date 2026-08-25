/**
 * Proleptic-Gregorian ISO calendar arithmetic shared by the kind families,
 * computed without `Date`, locale, timezone, or clock access.
 *
 * @module
 */

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

/** One parsed proleptic-Gregorian calendar date and its day ordinal. */
export interface IsoCalendarDate {
  readonly iso: string;
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly ordinal: number;
}

/** Typed reason one ISO calendar date candidate is refused. */
export type IsoCalendarDateDefect = "malformed" | "not-a-real-date";

function leapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function monthDays(year: number, month: number): number {
  if (month === 2 && leapYear(year)) return 29;
  return MONTH_LENGTHS[month - 1] ?? 0;
}

function daysBeforeYear(year: number): number {
  const previous = year - 1;
  return previous * 365 + Math.floor(previous / 4) -
    Math.floor(previous / 100) + Math.floor(previous / 400);
}

function dateOrdinal(year: number, month: number, day: number): number {
  let ordinal = daysBeforeYear(year) + day - 1;
  for (let current = 1; current < month; current += 1) {
    ordinal += monthDays(year, current);
  }
  return ordinal;
}

/** Parse one canonical `YYYY-MM-DD` date, or report the typed refusal. */
export function parseIsoCalendarDate(
  value: string,
): IsoCalendarDate | IsoCalendarDateDefect {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (match === null) return "malformed";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    !Number.isInteger(year) || year < 1 || year > 9_999 ||
    !Number.isInteger(month) || month < 1 || month > 12 ||
    !Number.isInteger(day) || day < 1 || day > monthDays(year, month)
  ) {
    return "not-a-real-date";
  }
  return Object.freeze({
    iso: value,
    year,
    month,
    day,
    ordinal: dateOrdinal(year, month, day),
  });
}

/** Format a validated Gregorian ordinal without ambient date facilities. */
export function isoDateFromOrdinal(ordinal: number, subject: string): string {
  if (!Number.isSafeInteger(ordinal) || ordinal < 0) {
    throw new TypeError(
      `${subject} ordinal must be a non-negative safe integer.`,
    );
  }
  let low = 1;
  let high = 9_999;
  let year = 1;
  while (low <= high) {
    const candidate = Math.floor((low + high) / 2);
    const start = daysBeforeYear(candidate);
    const end = daysBeforeYear(candidate + 1);
    if (ordinal < start) high = candidate - 1;
    else if (ordinal >= end) low = candidate + 1;
    else {
      year = candidate;
      break;
    }
  }
  let remaining = ordinal - daysBeforeYear(year);
  let month = 1;
  while (remaining >= monthDays(year, month)) {
    remaining -= monthDays(year, month);
    month += 1;
  }
  const day = remaining + 1;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${
    String(day).padStart(2, "0")
  }`;
}
