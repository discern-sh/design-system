import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import type { DividerSurface } from "./divider.types.ts";

/** Props for the {@linkcode Divider} component. */
export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  readonly label?: ReactNode;
  /** Ground the rule sits on. It tones the terminal rule; the browser rule and label paint no ground, so they read the same on either. */
  readonly surface?: DividerSurface;
}

/** Quiet editorial rule with an optional annotation label. */
export const Divider: DiscernComponent<HTMLDivElement, DividerProps> =
  forwardRef<HTMLDivElement, DividerProps>(function Divider(
    { label, surface: _terminalSurface, className, ...props },
    ref,
  ) {
    const hasLabel = label !== undefined && label !== null;
    return (
      <div
        ref={ref}
        role="separator"
        className={classNames(
          "discern-divider",
          !hasLabel && "discern-divider--plain",
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
