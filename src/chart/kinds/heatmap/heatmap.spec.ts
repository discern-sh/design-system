/** Semantic authoring and validated data contracts for heatmap charts. */

import type { ValidatedChartSpec } from "../../dispatch.ts";
import type { ChartRampPaintSlot } from "../../scene.ts";
import type { ChartCommonSpec, ChartValueAxisSpec } from "../../spec.ts";

/** One named position on a heatmap grid axis. */
export interface HeatmapChartCategorySpec {
  readonly id: string;
  readonly label: string;
}

/**
 * The declared magnitude bins behind the sequential ramp. Bins are authored,
 * never derived: the legend states these edges on every surface, so a scale
 * needing finer distinction than the ramp honestly carries re-bins with new
 * declared edges or declines — it never dithers silently.
 */
export interface HeatmapChartBinsSpec {
  /**
   * 1–3 strictly increasing inner thresholds declaring 2–4 bins. Bin `i`
   * holds values below `edges[i]`; the last bin holds everything at or
   * above the final threshold, so the first and last bins are open-ended
   * and every real value belongs to exactly one bin.
   */
  readonly edges: readonly number[];
}

/** JSON-safe documentation-scale heatmap chart. */
export interface HeatmapChartSpec extends ChartCommonSpec {
  readonly kind: "heatmap";
  readonly rows: readonly HeatmapChartCategorySpec[];
  readonly columns: readonly HeatmapChartCategorySpec[];
  /**
   * Row-major grid aligned with rows × columns. An explicit null is a
   * declared gap — no stated value — and stays distinct from zero.
   */
  readonly values: readonly (readonly (number | null)[])[];
  /** Required declared bins — the honesty rule behind the ramp encoding. */
  readonly bins: HeatmapChartBinsSpec;
  readonly value?: ChartValueAxisSpec;
}

/** One normalized grid cell after complete heatmap preflight. */
export interface ValidatedHeatmapCell {
  readonly rowId: string;
  readonly columnId: string;
  readonly value: number | null;
  /** 1-based declared bin, null for a declared gap. */
  readonly bin: ChartRampPaintSlot | null;
}

/** Fully checked heatmap chart consumed by descriptions and layout. */
export interface ValidatedHeatmapChart extends ValidatedChartSpec {
  readonly kind: "heatmap";
  readonly title: string;
  readonly summary: string;
  readonly rows: readonly HeatmapChartCategorySpec[];
  readonly columns: readonly HeatmapChartCategorySpec[];
  /** Cells in row-major authored order, one per rows × columns position. */
  readonly cells: readonly ValidatedHeatmapCell[];
  /** The declared strictly increasing inner bin thresholds. */
  readonly binEdges: readonly number[];
  /**
   * One ready-made range label per bin. Every surface prints these exact
   * strings, so the declared edges read byte-identically everywhere.
   */
  readonly binRangeLabels: readonly string[];
  readonly value: ChartValueAxisSpec;
}
