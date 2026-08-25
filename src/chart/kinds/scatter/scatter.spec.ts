/** Semantic authoring and validated data contracts for scatter charts. */

import type { ValidatedChartSpec } from "../../dispatch.ts";
import type {
  ChartPointMarkerShape,
  ChartSeriesPaintSlot,
} from "../../scene.ts";
import type {
  ChartCommonSpec,
  ChartScaledValueAxisSpec,
  ChartValueAxisSpec,
  ChartValueScale,
} from "../../spec.ts";

/** One authored observation: a pair of measured quantities. */
export interface ScatterChartPointSpec {
  readonly x: number;
  readonly y: number;
}

/** One named series of observed (x, y) pairs. */
export interface ScatterChartSeriesSpec {
  readonly id: string;
  readonly label: string;
  /** Observations in authored order; order carries no positional meaning. */
  readonly points: readonly ScatterChartPointSpec[];
}

/**
 * Axis facts for one scattered quantity: an optional name, unit, tick label
 * format, and the closed linear-or-log position scale.
 */
export type ScatterChartAxisSpec = ChartScaledValueAxisSpec;

/** JSON-safe documentation-scale scatter chart. */
export interface ScatterChartSpec extends ChartCommonSpec {
  readonly kind: "scatter";
  /** One to three series; each slot wears a colour plus marker bundle. */
  readonly series: readonly ScatterChartSeriesSpec[];
  /** The horizontal quantity's axis facts. */
  readonly x?: ScatterChartAxisSpec;
  /** The vertical quantity's axis facts. */
  readonly y?: ScatterChartAxisSpec;
}

/** One axis after preflight: authored facts plus the resolved scale. */
export interface ValidatedScatterChartAxis extends ChartValueAxisSpec {
  readonly scale: ChartValueScale;
}

/** Normalized series returned by complete scatter preflight. */
export interface ValidatedScatterChartSeries {
  readonly id: string;
  readonly label: string;
  /** The fixed palette slot this series occupies, in authored order. */
  readonly slot: ChartSeriesPaintSlot;
  /**
   * The slot's paired non-colour cue — circle, square, or triangle in slot
   * order — so two point populations never differ by colour alone.
   */
  readonly marker: ChartPointMarkerShape;
  readonly points: readonly ScatterChartPointSpec[];
}

/** Fully checked scatter chart consumed by descriptions and layout. */
export interface ValidatedScatterChart extends ValidatedChartSpec {
  readonly kind: "scatter";
  readonly title: string;
  readonly summary: string;
  readonly series: readonly ValidatedScatterChartSeries[];
  readonly x: ValidatedScatterChartAxis;
  readonly y: ValidatedScatterChartAxis;
  /** Smallest stated x across every series. */
  readonly minimumX: number;
  /** Largest stated x across every series. */
  readonly maximumX: number;
  /** Smallest stated y across every series. */
  readonly minimumY: number;
  /** Largest stated y across every series. */
  readonly maximumY: number;
}
