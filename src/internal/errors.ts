/**
 * Family-neutral kind-error mechanics behind each family's public classes.
 *
 * Each kind family exports its own subclasses with family-scoped code
 * templates and remedy vocabulary; the frozen-fact carrying and the budget
 * refusal shape live here exactly once.
 *
 * @module
 */

/** Scalar diagnostic evidence safe to relay in structured results. */
export type KindErrorFact = string | number | boolean;

/** Diagnostic envelope carried by every kind-family refusal. */
export interface KindErrorOptions<Code extends string = string> {
  readonly code: Code;
  readonly message: string;
  readonly path?: string;
  readonly facts?: Readonly<Record<string, KindErrorFact>>;
  readonly remedy: string;
}

/** Deterministic validation or layout refusal at a kind-family boundary. */
export class KindValidationError<Code extends string = string>
  extends TypeError {
  readonly code: Code;
  readonly path: string | undefined;
  readonly facts: Readonly<Record<string, KindErrorFact>>;
  readonly remedy: string;

  constructor(options: KindErrorOptions<Code>) {
    super(options.message);
    this.code = options.code;
    this.path = options.path;
    this.facts = Object.freeze({ ...options.facts });
    this.remedy = options.remedy;
  }
}

/** Measured facts every budget refusal records. */
export interface KindBudgetFacts<Remedy extends string = string> {
  readonly dimension: string;
  readonly limit: number;
  readonly actual: number;
  readonly unit: string;
  readonly authorAction: Remedy;
}

/**
 * Assemble the canonical budget-refusal diagnostic for one family: the
 * message template and frozen fact set exist here once, while the family
 * supplies its scoped code, capitalized subject, and resolved remedy text.
 */
export function kindBudgetDiagnostic<
  Code extends string,
  Remedy extends string,
>(
  options: KindBudgetFacts<Remedy> & {
    readonly code: Code;
    readonly subject: string;
    readonly remedy: string;
    readonly path?: string;
  },
): KindErrorOptions<Code> {
  const diagnostic = {
    code: options.code,
    message:
      `${options.subject} budget ${options.dimension} allows ${options.limit} ${options.unit}; received ${options.actual}. ${options.remedy}`,
    facts: {
      dimension: options.dimension,
      limit: options.limit,
      actual: options.actual,
      unit: options.unit,
      authorAction: options.authorAction,
    },
    remedy: options.remedy,
  };
  return options.path === undefined
    ? diagnostic
    : { ...diagnostic, path: options.path };
}
