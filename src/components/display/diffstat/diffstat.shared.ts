/**
 * Framework-neutral allocation shared by Diffstat renderers.
 *
 * @module
 */

/** One proportional visual share in a Diffstat bar. */
export type DiffstatShare = "added" | "removed" | "neutral";

/** Allocate a fixed-width Diffstat bar without hiding either non-zero side. */
export function allocateDiffstatBlocks(
  added: number,
  removed: number,
  blocks: number,
): readonly DiffstatShare[] {
  const total = added + removed;
  if (total === 0) return Array.from({ length: blocks }, () => "neutral");
  let plus = Math.round((added / total) * blocks);
  if (added > 0 && plus === 0) plus = 1;
  if (removed > 0 && plus === blocks) plus = blocks - 1;
  return Array.from(
    { length: blocks },
    (_, index) => index < plus ? "added" : "removed",
  );
}
