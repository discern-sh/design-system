import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** One metadata row printed by the {@linkcode Receipt} component. */
export interface ReceiptMeta {
  readonly label: ReactNode;
  readonly value: ReactNode;
}

/** Outcome one {@linkcode ReceiptCheck} row can carry. */
export type ReceiptCheckState = "pass" | "fail" | "skip";

/** One check row printed by the {@linkcode Receipt} component. */
export interface ReceiptCheck {
  readonly label: ReactNode;
  readonly state: ReceiptCheckState;
  readonly stateLabel?: string;
  readonly value?: ReactNode;
}

/** Props for the {@linkcode Receipt} component. */
export interface ReceiptProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly title: ReactNode;
  readonly stamp?: "pass" | "fail";
  readonly stampLabel?: ReactNode;
  readonly meta?: readonly ReceiptMeta[];
  readonly checks?: readonly ReceiptCheck[];
  readonly summary?: ReactNode;
  readonly footer?: ReactNode;
}

const checkGlyphs: Record<ReceiptCheckState, string> = {
  pass: "✓",
  fail: "✕",
  skip: "–",
};

/** Monospace proof-of-work card: a stamped title, metadata rows, and dot-leadered check lines. */
export const Receipt: DiscernComponent<HTMLElement, ReceiptProps> = forwardRef<
  HTMLElement,
  ReceiptProps
>(function Receipt(
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
      className={classNames("discern-receipt", className)}
      {...props}
    >
      <header className="discern-receipt__header">
        <span className="discern-receipt__title">{title}</span>
        {stamp !== undefined
          ? (
            <span
              className="discern-receipt__stamp"
              data-discern-state={stamp}
            >
              {stampLabel ?? (stamp === "pass" ? "Pass" : "Fail")}
            </span>
          )
          : null}
      </header>
      {meta !== undefined && meta.length > 0
        ? (
          <dl className="discern-receipt__meta">
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
          <dl className="discern-receipt__checks">
            {checks.map((check, index) => (
              <div data-discern-state={check.state} key={index}>
                <dt>{check.label}</dt>
                <dd>
                  {check.value !== undefined && check.value !== null
                    ? check.value
                    : null}
                  <span
                    className="discern-receipt__glyph"
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
        ? <div className="discern-receipt__summary">{summary}</div>
        : null}
      {footer !== undefined && footer !== null
        ? <footer className="discern-receipt__footer">{footer}</footer>
        : null}
    </article>
  );
});
