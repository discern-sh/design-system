/**
 * Shared deterministic geometry constants and arithmetic for chart layout.
 *
 * @module
 */

import {
  roundToPrecision,
  SCENE_PRECISION,
  scenePointBounds,
  sceneRectUnion,
} from "../internal/geometry.ts";
import type { ChartPoint, ChartRect } from "./scene.ts";

/**
 * Chart visual grammar. The four-pixel rhythm matches the design system's
 * authored spacing input without importing CSS presentation; the sparse-tick
 * and single-hairline-axis posture is the editorial character the family
 * commits to.
 */
export const CHART_GEOMETRY = Object.freeze({
  rhythm: 4,
  precision: SCENE_PRECISION,
  canvasPadding: 24,
  plot: Object.freeze({
    /** Extent of the value direction in scene units. */
    valueExtent: 240,
    /** Category step for one mark per category. */
    categoryStepBase: 56,
    /** Extra category step per additional grouped series. */
    categoryStepPerSeries: 16,
    /** Fraction of each category step given to the gap. */
    categoryGapRatio: 0.3,
    /** Fraction of each within-group step given to the gap. */
    seriesGapRatio: 0.15,
  }),
  axis: Object.freeze({
    lineWidth: 1.5,
    /** Gap between the plot area and its tick labels. */
    labelGap: 8,
    /** Tick count the value scale is sized toward. */
    valueTickTarget: 5,
  }),
  text: Object.freeze({
    labelSize: 13,
    labelLineHeight: 17,
    clearance: 4,
  }),
});

export {
  expandSceneRect as expandChartRect,
  sceneRectBottom as chartRectBottom,
  sceneRectContains as chartRectContains,
  sceneRectRight as chartRectRight,
  sceneRectsOverlap as chartRectsOverlap,
} from "../internal/geometry.ts";

/** Round one coordinate to the package's stable scene precision. */
export function roundChartNumber(value: number): number {
  return roundToPrecision(value, CHART_GEOMETRY.precision);
}

/** Bounds around a non-empty point population, optionally expanded. */
export function chartPointBounds(
  points: readonly ChartPoint[],
  expansion = 0,
): ChartRect {
  return scenePointBounds(points, expansion, CHART_GEOMETRY.precision, "Chart");
}

/** Tight union of a non-empty rectangle population. */
export function chartRectUnion(rects: readonly ChartRect[]): ChartRect {
  return sceneRectUnion(rects, CHART_GEOMETRY.precision, "Chart");
}
