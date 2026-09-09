import { BusyGlyph } from "../icon/busy-glyph.tsx";
import { Icon } from "../icon/icon.tsx";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import type { IconButtonSize, IconButtonVariant } from "./icon-button.types.ts";

/** Props for the {@linkcode IconButton} component. */
export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Caller-owned pending state; disables native activation and retains the action name and icon slot. */
  readonly busy?: boolean;
  readonly icon: ReactNode;
  readonly label: string;
  readonly variant?: IconButtonVariant;
  readonly size?: IconButtonSize;
}

/** Square icon action with a required accessible label and injected graphic. */
export const IconButton: DiscernComponent<HTMLButtonElement, IconButtonProps> =
  forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
    {
      icon,
      busy = false,
      label,
      variant = "quiet",
      size = "md",
      className,
      type = "button",
      ...props
    },
    ref,
  ) {
    const pending = busy || props["aria-busy"] === true ||
      props["aria-busy"] === "true";
    const unavailable = pending || props.disabled ||
      props["aria-disabled"] === true || props["aria-disabled"] === "true";
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        className={classNames(
          "discern-icon-button",
          `discern-icon-button--${variant}`,
          `discern-icon-button--${size}`,
          className,
        )}
        {...props}
        disabled={unavailable}
        aria-busy={pending || undefined}
      >
        <span className="discern-icon-button__glyph" aria-hidden="true">
          {icon}
        </span>
        {pending
          ? (
            <Icon
              className="discern-icon--busy discern-icon-button__busy"
              size="var(--discern-icon-button-icon-size)"
            >
              <BusyGlyph />
            </Icon>
          )
          : null}
      </button>
    );
  });
