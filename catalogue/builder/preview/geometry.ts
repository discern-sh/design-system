/** Logical coordinates inside the preview browsing context. */
export interface BuilderPreviewPoint {
  readonly x: number;
  readonly y: number;
}

/** Logical rectangle reported by the preview browsing context. */
export interface BuilderPreviewRect extends BuilderPreviewPoint {
  readonly width: number;
  readonly height: number;
}

/** Map a pointer over the scaled frame back into its logical viewport. */
export function logicalPointFromDisplay(
  pointer: Readonly<{ clientX: number; clientY: number }>,
  frame: Readonly<{ left: number; top: number }>,
  zoom: number,
): BuilderPreviewPoint {
  if (!Number.isFinite(zoom) || zoom <= 0) {
    throw new RangeError("Preview zoom must be a positive finite number.");
  }
  return {
    x: (pointer.clientX - frame.left) / zoom,
    y: (pointer.clientY - frame.top) / zoom,
  };
}

/** Project one logical frame rectangle into the editor overlay plane. */
export function displayRectFromLogical(
  rect: BuilderPreviewRect,
  zoom: number,
): BuilderPreviewRect {
  if (!Number.isFinite(zoom) || zoom <= 0) {
    throw new RangeError("Preview zoom must be a positive finite number.");
  }
  return {
    x: rect.x * zoom,
    y: rect.y * zoom,
    width: rect.width * zoom,
    height: rect.height * zoom,
  };
}

/** Deepest visible node rectangle containing one logical point. */
export function previewNodeAtPoint(
  nodes: readonly Readonly<{ id: string; rect: BuilderPreviewRect }>[],
  point: BuilderPreviewPoint,
): string | null {
  let match: Readonly<{ id: string; rect: BuilderPreviewRect }> | undefined;
  for (const node of nodes) {
    const { rect } = node;
    if (
      point.x < rect.x || point.y < rect.y ||
      point.x > rect.x + rect.width ||
      point.y > rect.y + rect.height
    ) continue;
    if (
      match === undefined ||
      rect.width * rect.height <= match.rect.width * match.rect.height
    ) match = node;
  }
  return match?.id ?? null;
}

/** Editor decoration states cannot let hover replace a selected outline. */
export function previewDecorationFlags(
  id: string,
  selectedId: string | null,
  hoverId: string | null,
  dropId: string | null,
) {
  const selected = id === selectedId;
  return {
    selected,
    hovered: id === hoverId && !selected,
    dropped: id === dropId,
  } as const;
}
