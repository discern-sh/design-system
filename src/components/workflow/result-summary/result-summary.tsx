import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { RawOutput } from "../raw-output/raw-output.tsx";
import { CopyButton } from "../../docs/copy-button/copy-button.tsx";
import type { BadgeTone } from "../../display/badge/badge.types.ts";
import { Badge } from "../../display/badge/badge.tsx";
import { WORKFLOW_COPY_ICONS } from "../workflow-marks.tsx";
import {
  RESULT_SUMMARY_STATE_LABELS,
  type ResultSummaryState,
} from "./result-summary.types.ts";

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

const stateWitnesses: Readonly<
  Record<ResultSummaryState, { tone: BadgeTone; dot: boolean }>
> = {
  passed: { tone: "success", dot: true },
  failed: { tone: "danger", dot: true },
  blocked: { tone: "warning", dot: true },
  changed: { tone: "accent", dot: true },
  declared: { tone: "neutral", dot: false },
  unchanged: { tone: "neutral", dot: false },
};

/** One result fact stated in text, with supporting figures and an optional next action. */
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
  const { tone, dot } = stateWitnesses[state];
  return (
    <article
      ref={ref}
      className={classNames("discern-result-summary", className)}
      {...props}
    >
      <header className="discern-result-summary__header">
        <Badge
          tone={tone}
          dot={dot}
          className="discern-result-summary__state"
          data-discern-state={state}
        >
          {RESULT_SUMMARY_STATE_LABELS[state]}
        </Badge>
        <div className="discern-result-summary__fact">{fact}</div>
      </header>
      {nextAction !== undefined
        ? (
          <div className="discern-result-summary__next">
            <strong>Next action</strong>
            <div>{nextAction}</div>
          </div>
        )
        : null}
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
      {machineReadable !== undefined
        ? (
          <div className="discern-result-summary__machine">
            <RawOutput
              label="Result data"
              outcome={RESULT_SUMMARY_STATE_LABELS[state]}
            >
              {machineReadable}
            </RawOutput>
            <CopyButton
              {...WORKFLOW_COPY_ICONS}
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
