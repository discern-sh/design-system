/**
 * Framework-neutral vocabulary shared by Result summary renderers.
 *
 * @module
 */

/** Outcome states shared by web and CLI Result summary renderers. */
export type ResultSummaryState =
  | "passed"
  | "failed"
  | "blocked"
  | "changed"
  | "unchanged";
