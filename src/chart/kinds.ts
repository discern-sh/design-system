/** Public supported-kind Metadata without generated fixtures or dispatch. */

import {
  chartKindAuthorGuide as generatedChartKindAuthorGuide,
  chartKindMetadata as generatedChartKindMetadata,
} from "../generated/chart-metadata.ts";
import type { ChartKindMeta } from "./kind-meta.ts";

/** Authored Metadata for every built-in chart kind, in canonical order. */
export const chartKindMetadata: readonly ChartKindMeta[] = Object.freeze(
  [...generatedChartKindMetadata],
);

/** Markdown author guidance generated from the same built-in kind Metadata. */
export const chartKindAuthorGuide: string = generatedChartKindAuthorGuide;
