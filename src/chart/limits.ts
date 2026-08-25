/**
 * Universal safety limits applied before kind-specific chart validation.
 *
 * @module
 */

/** Deterministic limits shared by every chart kind. */
export const CHART_COMMON_LIMITS = Object.freeze({
  jsonDepth: 16,
  identifierCharacters: 64,
  titleGraphemes: 96,
  summaryGraphemes: 240,
});
