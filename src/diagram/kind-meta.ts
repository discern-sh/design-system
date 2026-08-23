/**
 * Metadata contract owned by every generated diagram kind.
 *
 * @module
 */

import type { DiagramBudgetRemedy, DiagramErrorCode } from "./errors.ts";
import type { DiagramCommonSpec } from "./spec.ts";

/** One measurable kind-specific density or safety ceiling. */
export interface DiagramBudgetDefinition {
  readonly limit: number;
  readonly unit: string;
  readonly remedy: DiagramBudgetRemedy;
  readonly description: string;
}

/** Kind whose terminal contract is the universal structural description. */
export interface DiagramDescriptionCliStance {
  readonly stance: "description";
}

/** Kind with an additional pure terminal projection module. */
export interface DiagramEnhancedCliStance {
  readonly stance: "enhanced";
}

/** Permanent description-only or enhanced terminal posture for one kind. */
export type DiagramKindCliStance =
  | DiagramDescriptionCliStance
  | DiagramEnhancedCliStance;

/** Authored identity, guidance, budgets, and terminal posture for one kind. */
export interface DiagramKindMeta {
  readonly name: string;
  readonly slug: string;
  readonly order: number;
  readonly description: string;
  readonly useWhen: readonly string[];
  readonly notWhen: readonly string[];
  readonly budgets: Readonly<Record<string, DiagramBudgetDefinition>>;
  readonly cli: DiagramKindCliStance;
}

/** Required evidence postures every generated kind contributes at release. */
export const DIAGRAM_RELEASE_POSTURES = [
  "minimal",
  "representative",
  "structural",
  "long-text",
  "maximum-density",
  "semantic-roles",
] as const;

/** One required release-evidence posture. */
export type DiagramReleasePosture = typeof DIAGRAM_RELEASE_POSTURES[number];

/** One valid package-owned spec and the postures it proves. */
export interface DiagramReleaseCase<Spec extends DiagramCommonSpec> {
  readonly name: string;
  readonly postures: readonly DiagramReleasePosture[];
  readonly spec: Spec;
}

/** One measurable refusal that teaches the Metadata-owned decomposition. */
export interface DiagramReleaseRefusal {
  readonly dimension: string;
  readonly authorAction: DiagramBudgetRemedy;
  readonly spec: unknown;
}

/** One deliberately invalid or hostile public-boundary case. */
export interface DiagramReleaseInvalidCase {
  readonly name: string;
  readonly code: DiagramErrorCode;
  readonly spec: unknown;
}

/** Canonical release evidence owned by one generated kind. */
export interface DiagramKindReleaseCorpus<Spec extends DiagramCommonSpec> {
  readonly kind: Spec["kind"];
  readonly cases: readonly DiagramReleaseCase<Spec>[];
  readonly overBudget: DiagramReleaseRefusal;
  readonly invalid: readonly DiagramReleaseInvalidCase[];
}

/** Generated metadata and fixtures for one enrolled built-in kind. */
export interface DiagramKindRegistryEntry {
  readonly meta: DiagramKindMeta;
  readonly fixtures: readonly DiagramCommonSpec[];
  readonly releaseCorpus: DiagramKindReleaseCorpus<DiagramCommonSpec>;
}

function freezeReleaseValue<Value>(value: Value): Value {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) freezeReleaseValue(child);
  return Object.freeze(value);
}

/** Define and deeply freeze one package-owned release corpus. */
export function defineDiagramKindReleaseCorpus<
  const Spec extends DiagramCommonSpec,
  const Corpus extends DiagramKindReleaseCorpus<Spec>,
>(corpus: Corpus): Corpus {
  return freezeReleaseValue(corpus);
}

/** Derive the legacy fixture tuple from the corpus without widening indices. */
export function diagramReleaseFixtures<
  const Cases extends readonly DiagramReleaseCase<DiagramCommonSpec>[],
>(corpus: { readonly cases: Cases }): {
  readonly [Index in keyof Cases]: Cases[Index]["spec"];
} {
  return Object.freeze(corpus.cases.map(({ spec }) => spec)) as {
    readonly [Index in keyof Cases]: Cases[Index]["spec"];
  };
}

function freezeBudget(
  budget: DiagramBudgetDefinition,
): DiagramBudgetDefinition {
  return Object.freeze({ ...budget });
}

/** Define and recursively freeze one kind's authored metadata authority. */
export function defineDiagramKindMeta<const Meta extends DiagramKindMeta>(
  meta: Meta,
): Meta {
  const budgets = Object.fromEntries(
    Object.entries(meta.budgets).map(([name, budget]) => [
      name,
      freezeBudget(budget),
    ]),
  );
  return Object.freeze({
    ...meta,
    useWhen: Object.freeze([...meta.useWhen]),
    notWhen: Object.freeze([...meta.notWhen]),
    budgets: Object.freeze(budgets),
    cli: Object.freeze({ ...meta.cli }),
  }) as Meta;
}
