/**
 * Framework-neutral vocabulary shared by Activity log renderers.
 *
 * @module
 */

/**
 * Narration severity carried by one pinned activity log line, mapping
 * one-to-one onto the package narration verbs.
 */
export type ActivityLogLineTone = "success" | "note" | "warning" | "failure";

/** Overall operational state of a rendered activity snapshot. */
export type ActivityLogStatus =
  | "active"
  | "waiting"
  | "blocked"
  | "complete"
  | "cancelled";

/** Visible state labels shared by web and terminal activity projections. */
export const activityStatusLabels: Readonly<Record<ActivityLogStatus, string>> =
  {
    active: "Working",
    waiting: "Waiting",
    blocked: "Blocked",
    complete: "Complete",
    cancelled: "Cancelled",
  };
