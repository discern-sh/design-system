import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { CopyButton } from "../../docs/copy-button/copy-button.tsx";
import type { ResultSummaryState } from "./result-summary.types.ts";

export type { ResultSummaryState } from "./result-summary.types.ts";

/** One supporting count in a {@linkcode ResultSummary}. */
export interface ResultSummaryCount {
  readonly label: ReactNode;
  readonly value: ReactNode;
}

/** Props for the {@linkcode ResultSummary} component. */
export interface ResultSummaryProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  readonly state: ResultSummaryState;
  readonly fact: ReactNode;
  readonly counts?: readonly ResultSummaryCount[];
  readonly duration?: ReactNode;
  readonly nextAction?: ReactNode;
  readonly machineReadable?: string;
  readonly copyLabel?: ReactNode;
  readonly copiedLabel?: ReactNode;
}

const stateLabels: Readonly<Record<ResultSummaryState, string>> = {
  passed: "Passed",
  failed: "Failed",
  blocked: "Blocked",
  changed: "Changed",
  unchanged: "Unchanged",
};

/** One outcome stated in text, with supporting figures and an optional next action. */
export const ResultSummary: DiscernComponent<
  HTMLElement,
  ResultSummaryProps
> = forwardRef<HTMLElement, ResultSummaryProps>(function ResultSummary(
  {
    state,
    fact,
    counts,
    duration,
    nextAction,
    machineReadable,
    copyLabel = "Copy result data",
    copiedLabel = "Result data copied",
    className,
    ...props
  },
  ref,
) {
  const hasReadings = (counts !== undefined && counts.length > 0) ||
    duration !== undefined;
  return (
    <article
      ref={ref}
      className={classNames("discern-result-summary", className)}
      {...props}
    >
      <header className="discern-result-summary__header">
        <span
          className="discern-result-summary__state"
          data-discern-state={state}
        >
          {stateLabels[state]}
        </span>
        <div className="discern-result-summary__fact">{fact}</div>
      </header>
      {hasReadings
        ? (
          <dl className="discern-result-summary__readings">
            {counts?.map((count, index) => (
              <div key={index}>
                <dt>{count.label}</dt>
                <dd>{count.value}</dd>
              </div>
            ))}
            {duration !== undefined
              ? (
                <div>
                  <dt>Duration</dt>
                  <dd>{duration}</dd>
                </div>
              )
              : null}
          </dl>
        )
        : null}
      {nextAction !== undefined
        ? (
          <div className="discern-result-summary__next">
            <strong>Next action</strong>
            <div>{nextAction}</div>
          </div>
        )
        : null}
      {machineReadable !== undefined
        ? (
          <div className="discern-result-summary__machine">
            <span>Machine-readable result</span>
            <CopyButton
              value={machineReadable}
              label={copyLabel}
              copiedLabel={copiedLabel}
            />
          </div>
        )
        : null}
    </article>
  );
});
