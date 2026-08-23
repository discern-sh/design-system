/**
 * Shared deterministic geometry constants and arithmetic for diagram layout.
 *
 * @module
 */

import type { DiagramPoint, DiagramRect } from "./scene.ts";

/**
 * First-slice visual grammar. The four-pixel rhythm intentionally matches the
 * design system's authored spacing input without importing CSS presentation.
 */
export const DIAGRAM_GEOMETRY = Object.freeze({
  rhythm: 4,
  precision: 2,
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

/** Round one coordinate to the package's stable scene precision. */
export function roundDiagramNumber(value: number): number {
  const factor = 10 ** DIAGRAM_GEOMETRY.precision;
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** Right edge of positive rectangle bounds. */
export function diagramRectRight(rect: DiagramRect): number {
  return rect.x + rect.width;
}

/** Bottom edge of positive rectangle bounds. */
export function diagramRectBottom(rect: DiagramRect): number {
  return rect.y + rect.height;
}

/** Bounds around a non-empty point population, optionally expanded. */
export function diagramPointBounds(
  points: readonly DiagramPoint[],
  expansion = 0,
): DiagramRect {
  if (points.length === 0) {
    throw new TypeError("Diagram point bounds require at least one point.");
  }
  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  const left = Math.min(...xs) - expansion;
  const top = Math.min(...ys) - expansion;
  const right = Math.max(...xs) + expansion;
  const bottom = Math.max(...ys) + expansion;
  return {
    x: roundDiagramNumber(left),
    y: roundDiagramNumber(top),
    width: roundDiagramNumber(right - left),
    height: roundDiagramNumber(bottom - top),
  };
}

/** Tight union of a non-empty rectangle population. */
export function diagramRectUnion(rects: readonly DiagramRect[]): DiagramRect {
  if (rects.length === 0) {
    throw new TypeError("Diagram rectangle union requires at least one bound.");
  }
  const left = Math.min(...rects.map(({ x }) => x));
  const top = Math.min(...rects.map(({ y }) => y));
  const right = Math.max(...rects.map(diagramRectRight));
  const bottom = Math.max(...rects.map(diagramRectBottom));
  return {
    x: roundDiagramNumber(left),
    y: roundDiagramNumber(top),
    width: roundDiagramNumber(right - left),
    height: roundDiagramNumber(bottom - top),
  };
}

/** Whether two rectangles overlap after applying a requested clear space. */
export function diagramRectsOverlap(
  left: DiagramRect,
  right: DiagramRect,
  clearance = 0,
): boolean {
  return left.x < diagramRectRight(right) + clearance &&
    diagramRectRight(left) + clearance > right.x &&
    left.y < diagramRectBottom(right) + clearance &&
    diagramRectBottom(left) + clearance > right.y;
}

/** Whether outer bounds contain inner bounds with a minimum clear space. */
export function diagramRectContains(
  outer: DiagramRect,
  inner: DiagramRect,
  clearance = 0,
): boolean {
  return inner.x >= outer.x + clearance &&
    inner.y >= outer.y + clearance &&
    diagramRectRight(inner) <= diagramRectRight(outer) - clearance &&
    diagramRectBottom(inner) <= diagramRectBottom(outer) - clearance;
}

/** Expand rectangle bounds equally in every direction. */
export function expandDiagramRect(
  rect: DiagramRect,
  amount: number,
): DiagramRect {
  return {
    x: rect.x - amount,
    y: rect.y - amount,
    width: rect.width + amount * 2,
    height: rect.height + amount * 2,
  };
}
