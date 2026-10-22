import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { FeedbackMark } from "../../feedback/feedback-marks.tsx";
import type { BadgeTone } from "./badge.types.ts";

/** Props for the {@linkcode Badge} component. */
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone?: BadgeTone;
  /** Lead with the tone's mark: the feedback mark for success, warning and danger, a dot or ring otherwise. */
  readonly dot?: boolean;
  readonly children: ReactNode;
}

function BadgeMarker({ tone }: { readonly tone: BadgeTone }) {
  return (
    <span className="discern-badge__mark" aria-hidden="true">
      {tone === "success" || tone === "warning" || tone === "danger"
        ? <FeedbackMark name={tone} />
        : <span className="discern-badge__dot" />}
    </span>
  );
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
      {dot ? <BadgeMarker tone={tone} /> : null}
      {children}
    </span>
  );
});
