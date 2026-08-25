/**
 * Common semantic facts authored by every chart kind.
 *
 * @module
 */

import type { ChartNumberFormat } from "./format.ts";

/** Recursively JSON-safe data admitted by chart specs. */
export type ChartJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly ChartJsonValue[]
  | { readonly [key: string]: ChartJsonValue };

/** Accessible context and discriminant shared by every chart spec. */
export interface ChartCommonSpec {
  /** Generated built-in kind identity. */
  readonly kind: string;
  /** Short accessible name for the informative image. */
  readonly title: string;
  /** Concise accessible explanation of what the chart communicates. */
  readonly summary: string;
}

/**
 * Value-axis facts shared by every quantitative axis: an optional name,
 * unit, and tick label format.
 */
export interface ChartValueAxisSpec {
  readonly label?: string;
  readonly unit?: string;
  readonly format?: ChartNumberFormat;
}
