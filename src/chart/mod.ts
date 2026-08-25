/**
 * Neutral quantitative chart authoring, description, Metadata, series
 * legend derivation, and standalone SVG projection. This graph imports
 * neither React nor terminal modules, and it deliberately withholds the
 * internal scene, layout, and conformance machinery: callers author specs
 * and the package owns every derived surface.
 *
 * @module
 */

export { chartAltText } from "./accessibility.ts";
export type {
  ChartBudgetRemedy,
  ChartErrorCode,
  ChartErrorFact,
} from "./errors.ts";
export {
  ChartBudgetError,
  ChartConformanceError,
  ChartValidationError,
} from "./errors.ts";
export type {
  ChartBudgetDefinition,
  ChartCliHonesty,
  ChartKindCliStance,
  ChartKindMeta,
} from "./kind-meta.ts";
export type {
  ChartDecimalFormat,
  ChartNumberFormat,
  ChartPercentFormat,
  ChartSiFormat,
} from "./format.ts";
export { formatChartNumber } from "./format.ts";
export type { ChartSeriesLegendItem } from "./legend.ts";
export { chartSeriesLegend } from "./legend.ts";
export type { ChartSeriesPaintRole, ChartSeriesPaintSlot } from "./scene.ts";
export type { ChartSpec } from "../generated/chart-spec.ts";
export { describeChart } from "../generated/chart-dispatch.ts";
export { chartKindAuthorGuide, chartKindMetadata } from "./kinds.ts";
export type {
  ChartSvgDocument,
  ChartSvgTheme,
  RenderChartSvgOptions,
} from "./svg.ts";
export { renderChartSvg } from "./svg.ts";
export * from "../generated/chart-exports.ts";
