import { forwardRef } from "react";
import type { DetailsHTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { outputExtent } from "./raw-output.types.ts";
import { classNames } from "../../class-names.ts";
import { renderCodeRuns } from "../../code-runs.tsx";
import {
  type CodeDialect,
  projectCodeRuns,
} from "../../../internal/code-emphasis.ts";

/** Props for the {@linkcode RawOutput} component. */
export interface RawOutputProps
  extends Omit<DetailsHTMLAttributes<HTMLDetailsElement>, "children"> {
  readonly label?: ReactNode;
  readonly children: ReactNode;
  /** Caller-reported outcome; never inferred from raw content. */
  readonly outcome?: ReactNode;
  /** Authored extent for rich content; plain strings derive their line count. */
  readonly extent?: ReactNode;
  /** Delimiter family for optional lexical emphasis of plain-string content. Omit to render content unchanged; ANSI-coloured output should stay unemphasised. */
  readonly dialect?: CodeDialect;
}

/** Native disclosure for machine-oriented detail with a visible open or closed state. */
export const RawOutput: DiscernComponent<HTMLDetailsElement, RawOutputProps> =
  forwardRef<HTMLDetailsElement, RawOutputProps>(function RawOutput(
    {
      label = "Raw output",
      children,
      outcome,
      extent,
      dialect,
      className,
      ...props
    },
    ref,
  ) {
    return (
      <details
        ref={ref}
        className={classNames("discern-raw-output", className)}
        {...props}
      >
        <summary className="discern-raw-output__summary">
          <span className="discern-raw-output__marker" aria-hidden="true">
            ›
          </span>
          <span className="discern-raw-output__subject">{label}</span>{" "}
          <span className="discern-raw-output__extent">
            {extent ??
              (typeof children === "string"
                ? outputExtent(children)
                : undefined)}
          </span>{" "}
          {outcome !== undefined && (
            <span className="discern-raw-output__outcome">{outcome}</span>
          )}
          <span
            className="discern-raw-output__state"
            aria-hidden="true"
          />
        </summary>
        <pre
          className="discern-raw-output__content"
          role="group"
          aria-label={typeof label === "string"
            ? `Scrollable raw output: ${label}`
            : "Scrollable raw output"}
          tabIndex={0}
        >
          <code>
            {typeof children === "string" && dialect !== undefined
              ? renderCodeRuns(projectCodeRuns(children, dialect))
              : children}
          </code>
        </pre>
      </details>
    );
  });
