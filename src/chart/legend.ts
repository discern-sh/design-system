/** Series legend data derived from one validated chart spec. */

import { validateChart } from "../generated/chart-dispatch.ts";
import type { ChartSeriesPaintRole } from "./scene.ts";

/**
 * One derived series legend entry: the authored identity and label beside
 * the fixed series tone the palette, markers, and fill glyphs key on.
 */
export interface ChartSeriesLegendItem {
  /** Stable authored series identifier. */
  readonly id: string;
  /** Authored series label, ready to present beside a series swatch. */
  readonly label: string;
  /** The fixed palette slot tone this series occupies, in authored order. */
  readonly tone: ChartSeriesPaintRole;
}

/**
 * Derive the series legend for one authoring spec, in authored order. The
 * chart surface exports this data instead of injecting a visible legend, so
 * `DataFigure` framing — where a visible legend lives — stays optional.
 * Kinds without categorical series slots — single-quantity, ramp-encoded,
 * or directly labelled kinds — legitimately have no series legend and
 * return the empty inventory.
 */
export function chartSeriesLegend(
  spec: unknown,
): readonly ChartSeriesLegendItem[] {
  const validated = validateChart(spec);
  if (!("series" in validated)) return Object.freeze([]);
  return Object.freeze(validated.series.map((series) =>
    Object.freeze({
      id: series.id,
      label: series.label,
      tone: `series-${series.slot}` as const,
    })
  ));
}
