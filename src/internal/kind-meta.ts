/**
 * Family-neutral kind Metadata and release-corpus framework.
 *
 * A kind family declares its own remedy vocabulary, CLI stance vocabulary,
 * release posture set, and error-code space through the type parameters; the
 * structural contract and the deep-freeze machinery live here exactly once.
 *
 * @module
 */

/** One measurable kind-specific density or safety ceiling. */
export interface KindBudgetDefinition<Remedy extends string = string> {
  readonly limit: number;
  readonly unit: string;
  readonly remedy: Remedy;
  readonly description: string;
}

/** Authored identity, guidance, budgets, and terminal posture for one kind. */
export interface FamilyKindMeta<
  Remedy extends string = string,
  CliStance extends { readonly stance: string } = { readonly stance: string },
> {
  readonly name: string;
  readonly slug: string;
  readonly order: number;
  readonly description: string;
  readonly useWhen: readonly string[];
  readonly notWhen: readonly string[];
  readonly budgets: Readonly<Record<string, KindBudgetDefinition<Remedy>>>;
  readonly cli: CliStance;
}

/** One valid package-owned spec and the postures it proves. */
export interface KindReleaseCase<
  Spec extends { readonly kind: string },
  Posture extends string = string,
> {
  readonly name: string;
  readonly postures: readonly Posture[];
  readonly spec: Spec;
}

/** One measurable refusal that teaches the Metadata-owned decomposition. */
export interface KindReleaseRefusal<Remedy extends string = string> {
  readonly dimension: string;
  readonly authorAction: Remedy;
  readonly spec: unknown;
}

/** One deliberately invalid or hostile public-boundary case. */
export interface KindReleaseInvalidCase<Code extends string = string> {
  readonly name: string;
  readonly code: Code;
  readonly spec: unknown;
}

/** Canonical release evidence owned by one enrolled kind. */
export interface KindReleaseCorpus<
  Spec extends { readonly kind: string },
  Posture extends string = string,
  Remedy extends string = string,
  Code extends string = string,
> {
  readonly kind: Spec["kind"];
  readonly cases: readonly KindReleaseCase<Spec, Posture>[];
  readonly overBudget: KindReleaseRefusal<Remedy>;
  readonly invalid: readonly KindReleaseInvalidCase<Code>[];
}

function freezeReleaseValue<Value>(value: Value): Value {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) freezeReleaseValue(child);
  return Object.freeze(value);
}

/** Define and deeply freeze one package-owned release corpus. */
export function defineKindReleaseCorpus<
  const Corpus extends KindReleaseCorpus<{ readonly kind: string }>,
>(corpus: Corpus): Corpus {
  return freezeReleaseValue(corpus);
}

/** Derive the legacy fixture tuple from the corpus without widening indices. */
export function kindReleaseFixtures<
  const Cases extends readonly KindReleaseCase<{ readonly kind: string }>[],
>(corpus: { readonly cases: Cases }): {
  readonly [Index in keyof Cases]: Cases[Index]["spec"];
} {
  return Object.freeze(corpus.cases.map(({ spec }) => spec)) as {
    readonly [Index in keyof Cases]: Cases[Index]["spec"];
  };
}

function freezeBudget(
  budget: KindBudgetDefinition,
): KindBudgetDefinition {
  return Object.freeze({ ...budget });
}

/** Define and recursively freeze one kind's authored metadata authority. */
export function defineKindMeta<const Meta extends FamilyKindMeta>(
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
