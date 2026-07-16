import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Props for the {@linkcode Divider} component. */
export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  readonly label?: ReactNode;
  readonly surface?: "canvas" | "surface";
}

/** Quiet editorial rule with an optional annotation label. */
export const Divider: DiscernComponent<HTMLDivElement, DividerProps> =
  forwardRef<HTMLDivElement, DividerProps>(function Divider(
    { label, surface = "canvas", className, ...props },
    ref,
  ) {
    const hasLabel = label !== undefined && label !== null;
    return (
      <div
        ref={ref}
        role="separator"
        className={classNames(
          "discern-divider",
          `discern-divider--${surface}`,
          hasLabel ? "discern-divider--labelled" : "discern-divider--plain",
          className,
        )}
        {...props}
      >
        {hasLabel
          ? <span className="discern-divider__label">{label}</span>
          : null}
      </div>
    );
  });
