import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

export interface KickerProps extends HTMLAttributes<HTMLSpanElement> {
  readonly index?: ReactNode;
  readonly children: ReactNode;
}
export const Kicker: DiscernComponent<HTMLSpanElement, KickerProps> =
  forwardRef<HTMLSpanElement, KickerProps>(
    function Kicker({ index, className, children, ...props }, ref) {
      return (
        <span
          ref={ref}
          className={classNames("discern-kicker", className)}
          {...props}
        >
          {index !== undefined && index !== null
            ? <span className="discern-kicker__index">{index}</span>
            : null}
          <span className="discern-kicker__text">{children}</span>
        </span>
      );
    },
  );
