import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { TERMINAL_GLYPHS } from "../../../cli/terminal-glyphs.ts";

/** Props for the {@linkcode RetryNotice} component. */
export interface RetryNoticeProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  readonly safeToRetry: boolean;
  readonly reason: ReactNode;
  readonly label?: ReactNode;
}

/** Compact statement of whether an interrupted action is idempotent and why. */
export const RetryNotice: DiscernComponent<
  HTMLDivElement,
  RetryNoticeProps
> = forwardRef<HTMLDivElement, RetryNoticeProps>(function RetryNotice(
  {
    safeToRetry,
    reason,
    label,
    className,
    role = "note",
    ...props
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={classNames(
        "discern-retry-notice",
        safeToRetry
          ? "discern-retry-notice--safe"
          : "discern-retry-notice--unsafe",
        className,
      )}
      role={role}
      {...props}
    >
      <div className="discern-retry-notice__layout">
        <strong className="discern-retry-notice__label">
          <span className="discern-retry-notice__mark" aria-hidden="true">
            {safeToRetry
              ? TERMINAL_GLYPHS.done.unicode
              : TERMINAL_GLYPHS.attention.unicode}
          </span>
          <span className="discern-retry-notice__state">
            {safeToRetry ? "Safe to retry" : "Do not retry"}
          </span>
          {label !== undefined
            ? (
              <>
                {" — "}
                <span className="discern-retry-notice__custom-label">
                  {label}
                </span>
              </>
            )
            : null}
        </strong>
        <div className="discern-retry-notice__reason">{reason}</div>
      </div>
    </div>
  );
});
