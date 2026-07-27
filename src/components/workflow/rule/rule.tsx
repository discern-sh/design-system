import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Props for the {@linkcode Rule} component. */
export interface RuleProps extends HTMLAttributes<HTMLElement> {
  readonly children: ReactNode;
  readonly origin: ReactNode;
  readonly scope: ReactNode;
}

/** One binding project instruction with explicit origin and scope. */
export const Rule: DiscernComponent<HTMLElement, RuleProps> = forwardRef<
  HTMLElement,
  RuleProps
>(function Rule({ children, origin, scope, className, ...props }, ref) {
  return (
    <article
      ref={ref}
      className={classNames("discern-rule", className)}
      {...props}
    >
      <span className="discern-rule__label">Rule</span>
      <div className="discern-rule__body">{children}</div>
      <dl className="discern-rule__meta">
        <div>
          <dt>Origin</dt>
          <dd>{origin}</dd>
        </div>
        <div>
          <dt>Scope</dt>
          <dd>{scope}</dd>
        </div>
      </dl>
    </article>
  );
});
