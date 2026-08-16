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
