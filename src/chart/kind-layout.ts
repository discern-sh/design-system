/**
 * Shared scene-element construction for kind layouts.
 *
 * Every kind builds axis lines, reference lines, and anchored tick labels
 * with the same measurement, rounding, and bounds arithmetic; that
 * construction lives here exactly once, and each kind keeps only a thin
 * wrapper pinning its own vocabulary defaults.
 *
 * @module
 */

import {
  measureSceneText,
  type SceneFontRole,
} from "../internal/font-metrics.ts";
import {
  CHART_GEOMETRY,
  chartPointBounds,
  roundChartNumber,
} from "./geometry.ts";
import type {
  ChartAxisLine,
  ChartPoint,
  ChartReferenceLine,
  ChartTickLabel,
} from "./scene.ts";

const G = CHART_GEOMETRY;

/** Construct one hairline axis segment with fresh bounds. */
export function chartAxisLine(
  id: string,
  axis: ChartAxisLine["axis"],
  start: ChartPoint,
  end: ChartPoint,
): ChartAxisLine {
  return {
    kind: "axis-line",
    id,
    axis,
    lineWidth: G.axis.lineWidth,
    start,
    end,
    bounds: chartPointBounds([start, end], G.axis.lineWidth / 2),
  };
}

/** Construct one emphasised reference line with fresh bounds. */
export function chartReferenceLine(
  id: string,
  lineWidth: number,
  start: ChartPoint,
  end: ChartPoint,
): ChartReferenceLine {
  return {
    kind: "reference-line",
    id,
    lineWidth,
    start,
    end,
    bounds: chartPointBounds([start, end], lineWidth / 2),
  };
}

/** Construct one anchored single-line label with measured, fresh bounds. */
export function chartTickLabel(options: {
  readonly id: string;
  readonly axis: ChartTickLabel["axis"];
  readonly role: ChartTickLabel["role"];
  readonly text: string;
  readonly anchor: ChartTickLabel["anchor"];
  readonly x: number;
  readonly baseline: number;
  readonly fontRole: SceneFontRole;
}): ChartTickLabel {
  const width = measureSceneText(
    options.text,
    G.text.labelSize,
    options.fontRole,
  );
  const left = options.anchor === "start"
    ? options.x
    : options.anchor === "middle"
    ? options.x - width / 2
    : options.x - width;
  return {
    kind: "tick-label",
    id: options.id,
    axis: options.axis,
    role: options.role,
    text: options.text,
    anchor: options.anchor,
    x: roundChartNumber(options.x),
    baseline: roundChartNumber(options.baseline),
    fontRole: options.fontRole,
    fontSize: G.text.labelSize,
    lineHeight: G.text.labelLineHeight,
    width,
    bounds: {
      x: roundChartNumber(left),
      y: roundChartNumber(options.baseline - G.text.labelSize),
      width,
      height: G.text.labelLineHeight,
    },
  };
}
