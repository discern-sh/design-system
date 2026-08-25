/**
 * Metadata contract owned by every generated chart kind.
 *
 * The structural framework and freeze machinery live in the shared internal
 * authority `src/internal/kind-meta.ts`; this facade binds the chart remedy,
 * stance, honesty-tier, posture, and error-code vocabularies.
 *
 * @module
 */

import {
  defineKindMeta,
  defineKindReleaseCorpus,
  type FamilyKindMeta,
  type KindBudgetDefinition,
  type KindReleaseCase,
  type KindReleaseCorpus,
  kindReleaseFixtures,
  type KindReleaseInvalidCase,
  type KindReleaseRefusal,
} from "../internal/kind-meta.ts";
import type { ChartBudgetRemedy, ChartErrorCode } from "./errors.ts";
import type { ChartCommonSpec } from "./spec.ts";

/** One measurable kind-specific density or safety ceiling. */
export type ChartBudgetDefinition = KindBudgetDefinition<ChartBudgetRemedy>;

/**
 * The terminal honesty ladder for enhanced chart frames. An `exact` frame
 * prints every authored value within a declared width envelope; a `faithful`
 * frame is a declared-resolution approximation that states its resolution,
 * prints its extremes, and never distorts. Both refine the family's
 * never-drop-facts contract for continuous quantities.
 */
export const CHART_CLI_HONESTY_TIERS = ["exact", "faithful"] as const;

/** One declared honesty tier. */
export type ChartCliHonesty = typeof CHART_CLI_HONESTY_TIERS[number];

/** Kind whose terminal contract is the universal structural description. */
export interface ChartDescriptionCliStance {
  readonly stance: "description";
}

/** Kind with an additional pure terminal projection and its honesty tier. */
export interface ChartEnhancedCliStance {
  readonly stance: "enhanced";
  readonly honesty: ChartCliHonesty;
}

/** Permanent description-only or enhanced terminal posture for one kind. */
export type ChartKindCliStance =
  | ChartDescriptionCliStance
  | ChartEnhancedCliStance;

/** Authored identity, guidance, budgets, and terminal posture for one kind. */
export type ChartKindMeta = FamilyKindMeta<
  ChartBudgetRemedy,
  ChartKindCliStance
>;

/**
 * Required evidence postures every generated chart kind contributes at
 * release: the diagram posture set plus the chart-specific quantization-edge
 * and formatter-table postures.
 */
export const CHART_RELEASE_POSTURES = [
  "minimal",
  "representative",
  "structural",
  "long-text",
  "maximum-density",
  "semantic-roles",
  "quantization-edge",
  "formatter-table",
] as const;

/** One required release-evidence posture. */
export type ChartReleasePosture = typeof CHART_RELEASE_POSTURES[number];

/** One valid package-owned spec and the postures it proves. */
export type ChartReleaseCase<Spec extends ChartCommonSpec> = KindReleaseCase<
  Spec,
  ChartReleasePosture
>;

/** One measurable refusal that teaches the Metadata-owned decomposition. */
export type ChartReleaseRefusal = KindReleaseRefusal<ChartBudgetRemedy>;

/** One deliberately invalid or hostile public-boundary case. */
export type ChartReleaseInvalidCase = KindReleaseInvalidCase<ChartErrorCode>;

/** Canonical release evidence owned by one generated kind. */
export type ChartKindReleaseCorpus<Spec extends ChartCommonSpec> =
  KindReleaseCorpus<
    Spec,
    ChartReleasePosture,
    ChartBudgetRemedy,
    ChartErrorCode
  >;

/** Generated metadata and fixtures for one enrolled built-in kind. */
export interface ChartKindRegistryEntry {
  readonly meta: ChartKindMeta;
  readonly fixtures: readonly ChartCommonSpec[];
  readonly releaseCorpus: ChartKindReleaseCorpus<ChartCommonSpec>;
}

/** Define and deeply freeze one package-owned release corpus. */
export function defineChartKindReleaseCorpus<
  const Spec extends ChartCommonSpec,
  const Corpus extends ChartKindReleaseCorpus<Spec>,
>(corpus: Corpus): Corpus {
  return defineKindReleaseCorpus(corpus);
}

/** Derive the legacy fixture tuple from the corpus without widening indices. */
export function chartReleaseFixtures<
  const Cases extends readonly ChartReleaseCase<ChartCommonSpec>[],
>(corpus: { readonly cases: Cases }): {
  readonly [Index in keyof Cases]: Cases[Index]["spec"];
} {
  return kindReleaseFixtures(corpus);
}

/** Define and recursively freeze one kind's authored metadata authority. */
export function defineChartKindMeta<const Meta extends ChartKindMeta>(
  meta: Meta,
): Meta {
  return defineKindMeta(meta);
}
