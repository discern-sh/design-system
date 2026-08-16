/** Pointer geometry for precise root insertion, independent of DOM events. */

export interface RootChildRect {
  readonly top: number;
  readonly bottom: number;
}

export interface RootInsertionGeometry {
  /** Boundary index in the root children array. */
  readonly index: number;
  /** Indicator position relative to the root container's block start. */
  readonly offset: number;
}

/**
 * Choose the before/after boundary nearest the pointer's semantic position.
 * Rectangles must be direct root siblings in document order.
 */
export function rootInsertionFromPointer(
  pointerY: number,
  rects: readonly RootChildRect[],
  containerTop: number,
): RootInsertionGeometry {
  if (rects.length === 0) return { index: 0, offset: 0 };

  let index = rects.length;
  for (const [candidate, rect] of rects.entries()) {
    const midpoint = rect.top + Math.max(0, rect.bottom - rect.top) / 2;
    if (pointerY < midpoint) {
      index = candidate;
      break;
    }
  }

  const first = rects[0];
  const last = rects.at(-1);
  if (first === undefined || last === undefined) return { index: 0, offset: 0 };
  let boundary: number;
  if (index === 0) {
    boundary = first.top;
  } else if (index === rects.length) {
    boundary = last.bottom;
  } else {
    const before = rects[index - 1];
    const after = rects[index];
    boundary = before === undefined || after === undefined
      ? first.top
      : before.bottom + (after.top - before.bottom) / 2;
  }
  return { index, offset: Math.max(0, boundary - containerTop) };
}
