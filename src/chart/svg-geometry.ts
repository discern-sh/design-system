/** Shared SVG byte formatting for the chart projections. */

import { formatSvgNumber, formatSvgPoints } from "../internal/svg.ts";
import type { ChartPoint } from "./scene.ts";

/** Canonically format one finite chart coordinate for portable SVG bytes. */
export function formatChartSvgNumber(value: number): string {
  return formatSvgNumber(value, "Chart");
}

/** Format an ordered chart point population for SVG `points`. */
export function formatChartSvgPoints(points: readonly ChartPoint[]): string {
  return formatSvgPoints(points, "Chart");
}
