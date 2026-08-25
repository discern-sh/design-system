/**
 * Stable chart failure vocabulary and actionable complexity refusals.
 *
 * The carrying mechanics live in the shared internal bases in
 * `src/internal/errors.ts`; these classes bind the chart-scoped code
 * templates, remedy vocabulary, and message subject.
 *
 * @module
 */

import {
  kindBudgetDiagnostic,
  type KindErrorFact,
  KindValidationError,
} from "../internal/errors.ts";

/** Canonical author actions attached to measurable chart-budget refusals. */
export const CHART_BUDGET_REMEDIES = [
  "shorten-label",
  "reduce-series",
  "aggregate-categories",
  "split-figure",
  "log-scale",
] as const;

/** Author action attached to a measurable chart-budget refusal. */
export type ChartBudgetRemedy = typeof CHART_BUDGET_REMEDIES[number];

/** Stable machine-readable chart failure identity. */
export type ChartErrorCode =
  | "chart/invalid-spec"
  | "chart/unknown-kind"
  | "chart/invalid-identifier"
  | "chart/invalid-text"
  | "chart/duplicate-id"
  | "chart/negative-value"
  | "chart/proportion-gap"
  | "chart/zero-total"
  | "chart/degenerate-domain"
  | "chart/sub-resolution"
  | "chart/layout/label-fit"
  | "chart/layout/non-finite"
  | "chart/conformance"
  | `chart/budget/${string}`;

/** Scalar diagnostic evidence safe to relay in structured results. */
export type ChartErrorFact = KindErrorFact;

/** Deterministic validation or layout refusal at the chart boundary. */
export class ChartValidationError extends KindValidationError<ChartErrorCode> {
  override readonly name: string = "ChartValidationError";
}

const BUDGET_REMEDY_TEXT: Readonly<Record<ChartBudgetRemedy, string>> = {
  "shorten-label": "Shorten the named label before laying out the chart.",
  "reduce-series":
    "Show fewer series, or split them across focused small multiples.",
  "aggregate-categories":
    "Aggregate long-tail categories into fewer, broader ones.",
  "split-figure": "Split the data into two or more focused figures.",
  "log-scale":
    "Use a log value scale where position encodes the value, or split the data into focused figures.",
};

/** Measurable refusal carrying the exceeded limit and prescribed author move. */
export class ChartBudgetError extends ChartValidationError {
  override readonly name: string = "ChartBudgetError";
  readonly dimension: string;
  readonly limit: number;
  readonly actual: number;
  readonly authorAction: ChartBudgetRemedy;

  constructor(options: {
    readonly dimension: string;
    readonly limit: number;
    readonly actual: number;
    readonly unit: string;
    readonly authorAction: ChartBudgetRemedy;
    readonly path?: string;
  }) {
    const shared = {
      code: `chart/budget/${options.dimension}` as const,
      subject: "Chart",
      dimension: options.dimension,
      limit: options.limit,
      actual: options.actual,
      unit: options.unit,
      authorAction: options.authorAction,
      remedy: BUDGET_REMEDY_TEXT[options.authorAction],
    };
    super(kindBudgetDiagnostic(
      options.path === undefined ? shared : { ...shared, path: options.path },
    ));
    this.dimension = options.dimension;
    this.limit = options.limit;
    this.actual = options.actual;
    this.authorAction = options.authorAction;
  }
}

/** Package defect raised when a kind returns a scene outside the closed contract. */
export class ChartConformanceError extends ChartValidationError {
  override readonly name: string = "ChartConformanceError";

  constructor(
    message: string,
    facts: Readonly<Record<string, ChartErrorFact>>,
  ) {
    super({
      code: "chart/conformance",
      message,
      facts,
      remedy:
        "Fix the owning kind layout or the shared geometry authority; do not project this scene.",
    });
  }
}
