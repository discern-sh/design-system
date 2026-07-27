import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Attention level for a {@linkcode DestructiveActionNotice}. */
export type DestructiveActionNoticeTone = "warning" | "danger";

/** Props for the {@linkcode DestructiveActionNotice} component. */
export interface DestructiveActionNoticeProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  readonly label?: ReactNode;
  readonly scope: ReactNode;
  readonly impact: ReactNode;
  readonly recovery: ReactNode;
  readonly authority?: ReactNode;
  readonly tone?: DestructiveActionNoticeTone;
}

/** Explicit scope, impact, authority, and recovery route for an irreversible or owner-only action. */
export const DestructiveActionNotice: DiscernComponent<
  HTMLDivElement,
  DestructiveActionNoticeProps
> = forwardRef<HTMLDivElement, DestructiveActionNoticeProps>(
  function DestructiveActionNotice(
    {
      label,
      scope,
      impact,
      recovery,
      authority,
      tone = "warning",
      className,
      role,
      ...props
    },
    ref,
  ) {
    const semanticRole = role ?? (tone === "danger" ? "alert" : "note");
    return (
      <div
        ref={ref}
        className={classNames(
          "discern-destructive-action-notice",
          `discern-destructive-action-notice--${tone}`,
          className,
        )}
        role={semanticRole}
        {...props}
      >
        <strong className="discern-destructive-action-notice__label">
          <span className="discern-destructive-action-notice__state">
            {tone === "danger" ? "Danger" : "Warning"}
          </span>
          {": "}
          <span className="discern-destructive-action-notice__custom-label">
            {label ?? "Destructive action"}
          </span>
        </strong>
        <dl className="discern-destructive-action-notice__facts">
          <div className="discern-destructive-action-notice__fact">
            <dt>Scope</dt>
            <dd>{scope}</dd>
          </div>
          <div className="discern-destructive-action-notice__fact">
            <dt>Impact</dt>
            <dd>{impact}</dd>
          </div>
          {authority !== undefined
            ? (
              <div className="discern-destructive-action-notice__fact">
                <dt>Authority</dt>
                <dd>{authority}</dd>
              </div>
            )
            : null}
          <div className="discern-destructive-action-notice__fact">
            <dt>Recovery</dt>
            <dd>{recovery}</dd>
          </div>
        </dl>
      </div>
    );
  },
);
