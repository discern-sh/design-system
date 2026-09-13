import { routinePositions, type RoutineRecord } from "../routine-groups.ts";

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

/** Adjacent routine work entries share a status; active and failed steps stay separate. */
export function worklogPositions(
  entries: readonly (RoutineRecord & { readonly status: WorklogStatus })[],
) {
  return routinePositions(
    entries,
    (left, right) =>
      left.status === right.status &&
      ["done", "queued", "skipped"].includes(left.status),
  );
}
