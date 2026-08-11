/**
 * Framework-neutral vocabulary shared by File change renderers.
 *
 * @module
 */

/** Canonical file dispositions named by File change. */
export const fileDispositions = [
  "added",
  "updated",
  "generated",
  "removed",
  "unchanged",
] as const;

/** One canonical file disposition. */
export type FileDisposition = (typeof fileDispositions)[number];

/** Added and removed line counts shown beside one file change. */
export interface FileChangeMagnitude {
  readonly added: number;
  readonly removed: number;
}
