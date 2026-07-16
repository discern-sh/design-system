import { forwardRef, useEffect } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Tone options for the Toast component. */
export type ToastTone = "neutral" | "success" | "warning" | "danger";
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
    >
      {icon
        ? (
          <span className="discern-toast__icon" aria-hidden="true">
            {icon}
          </span>
        )
        : null}
      <span className="discern-toast__content">{children}</span>
      {onDismiss
        ? (
          <button
            type="button"
            className="discern-toast__dismiss"
            aria-label={dismissLabel}
            onClick={onDismiss}
          >
            <span aria-hidden="true">×</span>
          </button>
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
