/**
 * Framework-neutral quantization and annotation shared by Sparkline
 * renderers.
 *
 * A sparkline is deliberately lossy: it scales its own series to its own
 * extremes, so two sparklines are never comparable and no exact value can be
 * read from the glyphs. The mandatory endpoint annotation carries the
 * numeric truth on every surface, which is why it lives here beside the
 * bucket arithmetic rather than in either renderer.
 *
 * @module
 */

import { chartPlainValue } from "../../../chart/value-text.ts";
import { chartLinearFraction } from "../../../chart/scale.ts";

/** The fixed vertical resolution every Sparkline surface quantizes into. */
export const SPARKLINE_LEVELS = 8;

/** The middle level a flat series maps to, never all-min or all-max. */
export const SPARKLINE_FLAT_LEVEL = 4;

/** Maximum inventory the fixed 100-unit browser view can distinguish. */
const SPARKLINE_MAX_ENTRIES = 100;

/** One authored Sparkline entry: a finite value or an explicit gap. */
export type SparklineValue = number | null;

/** Reject every series that cannot state a truthful movement. */
export function assertSparklineValues(
  values: readonly SparklineValue[],
): void {
  if (!Array.isArray(values) || values.length < 2) {
    throw new TypeError(
      "sparkline values must contain at least two entries of recent movement",
    );
  }
  if (values.length > SPARKLINE_MAX_ENTRIES) {
    throw new TypeError(
      `sparkline values may contain at most ${SPARKLINE_MAX_ENTRIES} entries; received ${values.length}`,
    );
  }
  let stated = 0;
  for (const [index, value] of values.entries()) {
    if (value === null) continue;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(
        `sparkline values[${index}] must be a finite number or an explicit null gap`,
      );
    }
    stated += 1;
  }
  if (stated === 0) {
    throw new TypeError(
      "sparkline values must state at least one finite value",
    );
  }
}

/** The first and last stated values the annotation prints. */
export function sparklineEndpoints(
  values: readonly SparklineValue[],
): { readonly first: number; readonly last: number } {
  const stated = values.filter((value): value is number => value !== null);
  const first = stated[0];
  const last = stated.at(-1);
  if (first === undefined || last === undefined) {
    throw new TypeError(
      "sparkline values must state at least one finite value",
    );
  }
  return { first, last };
}

/**
 * Quantize each stated value into one of the eight levels, preserving gaps.
 * A flat series maps every stated value to the middle level, and bucket
 * ties round half-away-from-zero (fractions here are never negative, so
 * `Math.round` is exactly that rule).
 */
export function sparklineLevels(
  values: readonly SparklineValue[],
): readonly (number | null)[] {
  const normalized = normalizeSparkline(values);
  return normalized.fractions.map((fraction) =>
    fraction === null
      ? null
      : normalized.flat
      ? SPARKLINE_FLAT_LEVEL
      : 1 + Math.round(fraction * (SPARKLINE_LEVELS - 1))
  );
}

interface NormalizedSparkline {
  readonly flat: boolean;
  readonly fractions: readonly (number | null)[];
}

function normalizeSparkline(
  values: readonly SparklineValue[],
): NormalizedSparkline {
  assertSparklineValues(values);
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (value === null) continue;
    if (value < minimum) minimum = value;
    if (value > maximum) maximum = value;
  }
  const flat = minimum === maximum;
  return {
    flat,
    fractions: Object.freeze(
      values.map((value) =>
        value === null
          ? null
          : flat
          ? 0.5
          : chartLinearFraction(minimum, maximum, value)
      ),
    ),
  };
}

/**
 * Shared normalized geometry for browser and terminal projections. Extrema
 * are collected in one pass, avoiding spread argument limits.
 */
export function sparklineFractions(
  values: readonly SparklineValue[],
): readonly (number | null)[] {
  return normalizeSparkline(values).fractions;
}

/**
 * The mandatory endpoint annotation: first stated value to last stated
 * value. The numeric truth never depends on glyph fidelity, so the same
 * canonical decimals print in every charset — only the arrow degrades.
 */
export function sparklineAnnotation(
  values: readonly SparklineValue[],
  unicode: boolean,
): string {
  const { first, last } = sparklineEndpoints(values);
  return `${chartPlainValue(first)}${unicode ? "→" : "->"}${
    chartPlainValue(last)
  }`;
}
