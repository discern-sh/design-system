/** Shared exact SVG geometry used by the string and React projections. */

import { formatSvgNumber, formatSvgPoints } from "../internal/svg.ts";
import type {
  DiagramPoint,
  DiagramRect,
  DiagramShape,
  DiagramTextLine,
} from "./scene.ts";

/** SVG-ready rectangle geometry. */
export interface DiagramSvgRectGeometry extends DiagramRect {
  readonly kind: "rect";
  readonly radius: number;
}

/** SVG-ready polygon geometry. */
export interface DiagramSvgPolygonGeometry {
  readonly kind: "polygon";
  readonly points: readonly DiagramPoint[];
}

/** Closed SVG geometry derived from one scene shape. */
export type DiagramSvgShapeGeometry =
  | DiagramSvgRectGeometry
  | DiagramSvgPolygonGeometry;

/** Canonically format one finite scene number for portable SVG bytes. */
export function formatDiagramSvgNumber(value: number): string {
  return formatSvgNumber(value, "Diagram");
}

/** Format an ordered point population for SVG `points`. */
export function formatDiagramSvgPoints(
  points: readonly DiagramPoint[],
): string {
  return formatSvgPoints(points, "Diagram");
}

/** Centre anchor for a conservatively measured scene text line. */
export function diagramSvgTextAnchorX(
  line: Pick<DiagramTextLine, "x" | "width">,
): number {
  return line.x + line.width / 2;
}

/** Project one closed scene shape to its exact SVG primitive geometry. */
export function diagramSvgShapeGeometry(
  shape: DiagramShape,
): DiagramSvgShapeGeometry {
  const { x, y, width, height } = shape.bounds;
  if (shape.shape === "diamond") {
    return Object.freeze({
      kind: "polygon",
      points: Object.freeze([
        Object.freeze({ x: x + width / 2, y }),
        Object.freeze({ x: x + width, y: y + height / 2 }),
        Object.freeze({ x: x + width / 2, y: y + height }),
        Object.freeze({ x, y: y + height / 2 }),
      ]),
    });
  }
  return Object.freeze({
    kind: "rect",
    x,
    y,
    width,
    height,
    radius: shape.shape === "capsule" ? height / 2 : shape.radius,
  });
}

/** Inset cue geometry used by the non-colour end-node treatment. */
export function diagramSvgInsetRect(
  rect: DiagramSvgRectGeometry,
  inset = 4,
): DiagramSvgRectGeometry {
  return Object.freeze({
    kind: "rect",
    x: rect.x + inset,
    y: rect.y + inset,
    width: rect.width - inset * 2,
    height: rect.height - inset * 2,
    radius: Math.max(0, rect.radius - inset),
  });
}
