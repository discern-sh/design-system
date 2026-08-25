/**
 * Deterministic chart scales: linear for measured values and band for
 * ordered categories. Time and logarithmic scales arrive with the kind
 * library, not here. Scales map domain facts to unrounded scene positions;
 * scene emission owns coordinate precision.
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
  return scale.rangeStart +
    (value - scale.domainMin) / (scale.domainMax - scale.domainMin) *
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
