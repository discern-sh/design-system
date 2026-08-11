/**
 * Framework-neutral vocabulary shared by Ownership badge renderers.
 *
 * @module
 */

/** Canonical ownership relationships named by Ownership badge. */
export const artifactOwnerships = [
  "authored",
  "generated",
  "project-owned",
  "tool-owned",
] as const;

/** One canonical ownership relationship. */
export type ArtifactOwnership = (typeof artifactOwnerships)[number];
