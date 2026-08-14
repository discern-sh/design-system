/**
 * Framework-neutral vocabulary shared by Result summary renderers.
 *
 * @module
 */

/** Canonical outcome-state enrollment shared by Result summary renderers. */
export const RESULT_SUMMARY_STATES = [
  "passed",
  "failed",
  "blocked",
  "changed",
  "unchanged",
] as const;

/** Outcome states shared by web and CLI Result summary renderers. */
export type ResultSummaryState = (typeof RESULT_SUMMARY_STATES)[number];
