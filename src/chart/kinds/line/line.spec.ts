/** Semantic authoring and validated data contracts for line charts. */

import type { ValidatedChartSpec } from "../../dispatch.ts";
import type { ChartNumberFormat } from "../../format.ts";
import type { ChartSeriesPaintSlot } from "../../scene.ts";
import type {
  ChartCommonSpec,
  ChartScaledValueAxisSpec,
  ChartValueAxisSpec,
  ChartValueScale,
} from "../../spec.ts";

/** Path form: the plain polyline, or a single-series fill from zero. */
export type LineChartVariant = "line" | "area";

/** Ordered numeric x domain: strictly increasing finite positions. */
export interface LineChartNumberDomainSpec {
  readonly kind: "number";
  readonly values: readonly number[];
  readonly label?: string;
  readonly format?: ChartNumberFormat;
}

/** Ordered date x domain: strictly increasing canonical `YYYY-MM-DD` dates. */
export interface LineChartDateDomainSpec {
  readonly kind: "date";
  readonly values: readonly string[];
  readonly label?: string;
}

/** The closed ordered x-domain vocabulary a line chart may follow. */
export type LineChartDomainSpec =
  | LineChartNumberDomainSpec
  | LineChartDateDomainSpec;

/** One named series with a value or declared gap per domain position. */
export interface LineChartSeriesSpec {
  readonly id: string;
  readonly label: string;
  /**
   * Values aligned index-for-index with the x positions. An explicit null is
   * a declared gap — no stated value — and stays distinct from zero.
   */
  readonly values: readonly (number | null)[];
}

/** JSON-safe documentation-scale line chart. */
export interface LineChartSpec extends ChartCommonSpec {
  readonly kind: "line";
  readonly variant?: LineChartVariant;
  readonly x: LineChartDomainSpec;
  readonly series: readonly LineChartSeriesSpec[];
  readonly value?: ChartScaledValueAxisSpec;
}

/** Normalized numeric domain returned by complete line preflight. */
export interface ValidatedLineChartNumberDomain {
  readonly kind: "number";
  readonly values: readonly number[];
  readonly label?: string;
  readonly format?: ChartNumberFormat;
}

/** Normalized date domain: the authored ISO dates beside their ordinals. */
export interface ValidatedLineChartDateDomain {
  readonly kind: "date";
  readonly values: readonly string[];
  /** Proleptic-Gregorian day ordinal per authored date, index-for-index. */
  readonly ordinals: readonly number[];
  readonly label?: string;
}

/** Fully checked ordered x domain consumed by descriptions and layout. */
export type ValidatedLineChartDomain =
  | ValidatedLineChartNumberDomain
  | ValidatedLineChartDateDomain;

/** Normalized series returned by complete line preflight. */
export interface ValidatedLineChartSeries {
  readonly id: string;
  readonly label: string;
  /** The fixed palette slot this series occupies, in authored order. */
  readonly slot: ChartSeriesPaintSlot;
  readonly values: readonly (number | null)[];
}

/** Value-axis facts with the resolved position-encoding scale. */
export type ValidatedLineChartValueAxis = ChartValueAxisSpec & {
  readonly scale: ChartValueScale;
};

/** Fully checked line chart consumed by descriptions and layout. */
export interface ValidatedLineChart extends ValidatedChartSpec {
  readonly kind: "line";
  readonly title: string;
  readonly summary: string;
  readonly variant: LineChartVariant;
  readonly x: ValidatedLineChartDomain;
  readonly series: readonly ValidatedLineChartSeries[];
  readonly value: ValidatedLineChartValueAxis;
  /** Largest stated value, the top of the authored data domain. */
  readonly maximumValue: number;
  /** Smallest stated value, the bottom of the authored data domain. */
  readonly minimumValue: number;
}
