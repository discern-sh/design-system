/**
 * Framework-neutral vocabulary shared by Worklog renderers.
 *
 * @module
 */

/** Progress state shared by web and CLI Worklog entries. */
export type WorklogStatus =
  | "done"
  | "active"
  | "queued"
  | "failed"
  | "skipped";
