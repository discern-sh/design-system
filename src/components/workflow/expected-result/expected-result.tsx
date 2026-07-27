import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Content treatment for an {@linkcode ExpectedResult}. */
export type ExpectedResultVariant = "output" | "state";

/** Props for the {@linkcode ExpectedResult} component. */
export interface ExpectedResultProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  readonly label?: ReactNode;
  readonly variant?: ExpectedResultVariant;
  readonly children: ReactNode;
}

/** Observable output or end state that proves a command or procedure worked. */
export const ExpectedResult: DiscernComponent<
  HTMLDivElement,
  ExpectedResultProps
> = forwardRef<HTMLDivElement, ExpectedResultProps>(function ExpectedResult(
  {
    label = "You should see",
    variant = "output",
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={classNames(
        "discern-expected-result",
        `discern-expected-result--${variant}`,
        className,
      )}
      {...props}
    >
      <span className="discern-expected-result__label">{label}</span>
      {variant === "output"
        ? (
          <pre className="discern-expected-result__output">
            <code>{children}</code>
          </pre>
        )
        : <div className="discern-expected-result__state">{children}</div>}
    </div>
  );
});
