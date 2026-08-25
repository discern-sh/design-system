/** Semantic authoring and validated data contracts for slope charts. */

import type { ValidatedChartSpec } from "../../dispatch.ts";
import type { ChartCommonSpec, ChartValueAxisSpec } from "../../spec.ts";

/** One named item measured at both ordinal positions. */
export interface SlopeChartItemSpec {
  readonly id: string;
  readonly label: string;
  readonly before: number;
  readonly after: number;
}

/** Names for the two ordinal positions; default "Before" and "After". */
export interface SlopeChartEndpointsSpec {
  readonly before?: string;
  readonly after?: string;
}

/** Value-axis facts: an optional name, unit, and label format. */
export type SlopeChartValueAxisSpec = ChartValueAxisSpec;

/** JSON-safe documentation-scale slope chart. */
export interface SlopeChartSpec extends ChartCommonSpec {
  readonly kind: "slope";
  readonly items: readonly SlopeChartItemSpec[];
  readonly endpoints?: SlopeChartEndpointsSpec;
  readonly value?: SlopeChartValueAxisSpec;
}

/** The closed movement vocabulary between an item's two stated values. */
export type SlopeChartDirection = "up" | "down" | "level";

/** Both endpoint names resolved to their authored or default text. */
export interface ValidatedSlopeChartEndpoints {
  readonly before: string;
  readonly after: string;
}

/** Normalized item returned by complete slope preflight. */
export interface ValidatedSlopeChartItem {
  readonly id: string;
  readonly label: string;
  readonly before: number;
  readonly after: number;
  /**
   * Exact signed delta text every surface prints, computed in decimal
   * space: `+` prefixes an increase, ASCII `-` prefixes a decrease, and a
   * level item prints the unsigned `0` — its direction cue carries
   * "unchanged", so the delta needs no sign of its own.
   */
  readonly deltaText: string;
  readonly direction: SlopeChartDirection;
}

/** Fully checked slope chart consumed by descriptions and layout. */
export interface ValidatedSlopeChart extends ValidatedChartSpec {
  readonly kind: "slope";
  readonly title: string;
  readonly summary: string;
  readonly items: readonly ValidatedSlopeChartItem[];
  readonly endpoints: ValidatedSlopeChartEndpoints;
  readonly value: SlopeChartValueAxisSpec;
  /** Smallest stated value across both endpoints of every item. */
  readonly minimumValue: number;
  /** Largest stated value across both endpoints of every item. */
  readonly maximumValue: number;
}
