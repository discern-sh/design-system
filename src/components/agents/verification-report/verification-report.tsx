import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { FeedbackMark } from "../../feedback/feedback-marks.tsx";
import {
  verificationExtent,
  type VerificationReportCheckState,
  type VerificationReportStamp,
} from "./verification-report.types.ts";

/** One metadata row printed by the {@linkcode VerificationReport} component. */
export interface VerificationReportMeta {
  readonly label: ReactNode;
  readonly value: ReactNode;
}

export type {
  VerificationReportCheckState,
  VerificationReportStamp,
} from "./verification-report.types.ts";

/** One check row printed by the {@linkcode VerificationReport} component. */
export interface VerificationReportCheck {
  readonly label: ReactNode;
  readonly state: VerificationReportCheckState;
  readonly stateLabel?: string;
  readonly value?: ReactNode;
}

/** Props for the {@linkcode VerificationReport} component. */
export interface VerificationReportProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly title: ReactNode;
  readonly stamp?: VerificationReportStamp;
  readonly stampLabel?: ReactNode;
  readonly meta?: readonly VerificationReportMeta[];
  readonly checks?: readonly VerificationReportCheck[];
  readonly summary?: ReactNode;
  readonly footer?: ReactNode;
  /** Useful next action shown before supporting evidence. */
  readonly nextAction?: ReactNode;
  /** Initial native disclosure state for metadata and complete check evidence. */
  readonly evidenceOpen?: boolean;
}

const checkMarks: Record<VerificationReportCheckState, ReactNode> = {
  pass: <FeedbackMark name="success" />,
  fail: <FeedbackMark name="danger" />,
  skip: "–",
};

function glyph(state: VerificationReportCheckState) {
  return (
    <span className="discern-verification-report__glyph" aria-hidden="true">
      {checkMarks[state]}
    </span>
  );
}

/** Outcome and next action followed by native disclosure of complete verification evidence. */
export const VerificationReport: DiscernComponent<
  HTMLElement,
  VerificationReportProps
> = forwardRef<HTMLElement, VerificationReportProps>(
  function VerificationReport(
    {
      title,
      stamp,
      stampLabel,
      meta,
      checks,
      summary,
      footer,
      nextAction,
      evidenceOpen = false,
      className,
      ...props
    },
    ref,
  ) {
    return (
      <article
        ref={ref}
        className={classNames("discern-verification-report", className)}
        {...props}
      >
        <header className="discern-verification-report__header">
          <span className="discern-verification-report__title">{title}</span>
          {stamp !== undefined
            ? (
              <span
                className="discern-verification-report__stamp"
                data-discern-state={stamp}
              >
                {glyph(stamp)}
                {stampLabel ?? (stamp === "pass" ? "Pass" : "Fail")}
              </span>
            )
            : null}
        </header>
        {summary !== undefined && summary !== null
          ? (
            <div className="discern-verification-report__summary">
              {summary}
            </div>
          )
          : null}
        {nextAction !== undefined && nextAction !== null && (
          <div className="discern-verification-report__next">
            <strong>Next action</strong>
            <div>{nextAction}</div>
          </div>
        )}
        {((meta?.length ?? 0) > 0 || (checks?.length ?? 0) > 0) && (
          <details
            className="discern-verification-report__evidence"
            open={evidenceOpen}
          >
            <summary>
              Evidence{" "}
              <span className="discern-verification-report__extent">
                {(checks?.length
                  ? verificationExtent(checks)
                  : `${meta?.length ?? 0} metadata fields`).split(" · ").map((
                    clause,
                    index,
                  ) => <span key={index}>{clause}</span>)}
              </span>
            </summary>
            {meta !== undefined && meta.length > 0
              ? (
                <dl className="discern-verification-report__meta">
                  {meta.map((row, index) => (
                    <div key={index}>
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              )
              : null}
            {checks !== undefined && checks.length > 0
              ? (
                <dl className="discern-verification-report__checks">
                  {checks.map((check, index) => (
                    <div data-discern-state={check.state} key={index}>
                      <dt>{check.label}</dt>
                      {check.value !== undefined && check.value !== null
                        ? (
                          <dd className="discern-verification-report__value">
                            {check.value}
                          </dd>
                        )
                        : null}
                      <dd className="discern-verification-report__verdict">
                        {glyph(check.state)}
                        <span className="discern-verification-report__check-state">
                          {check.stateLabel === undefined
                            ? check.state
                            : `${check.stateLabel} (${check.state})`}
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
              )
              : null}
          </details>
        )}
        {footer !== undefined && footer !== null
          ? (
            <footer className="discern-verification-report__footer">
              {footer}
            </footer>
          )
          : null}
      </article>
    );
  },
);
