/**
 * Nice-step tick selection in scaled-decimal integer space.
 *
 * The step is a mantissa in {1, 2, 5} at a decimal exponent — the 1-2-5
 * progression published by Paul Heckbert ("Nice Numbers for Graph Labels",
 * Graphics Gems, 1990), implemented independently here. Ticks are integer
 * multiples of that step, labels are assembled by decimal integer arithmetic
 * on (coefficient, exponent) with no floating-point intermediate, and the
 * display precision derives from the step exponent. Log ticks reuse the same
 * mantissa vocabulary: decade marks across wide spans, 1-2-5 subdivision
 * across narrow ones, always in exact decimal space.
 *
 * @module
 */

import {
  isoDateFromOrdinal,
  parseIsoCalendarDate,
} from "../internal/iso-date.ts";
import { CHART_MAX_DATE_ORDINAL } from "./dates.ts";
import {
  alignChartDecimals,
  type ChartDecimal,
  chartDecimalFromNumber,
  chartDecimalOrder,
  chartDecimalToNumber,
  compareChartDecimals,
  renderChartDecimal,
  subtractChartDecimals,
} from "./decimal.ts";

/** The selected nice step: `mantissa × 10^exponent`. */
export interface ChartTickStep {
  readonly mantissa: 1 | 2 | 5;
  readonly exponent: number;
}

/** One tick: the exact decimal value, its number, and its rendered label. */
export interface ChartTick {
  readonly value: ChartDecimal;
  readonly number: number;
  readonly label: string;
}

/** The complete deterministic tick selection for one linear domain. */
export interface ChartTickSet {
  readonly step: ChartTickStep;
  /** Fraction digits every label renders, derived from the step exponent. */
  readonly decimals: number;
  /** Ticks covering the domain outward: first ≤ minimum, last ≥ maximum. */
  readonly ticks: readonly ChartTick[];
}

function floorDivide(dividend: bigint, divisor: bigint): bigint {
  const quotient = dividend / divisor;
  return dividend % divisor !== 0n && dividend < 0n ? quotient - 1n : quotient;
}

function ceilDivide(dividend: bigint, divisor: bigint): bigint {
  const quotient = dividend / divisor;
  return dividend % divisor !== 0n && dividend > 0n ? quotient + 1n : quotient;
}

function lessThan(
  value: ChartDecimal,
  coefficient: bigint,
  exponent: number,
): boolean {
  return compareChartDecimals(value, { coefficient, exponent }) < 0;
}

/**
 * Select the nice step nearest one rough interval, by exact decimal
 * comparison against the published 1.5 / 3 / 7 rounding thresholds.
 */
function niceStep(span: ChartDecimal, divisor: number): ChartTickStep {
  const denominator = BigInt(divisor);
  let order = chartDecimalOrder(span);
  while (lessThan(span, denominator, order)) order -= 1;

  const selected: ChartTickStep = lessThan(
      span,
      denominator * 15n,
      order - 1,
    )
    ? { mantissa: 1, exponent: order }
    : lessThan(span, denominator * 3n, order)
    ? { mantissa: 2, exponent: order }
    : lessThan(span, denominator * 7n, order)
    ? { mantissa: 5, exponent: order }
    : { mantissa: 1, exponent: order + 1 };

  const selectedDecimal: ChartDecimal = {
    coefficient: BigInt(selected.mantissa),
    exponent: selected.exponent,
  };
  const minimumNumber = chartDecimalFromNumber(
    Number.MIN_VALUE,
    "minimum representable chart tick step",
  );
  if (compareChartDecimals(selectedDecimal, minimumNumber) < 0) {
    return { mantissa: 5, exponent: -324 };
  }
  return selected;
}

/**
 * Choose ticks for one linear domain: a nice step sized to the requested
 * count, integer tick multiples covering the domain outward, and labels with
 * canonical grouping at the step's derived precision.
 */
export function chartLinearTicks(options: {
  readonly minimum: number;
  readonly maximum: number;
  /** Requested tick count the step is sized toward, 2–12. */
  readonly targetCount: number;
  readonly subject: string;
}): ChartTickSet {
  const { minimum, maximum, targetCount, subject } = options;
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) {
    throw new TypeError(`${subject} tick domain must be finite.`);
  }
  if (minimum >= maximum) {
    throw new TypeError(
      `${subject} tick domain must span upward; received ${minimum} to ${maximum}`,
    );
  }
  if (
    !Number.isInteger(targetCount) || targetCount < 2 || targetCount > 12
  ) {
    throw new TypeError(
      `${subject} target tick count must be an integer between 2 and 12; received ${targetCount}`,
    );
  }
  const minimumDecimal = chartDecimalFromNumber(
    minimum,
    `${subject} tick minimum`,
  );
  const maximumDecimal = chartDecimalFromNumber(
    maximum,
    `${subject} tick maximum`,
  );
  const span = subtractChartDecimals(maximumDecimal, minimumDecimal);
  const step = niceStep(span, targetCount - 1);
  const stepDecimal: ChartDecimal = {
    coefficient: BigInt(step.mantissa),
    exponent: step.exponent,
  };
  const low = alignChartDecimals(
    minimumDecimal,
    stepDecimal,
  );
  const high = alignChartDecimals(
    maximumDecimal,
    stepDecimal,
  );
  const first = floorDivide(low.left, low.right);
  const last = ceilDivide(high.left, high.right);
  const ticks: ChartTick[] = [];
  for (let index = first; index <= last; index += 1n) {
    const value: ChartDecimal = {
      coefficient: index * BigInt(step.mantissa),
      exponent: step.exponent,
    };
    ticks.push({
      value,
      number: chartDecimalToNumber(value),
      label: renderChartDecimal(value, true),
    });
  }
  return {
    step,
    decimals: Math.max(0, -step.exponent),
    ticks,
  };
}

/** The complete deterministic tick selection for one log domain. */
export interface ChartLogTickSet {
  /** True when a narrow decade span subdivided at the 2 and 5 mantissas. */
  readonly subdivided: boolean;
  /** Ticks covering the domain outward: first ≤ minimum, last ≥ maximum. */
  readonly ticks: readonly ChartTick[];
}

function logTick(coefficient: bigint, exponent: number): ChartTick {
  const value: ChartDecimal = { coefficient, exponent };
  return {
    value,
    number: chartDecimalToNumber(value),
    label: renderChartDecimal(value, true),
  };
}

/**
 * Choose ticks for one strictly positive log domain: decade marks at every
 * power of ten covering the domain outward, subdividing with the 2 and 5
 * mantissas when the span holds three decade marks or fewer. Labels render
 * each exact value at its natural precision — a shared fraction length would
 * misstate magnitudes that differ by design.
 */
export function chartLogTicks(options: {
  readonly minimum: number;
  readonly maximum: number;
  readonly subject: string;
}): ChartLogTickSet {
  const { minimum, maximum, subject } = options;
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) {
    throw new TypeError(`${subject} tick domain must be finite.`);
  }
  if (minimum <= 0) {
    throw new TypeError(
      `${subject} log tick domain must be strictly positive; received ${minimum}`,
    );
  }
  if (minimum >= maximum) {
    throw new TypeError(
      `${subject} tick domain must span upward; received ${minimum} to ${maximum}`,
    );
  }
  const low = chartDecimalFromNumber(minimum, `${subject} tick minimum`);
  const high = chartDecimalFromNumber(maximum, `${subject} tick maximum`);
  const lowOrder = chartDecimalOrder(low);
  const highDecadeExact = compareChartDecimals(high, {
    coefficient: 1n,
    exponent: chartDecimalOrder(high),
  }) === 0;
  const highOrder = highDecadeExact
    ? chartDecimalOrder(high)
    : chartDecimalOrder(high) + 1;
  const subdivided = highOrder - lowOrder + 1 <= 3;
  const candidates: ChartTick[] = [];
  for (let order = lowOrder; order <= highOrder; order += 1) {
    candidates.push(logTick(1n, order));
    if (subdivided) {
      candidates.push(logTick(2n, order), logTick(5n, order));
    }
  }
  const lastAtOrBelow = candidates.reduce(
    (found, tick, index) =>
      compareChartDecimals(tick.value, low) <= 0 ? index : found,
    0,
  );
  const firstAtOrAbove = candidates.findIndex((tick) =>
    compareChartDecimals(tick.value, high) >= 0
  );
  return {
    subdivided,
    ticks: candidates.slice(
      lastAtOrBelow,
      (firstAtOrAbove === -1 ? candidates.length - 1 : firstAtOrAbove) + 1,
    ),
  };
}

/** The calendar rhythm one time tick step walks. */
export type ChartTimeTickUnit = "day" | "month" | "year";

/** One time tick: the day ordinal, its full ISO date, and its unit label. */
export interface ChartTimeTick {
  readonly ordinal: number;
  readonly iso: string;
  readonly label: string;
}

/** The complete deterministic tick selection for one date domain. */
export interface ChartTimeTickSet {
  readonly unit: ChartTimeTickUnit;
  /** Step count in the selected unit: 1/2/7/14 days, 1/3/6 months, 1-2-5 years. */
  readonly step: number;
  /** Ticks covering the domain outward within the representable calendar. */
  readonly ticks: readonly ChartTimeTick[];
}

/** The pinned calendar step ladder, finest first. */
const TIME_STEPS: readonly {
  readonly unit: ChartTimeTickUnit;
  readonly step: number;
}[] = [
  { unit: "day", step: 1 },
  { unit: "day", step: 2 },
  { unit: "day", step: 7 },
  { unit: "day", step: 14 },
  { unit: "month", step: 1 },
  { unit: "month", step: 3 },
  { unit: "month", step: 6 },
];

function timeTick(ordinal: number, unit: ChartTimeTickUnit): ChartTimeTick {
  const iso = isoDateFromOrdinal(ordinal, "Chart time tick");
  const label = unit === "day"
    ? iso
    : unit === "month"
    ? iso.slice(0, 7)
    : iso.slice(0, 4);
  return { ordinal, iso, label };
}

/** Clamp one outward tick ordinal to the representable calendar edge. */
function clampTick(ordinal: number, unit: ChartTimeTickUnit): ChartTimeTick {
  if (ordinal < 0) return timeTick(0, unit);
  if (ordinal > CHART_MAX_DATE_ORDINAL) {
    // The calendar edge is not an aligned boundary, so the label keeps the
    // exact full date rather than implying a unit-start it does not sit on.
    return timeTick(CHART_MAX_DATE_ORDINAL, "day");
  }
  return timeTick(ordinal, unit);
}

function calendarParts(
  ordinal: number,
): { readonly year: number; readonly month: number } {
  const parsed = parseIsoCalendarDate(
    isoDateFromOrdinal(ordinal, "Chart time tick"),
  );
  if (typeof parsed === "string") {
    throw new TypeError(`Chart time tick ordinal ${ordinal} is unreadable.`);
  }
  return { year: parsed.year, month: parsed.month };
}

function monthStartOrdinal(monthIndex: number): number {
  const year = Math.floor(monthIndex / 12) + 1;
  const month = (monthIndex % 12) + 1;
  if (year > 9_999) return CHART_MAX_DATE_ORDINAL + 1;
  const parsed = parseIsoCalendarDate(
    `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`,
  );
  if (typeof parsed === "string") {
    throw new TypeError(`Chart time tick month ${monthIndex} is unreadable.`);
  }
  return parsed.ordinal;
}

function floorAlign(index: number, step: number): number {
  return Math.floor(index / step) * step;
}

function yearStartOrdinal(year: number): number {
  if (year < 1) return -1;
  if (year > 9_999) return CHART_MAX_DATE_ORDINAL + 1;
  const parsed = parseIsoCalendarDate(
    `${String(year).padStart(4, "0")}-01-01`,
  );
  if (typeof parsed === "string") {
    throw new TypeError(`Chart time tick year ${year} is unreadable.`);
  }
  return parsed.ordinal;
}

/** One calendar rhythm as an integer grid of unit starts. */
interface TimeUnitGrid {
  readonly indexOf: (ordinal: number) => number;
  /** May fall outside the representable calendar at either edge. */
  readonly startOrdinal: (index: number) => number;
}

function timeUnitGrid(unit: ChartTimeTickUnit): TimeUnitGrid {
  if (unit === "day") {
    return { indexOf: (ordinal) => ordinal, startOrdinal: (index) => index };
  }
  if (unit === "month") {
    return {
      indexOf: (ordinal) => {
        const parts = calendarParts(ordinal);
        return (parts.year - 1) * 12 + (parts.month - 1);
      },
      startOrdinal: monthStartOrdinal,
    };
  }
  return {
    indexOf: (ordinal) => calendarParts(ordinal).year,
    startOrdinal: yearStartOrdinal,
  };
}

/** Aligned first and last unit indexes covering the domain outward. */
function timeTickWindow(
  grid: TimeUnitGrid,
  minimum: number,
  maximum: number,
  step: number,
): { readonly first: number; readonly last: number; readonly count: number } {
  const first = floorAlign(grid.indexOf(minimum), step);
  let last = floorAlign(grid.indexOf(maximum), step);
  while (grid.startOrdinal(last) < maximum) last += step;
  return { first, last, count: (last - first) / step + 1 };
}

/**
 * Choose ticks for one proleptic-Gregorian day-ordinal domain: the finest
 * pinned calendar step — days, Monday-aligned weeks, month starts, or 1-2-5
 * year starts — whose outward coverage stays within the requested count.
 * Labels are ISO dates truncated to the step's unit; ordinal zero is a
 * Monday, so the 7- and 14-day steps land on Mondays by construction.
 */
export function chartTimeTicks(options: {
  readonly minimumOrdinal: number;
  readonly maximumOrdinal: number;
  /** Maximum tick count the step is sized toward, 2–12. */
  readonly targetCount: number;
  readonly subject: string;
}): ChartTimeTickSet {
  const { minimumOrdinal, maximumOrdinal, targetCount, subject } = options;
  for (
    const [label, value] of [
      ["minimum", minimumOrdinal],
      ["maximum", maximumOrdinal],
    ] as const
  ) {
    if (
      !Number.isSafeInteger(value) || value < 0 ||
      value > CHART_MAX_DATE_ORDINAL
    ) {
      throw new TypeError(
        `${subject} ${label} ordinal must lie within the representable calendar; received ${value}`,
      );
    }
  }
  if (minimumOrdinal >= maximumOrdinal) {
    throw new TypeError(
      `${subject} tick domain must span upward; received ${minimumOrdinal} to ${maximumOrdinal}`,
    );
  }
  if (!Number.isInteger(targetCount) || targetCount < 2 || targetCount > 12) {
    throw new TypeError(
      `${subject} target tick count must be an integer between 2 and 12; received ${targetCount}`,
    );
  }
  const steps: { readonly unit: ChartTimeTickUnit; readonly step: number }[] = [
    ...TIME_STEPS,
  ];
  for (let years = 1; years <= 10_000; years *= 10) {
    steps.push(
      { unit: "year", step: years },
      { unit: "year", step: years * 2 },
      { unit: "year", step: years * 5 },
    );
  }
  for (const candidate of steps) {
    const grid = timeUnitGrid(candidate.unit);
    const window = timeTickWindow(
      grid,
      minimumOrdinal,
      maximumOrdinal,
      candidate.step,
    );
    if (window.count > targetCount) continue;
    const ticks: ChartTimeTick[] = [];
    for (
      let index = window.first;
      index <= window.last;
      index += candidate.step
    ) {
      ticks.push(clampTick(grid.startOrdinal(index), candidate.unit));
    }
    return { ...candidate, ticks };
  }
  throw new TypeError(`${subject} tick domain exceeds the calendar ladder.`);
}
