/** Semantic authoring and validated data contracts for bar charts. */

import type { ValidatedChartSpec } from "../../dispatch.ts";
import type { ChartNumberFormat } from "../../format.ts";
import type { ChartSeriesPaintSlot } from "../../scene.ts";
import type { ChartCommonSpec } from "../../spec.ts";

/** Comparison form: absolute values side by side, or shares of each whole. */
export type BarChartVariant = "grouped" | "proportion";

/**
 * Restrained presentation hint: columns, or label-friendly horizontal bars.
 * The hint changes no semantic fact and the description ignores it; it
 * exists because long category labels need the horizontal form to stay
 * readable, and no mechanical rule can choose without surprising authors.
 */
export type BarChartOrientation = "vertical" | "horizontal";

/** One named position on the category axis. */
export interface BarChartCategorySpec {
  readonly id: string;
  readonly label: string;
}

/** One named series with a value or declared gap per category. */
export interface BarChartSeriesSpec {
  readonly id: string;
  readonly label: string;
  /**
   * Values aligned index-for-index with the categories. An explicit null is
   * a declared gap — no stated value — and stays distinct from zero.
   */
  readonly values: readonly (number | null)[];
}

/** Value-axis facts: an optional name, unit, and tick label format. */
export interface BarChartValueAxisSpec {
  readonly label?: string;
  readonly unit?: string;
  readonly format?: ChartNumberFormat;
}

/** JSON-safe documentation-scale bar chart. */
export interface BarChartSpec extends ChartCommonSpec {
  readonly kind: "bar";
  readonly variant?: BarChartVariant;
  readonly orientation?: BarChartOrientation;
  readonly categories: readonly BarChartCategorySpec[];
  readonly series: readonly BarChartSeriesSpec[];
  readonly value?: BarChartValueAxisSpec;
}

/** Normalized series returned by complete bar preflight. */
export interface ValidatedBarChartSeries {
  readonly id: string;
  readonly label: string;
  /** The fixed palette slot this series occupies, in authored order. */
  readonly slot: ChartSeriesPaintSlot;
  readonly values: readonly (number | null)[];
}

/** Fully checked bar chart consumed by descriptions and layout. */
export interface ValidatedBarChart extends ValidatedChartSpec {
  readonly kind: "bar";
  readonly title: string;
  readonly summary: string;
  readonly variant: BarChartVariant;
  readonly orientation: BarChartOrientation;
  readonly categories: readonly BarChartCategorySpec[];
  readonly series: readonly ValidatedBarChartSeries[];
  readonly value: BarChartValueAxisSpec;
  /** Largest stated value, the top of the authored data domain. */
  readonly maximumValue: number;
}
