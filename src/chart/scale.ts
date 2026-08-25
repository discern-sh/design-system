/**
 * Deterministic chart scales: linear for measured values, band for ordered
 * categories, log for positive multiplicative domains, and time as linear
 * positioning over proleptic-Gregorian day ordinals. Scales map domain facts
 * to unrounded scene positions; scene emission owns coordinate precision.
 *
 * @module
 */

/** Continuous linear mapping from a value domain onto a scene span. */
export interface ChartLinearScale {
  readonly kind: "linear";
  readonly domainMin: number;
  readonly domainMax: number;
  readonly rangeStart: number;
  readonly rangeEnd: number;
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be finite; received ${value}`);
  }
}

/** Construct a linear scale over a non-degenerate domain and span. */
export function createChartLinearScale(options: {
  readonly domainMin: number;
  readonly domainMax: number;
  readonly rangeStart: number;
  readonly rangeEnd: number;
  readonly subject: string;
}): ChartLinearScale {
  assertFinite(options.domainMin, `${options.subject} domain minimum`);
  assertFinite(options.domainMax, `${options.subject} domain maximum`);
  assertFinite(options.rangeStart, `${options.subject} range start`);
  assertFinite(options.rangeEnd, `${options.subject} range end`);
  if (options.domainMin >= options.domainMax) {
    throw new TypeError(
      `${options.subject} domain must span upward; received ${options.domainMin} to ${options.domainMax}`,
    );
  }
  if (options.rangeStart === options.rangeEnd) {
    throw new TypeError(`${options.subject} range must have positive extent.`);
  }
  return {
    kind: "linear",
    domainMin: options.domainMin,
    domainMax: options.domainMax,
    rangeStart: options.rangeStart,
    rangeEnd: options.rangeEnd,
  };
}

/** Position one in-domain value along the scale's range. */
export function chartLinearPosition(
  scale: ChartLinearScale,
  value: number,
): number {
  assertFinite(value, "Chart linear position value");
  if (value === scale.domainMin) return scale.rangeStart;
  if (value === scale.domainMax) return scale.rangeEnd;

  const normalizer = Math.max(
    Math.abs(scale.domainMin),
    Math.abs(scale.domainMax),
  );
  const scaledMinimum = scale.domainMin / normalizer;
  const fraction = (value / normalizer - scaledMinimum) /
    (scale.domainMax / normalizer - scaledMinimum);
  return scale.rangeStart * (1 - fraction) + scale.rangeEnd * fraction;
}

/**
 * The one logarithm base a chart log scale may use. A pinned base keeps
 * every projection's decade arithmetic and tick labels byte-identical, and
 * base ten is the only base whose ticks read as plain decimal magnitudes.
 */
export const CHART_LOG_BASE = 10;

/**
 * Continuous logarithmic mapping from a strictly positive value domain onto
 * a scene span. Position, not length, encodes the value: length-encoding
 * kinds keep their zero baseline and never construct one of these.
 */
export interface ChartLogScale {
  readonly kind: "log";
  readonly base: typeof CHART_LOG_BASE;
  readonly domainMin: number;
  readonly domainMax: number;
  readonly rangeStart: number;
  readonly rangeEnd: number;
}

/** Construct a log scale over a positive, non-degenerate domain and span. */
export function createChartLogScale(options: {
  readonly domainMin: number;
  readonly domainMax: number;
  readonly rangeStart: number;
  readonly rangeEnd: number;
  readonly subject: string;
}): ChartLogScale {
  assertFinite(options.domainMin, `${options.subject} domain minimum`);
  assertFinite(options.domainMax, `${options.subject} domain maximum`);
  assertFinite(options.rangeStart, `${options.subject} range start`);
  assertFinite(options.rangeEnd, `${options.subject} range end`);
  if (options.domainMin <= 0) {
    throw new TypeError(
      `${options.subject} log domain must be strictly positive; received ${options.domainMin}`,
    );
  }
  if (options.domainMin >= options.domainMax) {
    throw new TypeError(
      `${options.subject} domain must span upward; received ${options.domainMin} to ${options.domainMax}`,
    );
  }
  if (options.rangeStart === options.rangeEnd) {
    throw new TypeError(`${options.subject} range must have positive extent.`);
  }
  return {
    kind: "log",
    base: CHART_LOG_BASE,
    domainMin: options.domainMin,
    domainMax: options.domainMax,
    rangeStart: options.rangeStart,
    rangeEnd: options.rangeEnd,
  };
}

/** Position one strictly positive in-domain value along the scale's range. */
export function chartLogPosition(
  scale: ChartLogScale,
  value: number,
): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError(
      `Chart log position needs a strictly positive finite value; received ${value}`,
    );
  }
  const start = Math.log10(scale.domainMin);
  const extent = Math.log10(scale.domainMax) - start;
  return scale.rangeStart +
    (Math.log10(value) - start) / extent *
      (scale.rangeEnd - scale.rangeStart);
}

/**
 * Discrete band mapping for ordered categories: equal steps, an equal gap
 * between neighbouring bands, and a half-gap at each edge.
 */
export interface ChartBandScale {
  readonly kind: "band";
  readonly count: number;
  readonly rangeStart: number;
  readonly rangeEnd: number;
  readonly step: number;
  readonly bandWidth: number;
}

/** Construct a band scale over one or more ordered members. */
export function createChartBandScale(options: {
  readonly count: number;
  readonly rangeStart: number;
  readonly rangeEnd: number;
  /** Fraction of each step given to the gap, `0 ≤ gap < 1`. */
  readonly gapRatio: number;
  readonly subject: string;
}): ChartBandScale {
  assertFinite(options.rangeStart, `${options.subject} range start`);
  assertFinite(options.rangeEnd, `${options.subject} range end`);
  if (!Number.isInteger(options.count) || options.count < 1) {
    throw new TypeError(
      `${options.subject} band count must be a positive integer; received ${options.count}`,
    );
  }
  if (options.rangeEnd <= options.rangeStart) {
    throw new TypeError(`${options.subject} range must span upward.`);
  }
  if (
    !Number.isFinite(options.gapRatio) || options.gapRatio < 0 ||
    options.gapRatio >= 1
  ) {
    throw new TypeError(
      `${options.subject} gap ratio must satisfy 0 ≤ gap < 1; received ${options.gapRatio}`,
    );
  }
  const step = (options.rangeEnd - options.rangeStart) / options.count;
  return {
    kind: "band",
    count: options.count,
    rangeStart: options.rangeStart,
    rangeEnd: options.rangeEnd,
    step,
    bandWidth: step * (1 - options.gapRatio),
  };
}

/** One band's unrounded span along the scale's range. */
export function chartBandSegment(
  scale: ChartBandScale,
  index: number,
): { readonly start: number; readonly width: number } {
  if (!Number.isInteger(index) || index < 0 || index >= scale.count) {
    throw new TypeError(
      `Chart band index must lie in 0..${scale.count - 1}; received ${index}`,
    );
  }
  const gap = scale.step - scale.bandWidth;
  return {
    start: scale.rangeStart + index * scale.step + gap / 2,
    width: scale.bandWidth,
  };
}
