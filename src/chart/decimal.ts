/**
 * Scaled-decimal integer arithmetic behind chart ticks and number rendering.
 *
 * Every quantized chart numeral is computed here as an exact integer
 * coefficient at a decimal exponent, so labels are byte-identical on every
 * engine: no floating-point intermediate ever reaches a rendered digit, no
 * locale facility is consulted, and rounding is half-away-from-zero at every
 * quantization point.
 *
 * @module
 */

/** One exact decimal value: `coefficient × 10^exponent`. */
export interface ChartDecimal {
  readonly coefficient: bigint;
  readonly exponent: number;
}

const CANONICAL_NUMBER = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/u;

/**
 * Read one finite number into its exact canonical decimal form, using the
 * shortest round-trip decimal representation the language pins for every
 * engine.
 */
export function chartDecimalFromNumber(
  value: number,
  subject: string,
): ChartDecimal {
  if (!Number.isFinite(value)) {
    throw new TypeError(
      `${subject} must be a finite number; received ${value}`,
    );
  }
  const source = String(value);
  const match = CANONICAL_NUMBER.exec(source);
  if (match === null) {
    throw new TypeError(`${subject} has no canonical decimal form: ${source}`);
  }
  const [, sign, integer, fraction = "", exponent = "0"] = match;
  const coefficient = BigInt(`${integer}${fraction}`);
  return {
    coefficient: sign === "-" ? -coefficient : coefficient,
    exponent: Number(exponent) - fraction.length,
  };
}

/** Strip trailing zero digits so equal values share one representation. */
export function normalizeChartDecimal(value: ChartDecimal): ChartDecimal {
  if (value.coefficient === 0n) return { coefficient: 0n, exponent: 0 };
  let coefficient = value.coefficient;
  let exponent = value.exponent;
  while (coefficient % 10n === 0n) {
    coefficient /= 10n;
    exponent += 1;
  }
  return { coefficient, exponent };
}

/** Count of significant decimal digits in the coefficient. */
export function chartDecimalDigits(value: ChartDecimal): number {
  const magnitude = value.coefficient < 0n
    ? -value.coefficient
    : value.coefficient;
  return magnitude.toString().length;
}

/** Express two decimals as integers at their shared smaller exponent. */
export function alignChartDecimals(
  left: ChartDecimal,
  right: ChartDecimal,
): {
  readonly left: bigint;
  readonly right: bigint;
  readonly exponent: number;
} {
  const exponent = Math.min(left.exponent, right.exponent);
  return {
    left: left.coefficient * 10n ** BigInt(left.exponent - exponent),
    right: right.coefficient * 10n ** BigInt(right.exponent - exponent),
    exponent,
  };
}

/** Exact three-way decimal comparison. */
export function compareChartDecimals(
  left: ChartDecimal,
  right: ChartDecimal,
): -1 | 0 | 1 {
  const aligned = alignChartDecimals(left, right);
  if (aligned.left < aligned.right) return -1;
  if (aligned.left > aligned.right) return 1;
  return 0;
}

/**
 * Quantize to a target exponent with half-away-from-zero rounding — the one
 * rounding rule every chart numeral shares. A target at or below the current
 * exponent rescales exactly.
 */
export function roundChartDecimal(
  value: ChartDecimal,
  exponent: number,
): ChartDecimal {
  if (exponent <= value.exponent) {
    return {
      coefficient: value.coefficient * 10n ** BigInt(value.exponent - exponent),
      exponent,
    };
  }
  const divisor = 10n ** BigInt(exponent - value.exponent);
  let quotient = value.coefficient / divisor;
  const remainder = value.coefficient % divisor;
  const magnitude = remainder < 0n ? -remainder : remainder;
  if (magnitude * 2n >= divisor) {
    quotient += value.coefficient < 0n ? -1n : 1n;
  }
  return { coefficient: quotient, exponent };
}

/** Convert back to the nearest number through the exact decimal string. */
export function chartDecimalToNumber(value: ChartDecimal): number {
  return Number(renderChartDecimal(value));
}

function groupIntegerDigits(digits: string): string {
  let grouped = "";
  for (let index = 0; index < digits.length; index += 1) {
    const remaining = digits.length - index;
    grouped += digits[index];
    if (remaining > 1 && remaining % 3 === 1) grouped += ",";
  }
  return grouped;
}

/**
 * Render the exact digits of one decimal: the sign, the integer digits with
 * optional canonical thousands grouping, and — for a negative exponent —
 * exactly that many fraction digits. Grouping is deliberately fixed and
 * locale-independent: comma thousands groups and a full-stop decimal
 * separator.
 */
export function renderChartDecimal(
  value: ChartDecimal,
  grouping = false,
): string {
  const negative = value.coefficient < 0n;
  const digits = (negative ? -value.coefficient : value.coefficient)
    .toString();
  let integer: string;
  let fraction = "";
  if (value.exponent >= 0) {
    integer = digits === "0" ? "0" : `${digits}${"0".repeat(value.exponent)}`;
  } else {
    const places = -value.exponent;
    const padded = digits.padStart(places + 1, "0");
    integer = padded.slice(0, -places);
    fraction = padded.slice(-places);
  }
  const rendered = grouping ? groupIntegerDigits(integer) : integer;
  const sign = negative ? "-" : "";
  return fraction === ""
    ? `${sign}${rendered}`
    : `${sign}${rendered}.${fraction}`;
}
