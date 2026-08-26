/**
 * Exact proportional arithmetic shared by chart scenes and terminal frames.
 *
 * Authored finite numbers first become scaled decimal integers. Totals,
 * minimum-resolution checks, and largest-remainder allocation therefore
 * cannot overflow, underflow, or let binary addition order change a result.
 * Scene fractions are derived only after the exact cumulative numerator is
 * known; the final boundary is pinned to one.
 *
 * @module
 */

import { chartDecimalFromNumber } from "./decimal.ts";

interface ScaledShares {
  readonly shares: readonly bigint[];
  readonly total: bigint;
}

function scaledShares(values: readonly number[]): ScaledShares {
  const decimals = values.map((value, index) => {
    if (!Number.isFinite(value) || value < 0) {
      throw new TypeError(
        `Share ${index} must be a finite non-negative number; received ${value}`,
      );
    }
    return chartDecimalFromNumber(value, `Share ${index}`);
  });
  const exponent = Math.min(0, ...decimals.map((value) => value.exponent));
  const shares = Object.freeze(
    decimals.map((value) =>
      value.coefficient * 10n ** BigInt(value.exponent - exponent)
    ),
  );
  return {
    shares,
    total: shares.reduce((sum, share) => sum + share, 0n),
  };
}

function safeInteger(value: bigint): number {
  return value > BigInt(Number.MAX_SAFE_INTEGER)
    ? Number.MAX_SAFE_INTEGER
    : Number(value);
}

function ceilDivide(dividend: bigint, divisor: bigint): bigint {
  return (dividend + divisor - 1n) / divisor;
}

/**
 * Fewest whole units able to give the smallest nonzero share its truthful
 * quota. A larger-than-safe result saturates at `Number.MAX_SAFE_INTEGER`,
 * the largest fact the terminal decline contract can carry.
 */
export function minimumChartProportionalUnits(
  values: readonly number[],
): number {
  const { shares, total } = scaledShares(values);
  if (total === 0n) return 0;
  const positive = shares.filter((share) => share > 0n);
  const smallest = positive.reduce((minimum, share) =>
    share < minimum ? share : minimum
  );
  return safeInteger(ceilDivide(total, smallest));
}

function bigintRatio(numerator: bigint, denominator: bigint): number {
  if (numerator === 0n) return 0;
  if (numerator === denominator) return 1;
  const numeratorDigits = numerator.toString();
  const denominatorDigits = denominator.toString();
  const precision = 16;
  const mantissa = (digits: string): number => {
    const head = digits.slice(0, precision);
    return Number(head) / 10 ** (head.length - 1);
  };
  return mantissa(numeratorDigits) / mantissa(denominatorDigits) *
    10 ** (numeratorDigits.length - denominatorDigits.length);
}

/** Exact cumulative share boundaries converted to deterministic fractions. */
export function chartProportionalCumulativeFractions(
  values: readonly number[],
): readonly number[] {
  const { shares, total } = scaledShares(values);
  if (total === 0n) {
    throw new TypeError("Proportional shares need a nonzero total.");
  }
  let cumulative = 0n;
  return Object.freeze(shares.map((share, index) => {
    cumulative += share;
    return index === shares.length - 1 ? 1 : bigintRatio(cumulative, total);
  }));
}

/**
 * Allocate whole units by exact largest remainder. A nonzero share whose
 * exact quota is below one unit is refused: donating a unit would exaggerate
 * it, while leaving it empty would conceal it.
 */
export function allocateChartProportionalUnits(
  values: readonly number[],
  units: number,
): readonly number[] {
  if (!Number.isSafeInteger(units) || units < 0) {
    throw new TypeError(
      `Unit count must be a non-negative safe integer; received ${units}`,
    );
  }
  const { shares, total } = scaledShares(values);
  if (total === 0n) return Object.freeze(shares.map(() => 0));
  const required = minimumChartProportionalUnits(values);
  if (units < required) {
    throw new TypeError(
      `${units} units cannot render the smallest nonzero share truthfully; allocate at least ${required}`,
    );
  }

  const unitCount = BigInt(units);
  const quotas = shares.map((share, index) => {
    const scaled = share * unitCount;
    return {
      count: scaled / total,
      index,
      remainder: scaled % total,
    };
  });
  const counts = quotas.map(({ count }) => Number(count));
  let remaining = units - counts.reduce((sum, count) => sum + count, 0);
  const byRemainder = quotas.toSorted((left, right) =>
    left.remainder === right.remainder
      ? left.index - right.index
      : left.remainder > right.remainder
      ? -1
      : 1
  );
  for (const { index } of byRemainder) {
    if (remaining === 0) break;
    counts[index] = (counts[index] ?? 0) + 1;
    remaining -= 1;
  }
  if (remaining !== 0) {
    throw new TypeError("Exact proportional allocation left units unassigned.");
  }
  return Object.freeze(counts);
}
