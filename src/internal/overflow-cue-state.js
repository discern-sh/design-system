/** @typedef {"block" | "inline" | "both"} OverflowCueAxis */
/** @typedef {"default" | "negative" | "reverse"} RtlScrollType */

/**
 * @typedef OverflowCueMetrics
 * @property {number} scrollTop
 * @property {number} scrollLeft
 * @property {number} scrollWidth
 * @property {number} scrollHeight
 * @property {number} clientWidth
 * @property {number} clientHeight
 * @property {"ltr" | "rtl"} direction
 */

/**
 * @typedef OverflowCueState
 * @property {boolean} blockStart
 * @property {boolean} blockEnd
 * @property {boolean} inlineStart
 * @property {boolean} inlineEnd
 */

/** Supported logical axes in stable public order. */
export const overflowCueAxes = /** @type {const} */ ([
  "block",
  "inline",
  "both",
]);

/** Stable markup attributes shared by the React and raw-HTML contracts. */
export const overflowCueMarkupAttributes = /** @type {const} */ ({
  root: "data-discern-overflow-cue",
  target: "data-discern-overflow-cue-target",
  axis: "data-discern-overflow-cue-axis",
  enhanced: "data-discern-overflow-cue-enhanced",
  direction: "data-discern-overflow-cue-direction",
});

/** Stable logical-edge names used by decorative cue elements. */
export const overflowCueEdgeNames = /** @type {const} */ ({
  blockStart: "block-start",
  blockEnd: "block-end",
  inlineStart: "inline-start",
  inlineEnd: "inline-end",
});

/** Stable data attributes carrying the current logical-edge state. */
export const overflowCueStateAttributes = /** @type {const} */ ({
  blockStart: "data-discern-overflow-cue-block-start",
  blockEnd: "data-discern-overflow-cue-block-end",
  inlineStart: "data-discern-overflow-cue-inline-start",
  inlineEnd: "data-discern-overflow-cue-inline-end",
});

const OVERFLOW_EPSILON = 1;

/** @param {number} value @param {number} maximum */
function clampedOffset(value, maximum) {
  return Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), maximum);
}

/**
 * Convert physical `scrollLeft` into distance travelled from logical inline
 * start. The browser behaviour detects its RTL convention once and delegates
 * every inline edge decision to this authority.
 *
 * @param {number} scrollLeft
 * @param {number} maximum
 * @param {"ltr" | "rtl"} direction
 * @param {RtlScrollType} rtlScrollType
 */
export function logicalInlineScrollOffset(
  scrollLeft,
  maximum,
  direction,
  rtlScrollType,
) {
  const boundedMaximum = Math.max(0, maximum);
  if (direction !== "rtl") {
    return clampedOffset(scrollLeft, boundedMaximum);
  }
  if (rtlScrollType === "negative") {
    return clampedOffset(-scrollLeft, boundedMaximum);
  }
  if (rtlScrollType === "default") {
    return clampedOffset(boundedMaximum - scrollLeft, boundedMaximum);
  }
  return clampedOffset(scrollLeft, boundedMaximum);
}

/**
 * Measure which logical edges still hide scrollable content.
 *
 * @param {OverflowCueMetrics} metrics
 * @param {OverflowCueAxis} axis
 * @param {RtlScrollType} rtlScrollType
 * @returns {OverflowCueState}
 */
export function measureOverflowCueState(metrics, axis, rtlScrollType) {
  const maximumBlock = Math.max(
    0,
    metrics.scrollHeight - metrics.clientHeight,
  );
  const maximumInline = Math.max(
    0,
    metrics.scrollWidth - metrics.clientWidth,
  );
  const blockOffset = clampedOffset(metrics.scrollTop, maximumBlock);
  const inlineOffset = logicalInlineScrollOffset(
    metrics.scrollLeft,
    maximumInline,
    metrics.direction,
    rtlScrollType,
  );
  const measuresBlock = axis === "block" || axis === "both";
  const measuresInline = axis === "inline" || axis === "both";
  const blockOverflows = maximumBlock > OVERFLOW_EPSILON;
  const inlineOverflows = maximumInline > OVERFLOW_EPSILON;

  return {
    blockStart: measuresBlock && blockOverflows &&
      blockOffset > OVERFLOW_EPSILON,
    blockEnd: measuresBlock && blockOverflows &&
      maximumBlock - blockOffset > OVERFLOW_EPSILON,
    inlineStart: measuresInline && inlineOverflows &&
      inlineOffset > OVERFLOW_EPSILON,
    inlineEnd: measuresInline && inlineOverflows &&
      maximumInline - inlineOffset > OVERFLOW_EPSILON,
  };
}
