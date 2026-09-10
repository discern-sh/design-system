/**
 * Family-neutral collection of non-fatal refusals.
 *
 * Validation and layout ordinarily stop at the first defect, because a
 * later stage cannot trust the earlier one. Measurable budgets are the
 * exception: an over-long label or an extra node changes nothing a later
 * stage depends on, so while a collector is active a budget refusal is
 * recorded and work continues, and an author sees every budget they broke
 * in one pass instead of one per attempt.
 *
 * @module
 */

import type { KindValidationError } from "./errors.ts";

let active: KindValidationError[] | undefined;

/**
 * Record a refusal when a collector is active, otherwise throw it. Only
 * refusals whose continuation is safe belong here; structural defects must
 * keep throwing.
 */
export function reportKindFinding(error: KindValidationError): void {
  if (active === undefined) throw error;
  active.push(error);
}

/** Everything one collected run produced. */
export interface CollectedKindFindings<Value> {
  /** The run's value when it completed, absent when it threw. */
  readonly value?: Value;
  /** Every refusal reported while the run was active, in report order. */
  readonly findings: readonly KindValidationError[];
  /** The error that ended the run early, if one did. */
  readonly failure?: unknown;
}

/**
 * Run synchronous work with a collector active. Nested runs keep their own
 * collectors, and the previous collector is restored however the run ends.
 */
export function collectKindFindings<Value>(
  run: () => Value,
): CollectedKindFindings<Value> {
  const previous = active;
  const findings: KindValidationError[] = [];
  active = findings;
  try {
    const value = run();
    return { value, findings };
  } catch (failure) {
    return { findings, failure };
  } finally {
    active = previous;
  }
}
