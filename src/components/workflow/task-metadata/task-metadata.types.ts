/**
 * Framework-neutral vocabulary shared by Task metadata renderers.
 *
 * @module
 */

/** File-change states carried by Task metadata. */
export type TaskFileEffects = "none" | "may-change" | "changes-files";

/** Retry-safety states carried by Task metadata. */
export type TaskRetrySafety = "safe" | "check-first" | "do-not-retry";
