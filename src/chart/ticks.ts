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
  alignChartDecimals,
  type ChartDecimal,
  chartDecimalFromNumber,
  chartDecimalOrder,
  chartDecimalToNumber,
  compareChartDecimals,
  renderChartDecimal,
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
function niceStep(rough: ChartDecimal): ChartTickStep {
  const order = chartDecimalOrder(rough);
  if (lessThan(rough, 15n, order - 1)) return { mantissa: 1, exponent: order };
  if (lessThan(rough, 3n, order)) return { mantissa: 2, exponent: order };
  if (lessThan(rough, 7n, order)) return { mantissa: 5, exponent: order };
  return { mantissa: 1, exponent: order + 1 };
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
  const rough = chartDecimalFromNumber(
    (maximum - minimum) / (targetCount - 1),
    `${subject} tick interval`,
  );
  const step = niceStep(rough);
  const stepDecimal: ChartDecimal = {
    coefficient: BigInt(step.mantissa),
    exponent: step.exponent,
  };
  const low = alignChartDecimals(
    chartDecimalFromNumber(minimum, `${subject} tick minimum`),
    stepDecimal,
  );
  const high = alignChartDecimals(
    chartDecimalFromNumber(maximum, `${subject} tick maximum`),
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
