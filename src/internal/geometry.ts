/**
 * Family-neutral scene geometry arithmetic shared by the kind families.
 *
 * Every function is deterministic and framework-free. Families bind their own
 * precision, tolerance, and diagnostic subject, so refusal messages keep each
 * family's vocabulary while the arithmetic exists exactly once.
 *
 * @module
 */

/** Finite point in scene user-space coordinates. */
export interface ScenePoint {
  readonly x: number;
  readonly y: number;
}

/** Positive axis-aligned bounds in scene user space. */
export interface SceneRect extends ScenePoint {
  readonly width: number;
  readonly height: number;
}

/** Decimal precision pinned for every emitted scene coordinate. */
export const SCENE_PRECISION = 2;

/** Round one coordinate to a stable decimal precision, normalizing `-0`. */
export function roundToPrecision(value: number, precision: number): number {
  const factor = 10 ** precision;
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** Right edge of positive rectangle bounds. */
export function sceneRectRight(rect: SceneRect): number {
  return rect.x + rect.width;
}

/** Bottom edge of positive rectangle bounds. */
export function sceneRectBottom(rect: SceneRect): number {
  return rect.y + rect.height;
}

/** Bounds around a non-empty point population, optionally expanded. */
export function scenePointBounds(
  points: readonly ScenePoint[],
  expansion: number,
  precision: number,
  subject: string,
): SceneRect {
  if (points.length === 0) {
    throw new TypeError(`${subject} point bounds require at least one point.`);
  }
  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  const left = Math.min(...xs) - expansion;
  const top = Math.min(...ys) - expansion;
  const right = Math.max(...xs) + expansion;
  const bottom = Math.max(...ys) + expansion;
  return {
    x: roundToPrecision(left, precision),
    y: roundToPrecision(top, precision),
    width: roundToPrecision(right - left, precision),
    height: roundToPrecision(bottom - top, precision),
  };
}

/** Tight union of a non-empty rectangle population. */
export function sceneRectUnion(
  rects: readonly SceneRect[],
  precision: number,
  subject: string,
): SceneRect {
  if (rects.length === 0) {
    throw new TypeError(
      `${subject} rectangle union requires at least one bound.`,
    );
  }
  const left = Math.min(...rects.map(({ x }) => x));
  const top = Math.min(...rects.map(({ y }) => y));
  const right = Math.max(...rects.map(sceneRectRight));
  const bottom = Math.max(...rects.map(sceneRectBottom));
  return {
    x: roundToPrecision(left, precision),
    y: roundToPrecision(top, precision),
    width: roundToPrecision(right - left, precision),
    height: roundToPrecision(bottom - top, precision),
  };
}

/** Whether two rectangles overlap after applying a requested clear space. */
export function sceneRectsOverlap(
  left: SceneRect,
  right: SceneRect,
  clearance = 0,
): boolean {
  return left.x < sceneRectRight(right) + clearance &&
    sceneRectRight(left) + clearance > right.x &&
    left.y < sceneRectBottom(right) + clearance &&
    sceneRectBottom(left) + clearance > right.y;
}

/** Whether outer bounds contain inner bounds with a minimum clear space. */
export function sceneRectContains(
  outer: SceneRect,
  inner: SceneRect,
  clearance = 0,
): boolean {
  return inner.x >= outer.x + clearance &&
    inner.y >= outer.y + clearance &&
    sceneRectRight(inner) <= sceneRectRight(outer) - clearance &&
    sceneRectBottom(inner) <= sceneRectBottom(outer) - clearance;
}

/** Expand rectangle bounds equally in every direction. */
export function expandSceneRect(rect: SceneRect, amount: number): SceneRect {
  return {
    x: rect.x - amount,
    y: rect.y - amount,
    width: rect.width + amount * 2,
    height: rect.height + amount * 2,
  };
}

/** Whether a point lies inside bounds within a symmetric tolerance. */
export function scenePointInRect(
  point: ScenePoint,
  rect: SceneRect,
  epsilon: number,
): boolean {
  return point.x >= rect.x - epsilon &&
    point.x <= sceneRectRight(rect) + epsilon &&
    point.y >= rect.y - epsilon &&
    point.y <= sceneRectBottom(rect) + epsilon;
}

/** Parametric [entry, exit] interval where a segment meets bounds, if any. */
export function sceneSegmentRectInterval(
  start: ScenePoint,
  end: ScenePoint,
  rect: SceneRect,
  epsilon: number,
): readonly [number, number] | undefined {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  let entry = 0;
  let exit = 1;
  const boundaries = [
    [-dx, start.x - rect.x],
    [dx, sceneRectRight(rect) - start.x],
    [-dy, start.y - rect.y],
    [dy, sceneRectBottom(rect) - start.y],
  ] as const;
  for (const [direction, distance] of boundaries) {
    if (Math.abs(direction) <= epsilon) {
      if (distance < -epsilon) return undefined;
      continue;
    }
    const ratio = distance / direction;
    if (direction < 0) entry = Math.max(entry, ratio);
    else exit = Math.min(exit, ratio);
    if (entry > exit + epsilon) return undefined;
  }
  return [entry, exit];
}

/** Whether a segment touches bounds within a symmetric tolerance. */
export function sceneSegmentIntersectsRect(
  start: ScenePoint,
  end: ScenePoint,
  rect: SceneRect,
  epsilon: number,
): boolean {
  return sceneSegmentRectInterval(start, end, rect, epsilon) !== undefined;
}

/** Whether two segments overlap collinearly along a positive length. */
export function sceneSegmentsOverlap(
  left: readonly [ScenePoint, ScenePoint],
  right: readonly [ScenePoint, ScenePoint],
  epsilon: number,
): boolean {
  const [leftStart, leftEnd] = left;
  const [rightStart, rightEnd] = right;
  const leftDx = leftEnd.x - leftStart.x;
  const leftDy = leftEnd.y - leftStart.y;
  const rightDx = rightEnd.x - rightStart.x;
  const rightDy = rightEnd.y - rightStart.y;
  if (Math.abs(leftDx * rightDy - leftDy * rightDx) > epsilon) return false;
  if (
    Math.abs(
      (rightStart.x - leftStart.x) * leftDy -
        (rightStart.y - leftStart.y) * leftDx,
    ) > epsilon
  ) return false;
  const horizontal = Math.abs(leftDx) >= Math.abs(leftDy);
  const leftValues = horizontal
    ? [leftStart.x, leftEnd.x]
    : [leftStart.y, leftEnd.y];
  const rightValues = horizontal
    ? [rightStart.x, rightEnd.x]
    : [rightStart.y, rightEnd.y];
  return Math.min(Math.max(...leftValues), Math.max(...rightValues)) -
      Math.max(Math.min(...leftValues), Math.min(...rightValues)) > epsilon;
}
