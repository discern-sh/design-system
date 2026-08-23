/**
 * Closed projection-neutral geometry emitted by diagram kinds.
 *
 * @module
 */

/** Finite point in diagram user-space coordinates. */
export interface DiagramPoint {
  readonly x: number;
  readonly y: number;
}

/** Positive axis-aligned bounds in diagram user space. */
export interface DiagramRect extends DiagramPoint {
  readonly width: number;
  readonly height: number;
}

/** Semantic paint roles resolved only by a later projection. */
export type DiagramPaintRole =
  | "canvas"
  | "node-surface"
  | "node-border"
  | "node-text"
  | "quiet-annotation"
  | "accent"
  | "focus"
  | "success"
  | "warning"
  | "primary-connector"
  | "secondary-connector"
  | "return-connector"
  | "guide";

/** Paired node treatment selected as one semantic fact. */
export type DiagramNodeStyleRole =
  | "ordinary"
  | "decision"
  | "start"
  | "end"
  | "focus"
  | "success"
  | "warning";

/** Paired connector treatment selected as one semantic fact. */
export type DiagramConnectorStyleRole =
  | "primary"
  | "secondary"
  | "return";

/** Closed first-slice shape repertoire. */
export type DiagramShapeKind =
  | "rounded-rectangle"
  | "diamond"
  | "capsule";

/** One node shape with projection-resolved semantic styling. */
export interface DiagramShape {
  readonly kind: "shape";
  readonly id: string;
  readonly semanticId: string;
  readonly shape: DiagramShapeKind;
  readonly style: DiagramNodeStyleRole;
  readonly bounds: DiagramRect;
  readonly radius: number;
}

/** One measured text line with a conservative left edge and width. */
export interface DiagramTextLine {
  readonly text: string;
  readonly x: number;
  readonly baseline: number;
  readonly width: number;
}

/** Conservative text geometry tied to an owning semantic entity. */
export interface DiagramText {
  readonly kind: "text";
  readonly id: string;
  readonly ownerId: string;
  readonly role: "node-text" | "quiet-annotation" | "connector-label";
  readonly fontRole: "interface" | "mono";
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly bounds: DiagramRect;
  readonly lines: readonly DiagramTextLine[];
}

/** Explicit triangular marker terminating a directed connector. */
export interface DiagramArrowhead {
  readonly tip: DiagramPoint;
  readonly left: DiagramPoint;
  readonly right: DiagramPoint;
  readonly bounds: DiagramRect;
}

/** Orthogonal polyline and arrowhead joining two semantic nodes. */
export interface DiagramConnector {
  readonly kind: "connector";
  readonly id: string;
  readonly semanticId: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly style: DiagramConnectorStyleRole;
  readonly lineWidth: number;
  readonly points: readonly DiagramPoint[];
  readonly arrowhead: DiagramArrowhead;
  readonly bounds: DiagramRect;
}

/** Drawable member of the closed first-slice scene vocabulary. */
export type DiagramSceneElement =
  | DiagramShape
  | DiagramText
  | DiagramConnector;

/** Ordered group of elements or nested groups. */
export interface DiagramSceneGroup {
  readonly id: string;
  readonly children: readonly string[];
}

/** Canvas bounds and semantic background role. */
export interface DiagramCanvas {
  readonly bounds: DiagramRect;
  readonly role: "canvas";
  readonly padding: number;
}

/** Immutable, projection-neutral result of validated diagram layout. */
export interface DiagramScene {
  readonly kind: "diagram-scene";
  readonly sourceKind: string;
  readonly canvas: DiagramCanvas;
  readonly root: readonly string[];
  readonly groups: readonly DiagramSceneGroup[];
  readonly elements: readonly DiagramSceneElement[];
}
