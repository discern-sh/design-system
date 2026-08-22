/**
 * Stable diagram failure vocabulary and actionable complexity refusals.
 *
 * @module
 */

/** Author action attached to a measurable diagram-budget refusal. */
export type DiagramBudgetRemedy =
  | "shorten-label"
  | "reduce-tier"
  | "split-overview";

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
  | "diagram/layout/non-finite"
  | "diagram/conformance"
  | `diagram/budget/${string}`;

/** Scalar diagnostic evidence safe to relay in structured results. */
export type DiagramErrorFact = string | number | boolean;

/** Deterministic validation or layout refusal at the diagram boundary. */
export class DiagramValidationError extends TypeError {
  override readonly name: string = "DiagramValidationError";
  readonly code: DiagramErrorCode;
  readonly path: string | undefined;
  readonly facts: Readonly<Record<string, DiagramErrorFact>>;
  readonly remedy: string;

  constructor(options: {
    readonly code: DiagramErrorCode;
    readonly message: string;
    readonly path?: string;
    readonly facts?: Readonly<Record<string, DiagramErrorFact>>;
    readonly remedy: string;
  }) {
    super(options.message);
    this.code = options.code;
    this.path = options.path;
    this.facts = Object.freeze({ ...options.facts });
    this.remedy = options.remedy;
  }
}

const BUDGET_REMEDY_TEXT: Readonly<Record<DiagramBudgetRemedy, string>> = {
  "shorten-label": "Shorten the named label before laying out the diagram.",
  "reduce-tier":
    "Reduce one tier of the flow, or move that tier into a linked sub-flow.",
  "split-overview":
    "Split the overview from a smaller detailed sub-flow and link the two.",
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
    const remedy = BUDGET_REMEDY_TEXT[options.authorAction];
    const diagnostic = {
      code: `diagram/budget/${options.dimension}`,
      message:
        `Diagram budget ${options.dimension} allows ${options.limit} ${options.unit}; received ${options.actual}. ${remedy}`,
      facts: {
        dimension: options.dimension,
        limit: options.limit,
        actual: options.actual,
        unit: options.unit,
        authorAction: options.authorAction,
      },
      remedy,
    } as const;
    super(
      options.path === undefined
        ? diagnostic
        : { ...diagnostic, path: options.path },
    );
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
