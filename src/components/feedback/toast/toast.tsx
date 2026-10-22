import { forwardRef, useEffect } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { IconButton } from "../../core/icon-button/icon-button.tsx";
import { FeedbackMark } from "../feedback-marks.tsx";
import type { ToastTone } from "./toast.types.ts";

export type { ToastTone } from "./toast.types.ts";
/** Props for the {@linkcode Toast} component. */
export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  readonly tone?: ToastTone;
  readonly icon?: ReactNode;
  readonly onDismiss?: () => void;
  readonly duration?: number;
  readonly dismissLabel?: string;
  readonly children: ReactNode;
}

/** Transient status message plus a labelled live-region container. */
export const Toast: DiscernComponent<HTMLDivElement, ToastProps> = forwardRef<
  HTMLDivElement,
  ToastProps
>(function Toast(
  {
    tone = "neutral",
    icon,
    onDismiss,
    duration,
    dismissLabel = "Dismiss notification",
    className,
    children,
    role,
    ...props
  },
  ref,
) {
  useEffect(() => {
    if (!duration || !onDismiss) return;
    const timer = globalThis.setTimeout(onDismiss, duration);
    return () => globalThis.clearTimeout(timer);
  }, [duration, onDismiss]);
  const semanticRole = role ?? (tone === "danger" ? "alert" : "status");
  const toneLabel = tone[0]?.toLocaleUpperCase() + tone.slice(1);
  return (
    <div
      ref={ref}
      role={semanticRole}
      className={classNames(
        "discern-toast",
        `discern-toast--${tone}`,
        className,
      )}
      {...props}
      data-discern-floating-surface="surface"
      data-discern-tone={tone}
    >
      <span
        className="discern-toast__icon"
        role="img"
        aria-label={toneLabel}
      >
        {icon ?? <FeedbackMark name={tone} />}
      </span>
      <span className="discern-toast__content">{children}</span>
      {onDismiss
        ? (
          <IconButton
            className="discern-toast__dismiss"
            size="sm"
            label={dismissLabel}
            icon={<FeedbackMark name="dismiss" />}
            onClick={onDismiss}
          />
        )
        : null}
    </div>
  );
});

/** Props for the {@linkcode ToastRegion} component. */
export interface ToastRegionProps extends HTMLAttributes<HTMLDivElement> {
  readonly label?: string;
}
/** Live region that positions and announces Toast notifications. */
export const ToastRegion: DiscernComponent<HTMLDivElement, ToastRegionProps> =
  forwardRef<HTMLDivElement, ToastRegionProps>(
    function ToastRegion(
      { label = "Notifications", className, ...props },
      ref,
    ) {
      return (
        <div
          ref={ref}
          aria-label={label}
          className={classNames("discern-toast-region", className)}
          {...props}
        />
      );
    },
  );
