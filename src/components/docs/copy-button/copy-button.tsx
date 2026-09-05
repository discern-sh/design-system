import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Props for the {@linkcode CopyButton} component. */
export interface CopyButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "value"> {
  /** Exact clipboard text, independent of the visible label or source formatting. */
  readonly value: string;
  readonly label?: ReactNode;
  readonly copiedLabel?: ReactNode;
  /** Failure guidance shown until the next attempt. */
  readonly failedLabel?: ReactNode;
  readonly icon?: ReactNode;
  readonly copiedIcon?: ReactNode;
  readonly copiedForMs?: number;
}

/** Static clipboard markup activated by the selected runtime in an opted-in root. */
export const CopyButton: DiscernComponent<
  HTMLButtonElement,
  CopyButtonProps
> = forwardRef<HTMLButtonElement, CopyButtonProps>(function CopyButton(
  {
    value,
    label = "Copy",
    copiedLabel = "Copied",
    failedLabel = "Copy failed — select text manually",
    icon,
    copiedIcon,
    copiedForMs = 2000,
    className,
    disabled = false,
    ...props
  },
  ref,
) {
  const alternateIcon = copiedIcon !== undefined && copiedIcon !== icon;
  return (
    <button
      type="button"
      {...props}
      ref={ref}
      className={classNames("discern-copy-button", className)}
      disabled={disabled}
      {...{ inert: "" }}
      data-discern-copy-value={JSON.stringify(value)}
      data-discern-copy-duration={Number.isFinite(copiedForMs)
        ? Math.max(0, copiedForMs)
        : 2000}
    >
      {icon !== undefined && (
        <span
          className="discern-copy-button__icon"
          aria-hidden="true"
          data-discern-copy-feedback={alternateIcon
            ? "idle failed"
            : "idle copied failed"}
        >
          {icon}
        </span>
      )}
      {alternateIcon && (
        <span
          className="discern-copy-button__icon"
          aria-hidden="true"
          data-discern-copy-feedback="copied"
          hidden
        >
          {copiedIcon}
        </span>
      )}
      <span aria-live="polite" aria-atomic="true">
        {([
          ["idle", label],
          ["copied", copiedLabel],
          ["failed", failedLabel],
        ] as const).map(([state, text]) => (
          <span
            key={state}
            data-discern-copy-feedback={state}
            hidden={state !== "idle"}
          >
            {text}
          </span>
        ))}
      </span>
    </button>
  );
});
