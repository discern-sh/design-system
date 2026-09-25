/**
 * Iterations that carry one element of a looped Backdrop phrase through
 * exactly one period.
 *
 * Artwork staggers the elements of a phrase by starting each one partway into
 * a shared loop — a negative delay of `advanceSeconds`. Played for a single
 * iteration, that element would stop `advanceSeconds` short of a full period,
 * and any turn it takes in that stretch would never play. Running it for
 * `1 + advance / period` iterations keeps every element in step with its
 * neighbours for one whole period and ends it on the frame it began with.
 * Only keyframes that return to where they began may be staggered this way;
 * see {@linkcode phraseWait} for those that do not.
 */
export function phraseIterations(
  advanceSeconds: number,
  periodSeconds: number,
): number {
  return Math.round(
    (1 + wrap(advanceSeconds, periodSeconds) / periodSeconds) *
      1e6,
  ) / 1e6;
}

/**
 * Seconds one element of a Backdrop phrase waits for its turn when its
 * keyframes do not return to where they began.
 *
 * Such an element cannot start partway into its loop: it would jump at the
 * loop's seam mid-phrase. Its place in the stagger becomes a wait instead —
 * it rests on its first keyframe, plays its cycle once, and the authored
 * order is kept.
 */
export function phraseWait(
  advanceSeconds: number,
  periodSeconds: number,
): number {
  const advance = wrap(advanceSeconds, periodSeconds);
  return advance === 0
    ? 0
    : Math.round((periodSeconds - advance) * 1000) / 1000;
}

/** The advance folded into one period, after validating both inputs. */
function wrap(advanceSeconds: number, periodSeconds: number): number {
  if (!(periodSeconds > 0) || !Number.isFinite(advanceSeconds)) {
    throw new RangeError(
      `A Backdrop phrase needs a positive period and a finite advance; received ${advanceSeconds}s of ${periodSeconds}s`,
    );
  }
  return ((advanceSeconds % periodSeconds) + periodSeconds) % periodSeconds;
}
