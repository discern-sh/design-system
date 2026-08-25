/**
 * The closed, locale-free chart number format vocabulary.
 *
 * Authors select one of these formats per axis or annotation; every member
 * renders through the scaled-decimal integer authority, so equal inputs
 * produce byte-identical labels on every engine. The vocabulary is designed
 * as future public API: its members are contract from birth.
 *
 * @module
 */

import {
  type ChartDecimal,
  chartDecimalDigits,
  chartDecimalFromNumber,
  compareChartDecimals,
  normalizeChartDecimal,
  renderChartDecimal,
  roundChartDecimal,
} from "./decimal.ts";

/** Plain decimal notation at a fixed precision, optionally grouped. */
export interface ChartDecimalFormat {
  readonly kind: "decimal";
  /** Exact fraction digits rendered, 0–12. */
  readonly decimals: number;
  /** Canonical comma thousands grouping; off unless requested. */
  readonly grouping?: boolean;
}

/** Percentage notation: the value 0.5 renders as `50%`. */
export interface ChartPercentFormat {
  readonly kind: "percent";
  /** Exact fraction digits rendered, 0–12. */
  readonly decimals: number;
}

/**
 * Engineering notation with an SI magnitude prefix, `12.5k` style. The
 * prefix alphabet is deliberately printable ASCII on every surface, so
 * micro is written `u`: `p n u m` below one and `k M G T P` above.
 */
export interface ChartSiFormat {
  readonly kind: "si";
  /** Exact fraction digits rendered on the scaled mantissa, 0–12. */
  readonly decimals: number;
}

/** Closed chart number format vocabulary. */
export type ChartNumberFormat =
  | ChartDecimalFormat
  | ChartPercentFormat
  | ChartSiFormat;

const SI_PREFIXES = new Map<number, string>([
  [-12, "p"],
  [-9, "n"],
  [-6, "u"],
  [-3, "m"],
  [0, ""],
  [3, "k"],
  [6, "M"],
  [9, "G"],
  [12, "T"],
  [15, "P"],
]);

const SI_MINIMUM = -12;
const SI_MAXIMUM = 15;

function assertDecimals(decimals: number): void {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 12) {
    throw new TypeError(
      `Chart number format decimals must be an integer between 0 and 12; received ${decimals}`,
    );
  }
}

/** Order of magnitude of a nonzero decimal: `10^order ≤ |value| < 10^(order+1)`. */
function decimalOrder(value: ChartDecimal): number {
  const normalized = normalizeChartDecimal(value);
  return chartDecimalDigits(normalized) + normalized.exponent - 1;
}

function siMagnitude(value: ChartDecimal): number {
  if (value.coefficient === 0n) return 0;
  const magnitude = Math.floor(decimalOrder(value) / 3) * 3;
  return Math.min(SI_MAXIMUM, Math.max(SI_MINIMUM, magnitude));
}

function formatSi(value: ChartDecimal, decimals: number): string {
  let magnitude = siMagnitude(value);
  for (;;) {
    const mantissa = roundChartDecimal(
      { coefficient: value.coefficient, exponent: value.exponent - magnitude },
      -decimals,
    );
    const bound: ChartDecimal = { coefficient: 1000n, exponent: 0 };
    const overflowed = compareChartDecimals(
      {
        coefficient: mantissa.coefficient < 0n
          ? -mantissa.coefficient
          : mantissa.coefficient,
        exponent: mantissa.exponent,
      },
      bound,
    ) >= 0;
    if (overflowed && magnitude < SI_MAXIMUM) {
      magnitude += 3;
      continue;
    }
    return `${renderChartDecimal(mantissa, overflowed)}${
      SI_PREFIXES.get(magnitude) ?? ""
    }`;
  }
}

/**
 * Render one finite number through the closed format vocabulary. Rounding is
 * half-away-from-zero at the format's precision; the digits are assembled by
 * integer arithmetic alone.
 */
export function formatChartNumber(
  value: number,
  format: ChartNumberFormat,
): string {
  assertDecimals(format.decimals);
  const decimal = chartDecimalFromNumber(value, "Chart formatted value");
  if (format.kind === "percent") {
    const scaled = roundChartDecimal(
      { coefficient: decimal.coefficient, exponent: decimal.exponent + 2 },
      -format.decimals,
    );
    return `${renderChartDecimal(scaled)}%`;
  }
  if (format.kind === "si") {
    return formatSi(decimal, format.decimals);
  }
  return renderChartDecimal(
    roundChartDecimal(decimal, -format.decimals),
    format.grouping ?? false,
  );
}
