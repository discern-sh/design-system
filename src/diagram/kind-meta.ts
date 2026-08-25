/**
 * Metadata contract owned by every generated diagram kind.
 *
 * The structural framework and freeze machinery live in the shared internal
 * authority `src/internal/kind-meta.ts`; this facade binds the diagram
 * remedy, stance, posture, and error-code vocabularies so every existing
 * diagram-side name keeps resolving here.
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
import type { DiagramBudgetRemedy, DiagramErrorCode } from "./errors.ts";
import type { DiagramCommonSpec } from "./spec.ts";

/** One measurable kind-specific density or safety ceiling. */
export type DiagramBudgetDefinition = KindBudgetDefinition<
  DiagramBudgetRemedy
>;

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
export type DiagramKindMeta = FamilyKindMeta<
  DiagramBudgetRemedy,
  DiagramKindCliStance
>;

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
export type DiagramReleaseCase<Spec extends DiagramCommonSpec> =
  KindReleaseCase<Spec, DiagramReleasePosture>;

/** One measurable refusal that teaches the Metadata-owned decomposition. */
export type DiagramReleaseRefusal = KindReleaseRefusal<DiagramBudgetRemedy>;

/** One deliberately invalid or hostile public-boundary case. */
export type DiagramReleaseInvalidCase = KindReleaseInvalidCase<
  DiagramErrorCode
>;

/** Canonical release evidence owned by one generated kind. */
export type DiagramKindReleaseCorpus<Spec extends DiagramCommonSpec> =
  KindReleaseCorpus<
    Spec,
    DiagramReleasePosture,
    DiagramBudgetRemedy,
    DiagramErrorCode
  >;

/** Generated metadata and fixtures for one enrolled built-in kind. */
export interface DiagramKindRegistryEntry {
  readonly meta: DiagramKindMeta;
  readonly fixtures: readonly DiagramCommonSpec[];
  readonly releaseCorpus: DiagramKindReleaseCorpus<DiagramCommonSpec>;
}

/** Define and deeply freeze one package-owned release corpus. */
export function defineDiagramKindReleaseCorpus<
  const Spec extends DiagramCommonSpec,
  const Corpus extends DiagramKindReleaseCorpus<Spec>,
>(corpus: Corpus): Corpus {
  return defineKindReleaseCorpus(corpus);
}

/** Derive the legacy fixture tuple from the corpus without widening indices. */
export function diagramReleaseFixtures<
  const Cases extends readonly DiagramReleaseCase<DiagramCommonSpec>[],
>(corpus: { readonly cases: Cases }): {
  readonly [Index in keyof Cases]: Cases[Index]["spec"];
} {
  return kindReleaseFixtures(corpus);
}

/** Define and recursively freeze one kind's authored metadata authority. */
export function defineDiagramKindMeta<const Meta extends DiagramKindMeta>(
  meta: Meta,
): Meta {
  return defineKindMeta(meta);
}
