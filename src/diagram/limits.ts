/**
 * Universal safety limits applied before kind-specific diagram validation.
 *
 * @module
 */

/** Deterministic limits shared by every diagram kind. */
export const DIAGRAM_COMMON_LIMITS = Object.freeze({
  jsonDepth: 16,
  identifierCharacters: 64,
  titleGraphemes: 96,
  summaryGraphemes: 240,
});
