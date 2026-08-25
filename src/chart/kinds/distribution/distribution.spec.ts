/** Semantic authoring and validated data contracts for distribution charts. */

import type { ValidatedChartSpec } from "../../dispatch.ts";
import type { ChartCommonSpec, ChartValueAxisSpec } from "../../spec.ts";

/**
 * Distribution form: a histogram of declared bins, or a box five-number
 * summary of the same recorded values.
 */
export type DistributionChartVariant = "histogram" | "box";

/** Author-declared histogram bin boundaries. */
export interface DistributionChartEdgesSpec {
  readonly kind: "edges";
  /** Strictly increasing bin boundaries; k+1 edges declare k bins covering [first, last]. */
  readonly values: readonly number[];
}

/**
 * Histogram bins produced by a named deterministic rule. Naming the rule in
 * the spec keeps binning an authored fact — never renderer-adaptive.
 */
export interface DistributionChartRuleSpec {
  readonly kind: "rule";
  /** The one pinned deterministic rule: Sturges bin count over nice-step edges. */
  readonly rule: "sturges";
}

/** Declared histogram binning: explicit edges or the named pinned rule. */
export type DistributionChartBinsSpec =
  | DistributionChartEdgesSpec
  | DistributionChartRuleSpec;

/** Value-axis facts for the measured quantity: name, unit, and tick format. */
export type DistributionChartValueAxisSpec = ChartValueAxisSpec;

/** JSON-safe documentation-scale distribution chart. */
export interface DistributionChartSpec extends ChartCommonSpec {
  readonly kind: "distribution";
  readonly variant?: DistributionChartVariant;
  /** Recorded measurements in any order; finite numbers. */
  readonly values: readonly number[];
  /** Histogram only; required for a histogram (declared honesty), refused for box. */
  readonly bins?: DistributionChartBinsSpec;
  /** The measured quantity's label, unit, and tick label format. */
  readonly value?: DistributionChartValueAxisSpec;
}

/** One derived histogram bin with its exact shared range text. */
export interface ValidatedDistributionBin {
  /** Inclusive lower bin boundary. */
  readonly start: number;
  /** Upper bin boundary; exclusive except on the final bin. */
  readonly end: number;
  /** Recorded values assigned to the bin. */
  readonly count: number;
  /** Exact printed range text every surface shares. */
  readonly label: string;
}

/** The five Tukey summary numbers of the sorted recorded values. */
export interface DistributionFiveNumberSummary {
  readonly minimum: number;
  readonly lowerQuartile: number;
  readonly median: number;
  readonly upperQuartile: number;
  readonly maximum: number;
}

/** Validated facts shared by both distribution variants. */
interface ValidatedDistributionChartBase extends ValidatedChartSpec {
  readonly kind: "distribution";
  readonly title: string;
  readonly summary: string;
  /** Recorded measurements in their authored order for lossless projection. */
  readonly authoredValues: readonly number[];
  /** Recorded measurements as a sorted ascending copy of the authored data. */
  readonly values: readonly number[];
  readonly value: DistributionChartValueAxisSpec;
}

/** Fully checked histogram consumed by descriptions and layout. */
export interface ValidatedDistributionHistogramChart
  extends ValidatedDistributionChartBase {
  readonly variant: "histogram";
  /** Where the bin edges came from: authored edges or the named pinned rule. */
  readonly binsRule: "edges" | "sturges";
  /** Derived bins in ascending edge order, zero-count bins included. */
  readonly bins: readonly ValidatedDistributionBin[];
}

/** Fully checked box five-number summary consumed by descriptions and layout. */
export interface ValidatedDistributionBoxChart
  extends ValidatedDistributionChartBase {
  readonly variant: "box";
  /** Exact Tukey five-number summary of the sorted values. */
  readonly fiveNumberSummary: DistributionFiveNumberSummary;
}

/** Fully checked distribution chart, discriminated by its variant. */
export type ValidatedDistributionChart =
  | ValidatedDistributionHistogramChart
  | ValidatedDistributionBoxChart;
