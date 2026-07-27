import { forwardRef } from "react";
import type { DetailsHTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Props for the {@linkcode RawOutput} component. */
export interface RawOutputProps
  extends Omit<DetailsHTMLAttributes<HTMLDetailsElement>, "children"> {
  readonly label?: ReactNode;
  readonly children: ReactNode;
}

/** Native disclosure for machine-oriented detail with a visible open or closed state. */
export const RawOutput: DiscernComponent<HTMLDetailsElement, RawOutputProps> =
  forwardRef<HTMLDetailsElement, RawOutputProps>(function RawOutput(
    {
      label = "Raw output",
      children,
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
          <span>{label}</span>
          <span
            className="discern-raw-output__state"
            aria-hidden="true"
          />
        </summary>
        <pre className="discern-raw-output__content">
          <code>{children}</code>
        </pre>
      </details>
    );
  });
