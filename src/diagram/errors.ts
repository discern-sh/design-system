/**
 * Stable diagram failure vocabulary and actionable complexity refusals.
 *
 * The carrying mechanics live in the shared internal bases in
 * `src/internal/errors.ts`; these public classes bind the diagram-scoped
 * code templates, remedy vocabulary, and message subject.
 *
 * @module
 */

import {
  kindBudgetDiagnostic,
  type KindErrorFact,
  KindValidationError,
} from "../internal/errors.ts";

/** Canonical author actions attached to measurable diagram-budget refusals. */
export const DIAGRAM_BUDGET_REMEDIES = [
  "shorten-label",
  "reduce-tier",
  "split-overview",
  "split-group",
  "reduce-participants",
  "shorten-range",
] as const;

/** Author action attached to a measurable diagram-budget refusal. */
export type DiagramBudgetRemedy = typeof DIAGRAM_BUDGET_REMEDIES[number];

/** Stable machine-readable diagram failure identity. */
export type DiagramErrorCode =
  | "diagram/invalid-spec"
  | "diagram/unknown-kind"
  | "diagram/invalid-identifier"
  | "diagram/invalid-text"
  | "diagram/duplicate-id"
  | "diagram/dangling-reference"
  | "diagram/disconnected-graph"
  | "diagram/primary-cycle"
  | "diagram/invalid-flow-role"
  | "diagram/invalid-return-edge"
  | "diagram/layout/edge-label"
  | "diagram/layout/connector"
  | "diagram/layout/non-finite"
  | "diagram/conformance"
  | `diagram/budget/${string}`;

/** Scalar diagnostic evidence safe to relay in structured results. */
export type DiagramErrorFact = KindErrorFact;

/** Deterministic validation or layout refusal at the diagram boundary. */
export class DiagramValidationError
  extends KindValidationError<DiagramErrorCode> {
  override readonly name: string = "DiagramValidationError";
}

const BUDGET_REMEDY_TEXT: Readonly<Record<DiagramBudgetRemedy, string>> = {
  "shorten-label": "Shorten the named label before laying out the diagram.",
  "reduce-tier":
    "Reduce one tier of the flow, or move that tier into a linked sub-flow.",
  "split-overview":
    "Split the overview from a smaller detailed sub-flow and link the two.",
  "split-group":
    "Split the dense group into a smaller boundary or an overview plus a focused diagram.",
  "reduce-participants":
    "Show fewer participants or split the interaction into consecutive sequences.",
  "shorten-range":
    "Shorten the calendar range or split the plan into adjacent periods.",
};

/** Measurable refusal carrying the exceeded limit and prescribed author move. */
export class DiagramBudgetError extends DiagramValidationError {
  override readonly name: string = "DiagramBudgetError";
  readonly dimension: string;
  readonly limit: number;
  readonly actual: number;
  readonly authorAction: DiagramBudgetRemedy;

  constructor(options: {
    readonly dimension: string;
    readonly limit: number;
    readonly actual: number;
    readonly unit: string;
    readonly authorAction: DiagramBudgetRemedy;
    readonly path?: string;
  }) {
    const shared = {
      code: `diagram/budget/${options.dimension}` as const,
      subject: "Diagram",
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
export class DiagramConformanceError extends DiagramValidationError {
  override readonly name: string = "DiagramConformanceError";

  constructor(
    message: string,
    facts: Readonly<Record<string, DiagramErrorFact>>,
  ) {
    super({
      code: "diagram/conformance",
      message,
      facts,
      remedy:
        "Fix the owning kind layout or the shared geometry authority; do not project this scene.",
    });
  }
}
