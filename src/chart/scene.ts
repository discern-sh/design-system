/**
 * Closed projection-neutral geometry emitted by chart kinds.
 *
 * The grammar is only as rich as the bar slice plus the known kind library
 * requires — marks, per-series paths, point populations and area fills,
 * hairline axes, gridlines, reference lines, and anchored single-line tick
 * labels. It is not a general graphics API, and it composes the shared
 * scene geometry types rather than forking them.
 *
 * @module
 */

import type { SceneFontRole } from "../internal/font-metrics.ts";

export type {
  ScenePoint as ChartPoint,
  SceneRect as ChartRect,
} from "../internal/geometry.ts";
import type {
  ScenePoint as ChartPoint,
  SceneRect as ChartRect,
} from "../internal/geometry.ts";

/** One of the six fixed categorical series slots. */
export type ChartSeriesPaintSlot = 1 | 2 | 3 | 4 | 5 | 6;

/** Series paint role carried by every data-encoding element. */
export type ChartSeriesPaintRole = `series-${ChartSeriesPaintSlot}`;

/** One of the four fixed sequential magnitude bins. */
export type ChartRampPaintSlot = 1 | 2 | 3 | 4;

/**
 * Sequential paint role for one declared magnitude bin. The ramp rides the
 * field's active-ink alpha ladder — never a second palette and never a
 * semantic state tone.
 */
export type ChartRampPaintRole = `ramp-${ChartRampPaintSlot}`;

/** Paint role admitted on a value-encoding rectangular mark. */
export type ChartMarkPaintRole = ChartSeriesPaintRole | ChartRampPaintRole;

/** Semantic paint roles resolved only by a later projection. */
export type ChartPaintRole =
  | "canvas"
  | "axis"
  | "grid"
  | "reference"
  | "axis-label"
  | "annotation"
  | ChartSeriesPaintRole
  | ChartRampPaintRole;

/**
 * Fixed paint-layer sequence every scene declares by construction:
 * gridlines beneath marks, reference lines readable above them, then the
 * axis and its labels. Z-order is proven by declaration, not by forbidding
 * crossings.
 */
export const CHART_LAYER_ORDER = [
  "grid",
  "mark",
  "reference",
  "axis",
  "label",
] as const;

/** One paint layer of the fixed sequence. */
export type ChartSceneLayer = typeof CHART_LAYER_ORDER[number];

/** One rectangular mark whose length, position, or bin encodes a value. */
export interface ChartMark {
  readonly kind: "mark";
  readonly id: string;
  readonly seriesId: string;
  readonly categoryId: string;
  readonly paint: ChartMarkPaintRole;
  readonly bounds: ChartRect;
}

/** Aggregate data polyline for one path-shaped series. */
export interface ChartDataPath {
  readonly kind: "data-path";
  readonly id: string;
  readonly seriesId: string;
  readonly paint: ChartSeriesPaintRole;
  readonly lineWidth: number;
  readonly points: readonly ChartPoint[];
  readonly bounds: ChartRect;
}

/**
 * The closed marker-shape vocabulary a scattered series may wear. The shape
 * is each series slot's paired non-colour cue, so two point populations
 * never differ by colour alone.
 */
export type ChartPointMarkerShape = "circle" | "square" | "triangle";

/** Aggregate point population for one scattered series. */
export interface ChartDataPoints {
  readonly kind: "data-points";
  readonly id: string;
  readonly seriesId: string;
  readonly paint: ChartSeriesPaintRole;
  /** Marker shape inscribed in the radius; omission keeps the circle. */
  readonly marker?: ChartPointMarkerShape;
  readonly radius: number;
  readonly points: readonly ChartPoint[];
  readonly bounds: ChartRect;
}

/** Closed area fill beneath one series. */
export interface ChartAreaFill {
  readonly kind: "area";
  readonly id: string;
  readonly seriesId: string;
  readonly paint: ChartSeriesPaintRole;
  readonly points: readonly ChartPoint[];
  readonly bounds: ChartRect;
}

/** One hairline axis segment, horizontal or vertical. */
export interface ChartAxisLine {
  readonly kind: "axis-line";
  readonly id: string;
  readonly axis: "value" | "category";
  readonly lineWidth: number;
  readonly start: ChartPoint;
  readonly end: ChartPoint;
  readonly bounds: ChartRect;
}

/** One subordinate gridline inside the plot area. */
export interface ChartGridLine {
  readonly kind: "grid-line";
  readonly id: string;
  readonly lineWidth: number;
  readonly start: ChartPoint;
  readonly end: ChartPoint;
  readonly bounds: ChartRect;
}

/** One emphasised reference line inside the plot area. */
export interface ChartReferenceLine {
  readonly kind: "reference-line";
  readonly id: string;
  readonly lineWidth: number;
  readonly start: ChartPoint;
  readonly end: ChartPoint;
  readonly bounds: ChartRect;
}

/**
 * One single-line text run aligned against its anchor point — start, middle,
 * or end — the anchoring axis labels need and the diagram text grammar
 * cannot express.
 */
export interface ChartTickLabel {
  readonly kind: "tick-label";
  readonly id: string;
  readonly axis: "value" | "category" | "none";
  readonly role: "axis-label" | "annotation";
  readonly text: string;
  readonly anchor: "start" | "middle" | "end";
  /** Anchor position the text aligns against. */
  readonly x: number;
  readonly baseline: number;
  readonly fontRole: SceneFontRole;
  readonly fontSize: number;
  readonly lineHeight: number;
  /** Conservative measured width of the single line. */
  readonly width: number;
  readonly bounds: ChartRect;
}

/** Drawable member of the closed chart scene vocabulary. */
export type ChartSceneElement =
  | ChartMark
  | ChartDataPath
  | ChartDataPoints
  | ChartAreaFill
  | ChartAxisLine
  | ChartGridLine
  | ChartReferenceLine
  | ChartTickLabel;

/** The paint layer each element kind belongs to. */
export function chartSceneLayer(element: ChartSceneElement): ChartSceneLayer {
  switch (element.kind) {
    case "grid-line":
      return "grid";
    case "mark":
    case "data-path":
    case "data-points":
    case "area":
      return "mark";
    case "reference-line":
      return "reference";
    case "axis-line":
      return "axis";
    case "tick-label":
      return "label";
  }
}

/** Canvas bounds and semantic background role. */
export interface ChartCanvas {
  readonly bounds: ChartRect;
  readonly role: "canvas";
  readonly padding: number;
}

/** Immutable, projection-neutral result of validated chart layout. */
export interface ChartScene {
  readonly kind: "chart-scene";
  readonly sourceKind: string;
  readonly canvas: ChartCanvas;
  /** The scale-mapped data region every mark stays inside. */
  readonly plot: ChartRect;
  /** Elements in paint order, sorted by the fixed layer sequence. */
  readonly elements: readonly ChartSceneElement[];
}
