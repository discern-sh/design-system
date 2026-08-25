/** Shared concise accessible alternative derived from authored context. */

import { validateChart } from "../generated/chart-dispatch.ts";
import type { ChartCommonSpec } from "./spec.ts";

/** Format the shared short alternative from already validated context. */
export function formatChartAltText(spec: ChartCommonSpec): string {
  return `${spec.title}: ${spec.summary}`;
}

/**
 * Derive the one canonical short alternative used for ordinary image naming.
 * It reads the authored title and summary only — never data values — so a
 * data refresh cannot change it. Structural facts remain the authority of
 * `describeChart`.
 */
export function chartAltText(spec: unknown): string {
  return formatChartAltText(validateChart(spec));
}
