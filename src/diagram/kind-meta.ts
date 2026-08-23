/**
 * Metadata contract owned by every generated diagram kind.
 *
 * @module
 */

import type { DiagramBudgetRemedy } from "./errors.ts";
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

/** Generated metadata and fixtures for one enrolled built-in kind. */
export interface DiagramKindRegistryEntry {
  readonly meta: DiagramKindMeta;
  readonly fixtures: readonly DiagramCommonSpec[];
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
