import { forwardRef, useEffect, useRef, useState } from "react";
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Props for the {@linkcode CopyButton} component. */
export interface CopyButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "value"> {
  readonly value: string;
  readonly label?: ReactNode;
  readonly copiedLabel?: ReactNode;
  readonly icon?: ReactNode;
  readonly copiedIcon?: ReactNode;
  readonly copiedForMs?: number;
}

/** Clipboard copy button with a transient confirmation state announced politely. */
export const CopyButton: DiscernComponent<
  HTMLButtonElement,
  CopyButtonProps
> = forwardRef<HTMLButtonElement, CopyButtonProps>(function CopyButton(
  {
    value,
    label = "Copy",
    copiedLabel = "Copied",
    icon,
    copiedIcon,
    copiedForMs = 2000,
    className,
    onClick,
    ...props
  },
  ref,
) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timer.current !== undefined) clearTimeout(timer.current);
    };
  }, []);

  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    void navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      if (timer.current !== undefined) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), copiedForMs);
    }).catch(() => undefined);
  };

  const shownIcon = copied ? copiedIcon ?? icon : icon;
  return (
    <button
      ref={ref}
      type="button"
      className={classNames("discern-copy-button", className)}
      data-discern-copied={copied ? "" : undefined}
      onClick={handleClick}
      {...props}
    >
      {shownIcon !== undefined && (
        <span className="discern-copy-button__icon" aria-hidden="true">
          {shownIcon}
        </span>
      )}
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </button>
  );
});
