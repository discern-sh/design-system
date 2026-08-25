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
