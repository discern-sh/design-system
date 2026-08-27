/**
 * Framework-neutral vocabulary shared by Result summary renderers.
 *
 * @module
 */

/** Canonical result-state enrollment shared by Result summary renderers. */
export const RESULT_SUMMARY_STATES = [
  "passed",
  "failed",
  "blocked",
  "changed",
  "declared",
  "unchanged",
] as const;

/** Result states shared by web and CLI Result summary renderers. */
export type ResultSummaryState = (typeof RESULT_SUMMARY_STATES)[number];

/** Visible labels for every canonical Result summary state. */
export const RESULT_SUMMARY_STATE_LABELS = {
  passed: "Passed",
  failed: "Failed",
  blocked: "Blocked",
  changed: "Changed",
  declared: "Declared",
  unchanged: "Unchanged",
} as const satisfies Readonly<Record<ResultSummaryState, string>>;
