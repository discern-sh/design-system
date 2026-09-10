/**
 * Shared deterministic geometry constants and arithmetic for diagram layout.
 *
 * @module
 */

import {
  roundToPrecision,
  SCENE_PRECISION,
  scenePointBounds,
  sceneRectUnion,
} from "../internal/geometry.ts";
import type { DiagramPoint, DiagramRect } from "./scene.ts";

/**
 * First-slice visual grammar. The four-pixel rhythm intentionally matches the
 * design system's authored spacing input without importing CSS presentation.
 */
export const DIAGRAM_GEOMETRY = Object.freeze({
  rhythm: 4,
  precision: SCENE_PRECISION,
  /**
   * Coincidence tolerance in user-space units. Layout compaction merges
   * neighbouring points closer than this, and conformance treats such points
   * as equal, so a rounding jog can never survive one authority only to be
   * refused by the other.
   */
  tolerance: 0.02,
  canvasPadding: 24,
  node: Object.freeze({
    minimumWidth: 112,
    maximumTextWidth: 176,
    horizontalMaximumTextWidth: 160,
    minimumHeight: 56,
    horizontalPadding: 16,
    verticalPadding: 12,
    annotationGap: 8,
    radius: 8,
    decisionScaleX: 2,
    decisionScaleY: 2,
    rankMemberGap: 48,
    /**
     * How far along a rounded corner's radius a connector port may sit, as a
     * fraction of that radius. Keeping ports within the first 45 degrees of
     * the curve keeps every approach close to perpendicular, so an arrowhead
     * never has to bite into a capsule's tip.
     */
    curvedPortReach: Math.SQRT1_2,
  }),
  text: Object.freeze({
    primarySize: 16,
    primaryLineHeight: 20,
    annotationSize: 13,
    annotationLineHeight: 17,
    edgeSize: 13,
    edgeLineHeight: 17,
    edgeMaximumWidth: 128,
    clearance: 4,
  }),
  connector: Object.freeze({
    lineWidth: 2,
    arrowLength: 10,
    arrowHalfWidth: 5,
    arrowClearance: 4,
    baseRankGap: 96,
    horizontalRankGap: 36,
    laneGap: 30,
    labelGap: 8,
    externalGap: 40,
  }),
});

export {
  expandSceneRect as expandDiagramRect,
  sceneRectBottom as diagramRectBottom,
  sceneRectContains as diagramRectContains,
  sceneRectRight as diagramRectRight,
  sceneRectsOverlap as diagramRectsOverlap,
} from "../internal/geometry.ts";

/** Round one coordinate to the package's stable scene precision. */
export function roundDiagramNumber(value: number): number {
  return roundToPrecision(value, DIAGRAM_GEOMETRY.precision);
}

/** Bounds around a non-empty point population, optionally expanded. */
export function diagramPointBounds(
  points: readonly DiagramPoint[],
  expansion = 0,
): DiagramRect {
  return scenePointBounds(
    points,
    expansion,
    DIAGRAM_GEOMETRY.precision,
    "Diagram",
  );
}

/** Tight union of a non-empty rectangle population. */
export function diagramRectUnion(rects: readonly DiagramRect[]): DiagramRect {
  return sceneRectUnion(rects, DIAGRAM_GEOMETRY.precision, "Diagram");
}
