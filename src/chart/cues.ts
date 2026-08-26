/**
 * Projection-neutral non-colour cue vocabulary for chart paint roles.
 *
 * @module
 */

import type { ChartMarkPaintRole, ChartSeriesPaintRole } from "./scene.ts";

const SERIES_STROKE_PATTERNS = {
  "series-1": undefined,
  "series-2": "7 3",
  "series-3": "2 2",
  "series-4": "8 2 2 2",
  "series-5": "1 3",
  "series-6": "10 3 2 3",
} as const satisfies Readonly<
  Record<ChartSeriesPaintRole, string | undefined>
>;

const RAMP_STROKE_PATTERNS = {
  "ramp-1": undefined,
  "ramp-2": "6 2",
  "ramp-3": "2 2",
  "ramp-4": "1 2",
} as const satisfies Readonly<
  Record<Exclude<ChartMarkPaintRole, ChartSeriesPaintRole>, string | undefined>
>;

/**
 * Resolve one paint role's stable outline treatment. A missing dash array is
 * the solid first slot; every later slot has a distinct treatment. Paths use
 * the cue continuously, while rectangular marks reveal it when forced-colour
 * CSS supplies their common system-colour outline.
 */
export function chartPaintStrokeDasharray(
  paint: ChartMarkPaintRole,
): string | undefined {
  return paint.startsWith("series-")
    ? SERIES_STROKE_PATTERNS[paint as ChartSeriesPaintRole]
    : RAMP_STROKE_PATTERNS[
      paint as Exclude<ChartMarkPaintRole, ChartSeriesPaintRole>
    ];
}
