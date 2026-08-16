/**
 * Framework-neutral vocabulary shared by Decision record renderers.
 *
 * @module
 */

/** Canonical statuses rendered by Decision record. */
export const decisionRecordStatuses = ["accepted", "superseded"] as const;

/** One canonical decision-record status. */
export type DecisionRecordStatus = (typeof decisionRecordStatuses)[number];
