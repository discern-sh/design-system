/**
 * Internal tallies of the layout steps the terminal text helpers take that
 * grapheme segmentation does not show: a piece tried on an open line, and a
 * styled run read while slicing styling onto produced text. A complexity
 * guard counts them beside the segmentation a call causes as its input
 * grows, so work that re-lays out or re-reads what it already passed shows
 * up as a count rather than a duration. Counting runs only for the length of
 * one {@linkcode countLayoutSteps} call; otherwise a step checks one
 * variable. The module is not part of the public `./cli` surface.
 *
 * @module
 */

/** Layout steps one call took, by kind. */
export interface LayoutSteps {
  /** Pieces tried on an open line: joined after a space, or found not to fit. */
  lineExtensions: number;
  /** Styled runs a reader stepped past or sliced. */
  runVisits: number;
}

let counting: LayoutSteps | undefined;

/** Count one step of `kind` while a {@linkcode countLayoutSteps} call runs. */
export function tallyLayoutStep(kind: keyof LayoutSteps): void {
  if (counting !== undefined) counting[kind] += 1;
}

/** Run `run` and return the layout steps it took. */
export function countLayoutSteps(run: () => unknown): LayoutSteps {
  const steps: LayoutSteps = { lineExtensions: 0, runVisits: 0 };
  const outer = counting;
  counting = steps;
  try {
    run();
  } finally {
    counting = outer;
  }
  return steps;
}
