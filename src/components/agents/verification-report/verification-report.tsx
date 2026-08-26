import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import type {
  VerificationReportCheckState,
  VerificationReportStamp,
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
}

const checkGlyphs: Record<VerificationReportCheckState, string> = {
  pass: "✓",
  fail: "✕",
  skip: "–",
};

/** Durable multi-check report with a stamped title, metadata rows, and dot-leadered results. */
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
                {stampLabel ?? (stamp === "pass" ? "Pass" : "Fail")}
              </span>
            )
            : null}
        </header>
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
                  <dd>
                    {check.value !== undefined && check.value !== null
                      ? check.value
                      : null}
                    <span
                      className="discern-verification-report__glyph"
                      aria-hidden="true"
                    >
                      {checkGlyphs[check.state]}
                    </span>
                    <span className="discern-visually-hidden">
                      {`, ${check.stateLabel ?? check.state}`}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          )
          : null}
        {summary !== undefined && summary !== null
          ? (
            <div className="discern-verification-report__summary">
              {summary}
            </div>
          )
          : null}
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
