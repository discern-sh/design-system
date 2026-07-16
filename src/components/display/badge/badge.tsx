import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Tone options for the Badge component. */
export type BadgeTone = "accent" | "neutral" | "success" | "warning" | "danger";

/** Props for the {@linkcode Badge} component. */
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone?: BadgeTone;
  readonly dot?: boolean;
  readonly children: ReactNode;
}

/** Compact status and metadata label with semantic tones. */
export const Badge: DiscernComponent<HTMLSpanElement, BadgeProps> = forwardRef<
  HTMLSpanElement,
  BadgeProps
>(function Badge(
  { tone = "accent", dot = false, className, children, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      className={classNames(
        "discern-badge",
        `discern-badge--${tone}`,
        className,
      )}
      {...props}
    >
      {dot ? <span className="discern-badge__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
});
