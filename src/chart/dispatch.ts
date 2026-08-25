/**
 * Internal callable contracts shared by generated chart-kind dispatch.
 *
 * @module
 */

import type { ChartKindMeta } from "./kind-meta.ts";
import type { ChartScene } from "./scene.ts";
import type { ChartCommonSpec } from "./spec.ts";

/** Validated semantic data owned by one built-in kind. */
export interface ValidatedChartSpec extends ChartCommonSpec {
  readonly kind: string;
}

/** Complete preflight for one generated kind. */
export type ChartKindValidator<Validated extends ValidatedChartSpec> = (
  spec: unknown,
) => Validated;

/** Deterministic kind layout before the universal conformance pass. */
export type ChartKindLayout<Validated extends ValidatedChartSpec> = (
  spec: Validated,
) => ChartScene;

/** Lossless kind-specific structural description. */
export type ChartKindDescription<Validated extends ValidatedChartSpec> = (
  spec: Validated,
) => string;

/** Runtime surfaces required for every generated built-in kind. */
export interface ChartKindRuntime<Validated extends ValidatedChartSpec> {
  readonly meta: ChartKindMeta;
  readonly validate: ChartKindValidator<Validated>;
  readonly layout: ChartKindLayout<Validated>;
  readonly describe: ChartKindDescription<Validated>;
  readonly fixtures: readonly ChartCommonSpec[];
}
