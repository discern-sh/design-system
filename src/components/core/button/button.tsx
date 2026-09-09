import { BusyGlyph } from "../icon/busy-glyph.tsx";
import { Icon } from "../icon/icon.tsx";
import { forwardRef } from "react";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
  Ref,
} from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import type { ButtonSize, ButtonVariant } from "./button.types.ts";

interface ButtonCommonProps {
  /** Caller-owned pending state; disables native activation without replacing the label. */
  readonly busy?: boolean;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly leadingIcon?: ReactNode;
  readonly trailingIcon?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

/** Native button props options for the Button component. */
export type NativeButtonProps =
  & ButtonCommonProps
  & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    keyof ButtonCommonProps | "href"
  >
  & {
    readonly href?: never;
  };

/** Anchor button props options for the Button component. */
export type AnchorButtonProps =
  & ButtonCommonProps
  & Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    keyof ButtonCommonProps | "href"
  >
  & {
    readonly href: string;
    readonly disabled?: never;
  };

/** Props options for the Button component. */
export type ButtonProps = NativeButtonProps | AnchorButtonProps;

function content(
  leadingIcon: ReactNode,
  children: ReactNode,
  trailingIcon: ReactNode,
  busy: boolean,
) {
  return (
    <>
      {leadingIcon
        ? (
          <span className="discern-button__icon" aria-hidden="true">
            {leadingIcon}
          </span>
        )
        : null}
      <span className="discern-button__label">{children}</span>
      {trailingIcon
        ? (
          <span className="discern-button__icon" aria-hidden="true">
            {trailingIcon}
          </span>
        )
        : null}
      {busy
        ? (
          <Icon
            className="discern-icon--busy discern-button__busy"
            size="var(--discern-button-busy-size)"
          >
            <BusyGlyph />
          </Icon>
        )
        : null}
    </>
  );
}

/** Typed button and anchor variants with vendor-neutral leading and trailing icon slots. */
export const Button: DiscernComponent<
  HTMLButtonElement | HTMLAnchorElement,
  ButtonProps
> = forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  ButtonProps
>(function Button(props, forwardedRef) {
  const variant = props.variant ?? "primary";
  const size = props.size ?? "md";
  const busy = props.busy === true || props["aria-busy"] === true ||
    props["aria-busy"] === "true";
  const unavailable = busy || props["aria-disabled"] === true ||
    props["aria-disabled"] === "true";
  const classes = classNames(
    "discern-button",
    `discern-button--${variant}`,
    `discern-button--${size}`,
    props.className,
  );

  if ("href" in props && typeof props.href === "string") {
    const {
      href,
      busy: _busy,
      variant: _variant,
      size: _size,
      leadingIcon,
      trailingIcon,
      children,
      className: _className,
      ...anchorProps
    } = props;
    return (
      <a
        ref={forwardedRef as Ref<HTMLAnchorElement>}
        className={classes}
        {...anchorProps}
        href={unavailable ? undefined : href}
        role={unavailable ? "link" : anchorProps.role}
        tabIndex={unavailable ? -1 : anchorProps.tabIndex}
        aria-disabled={unavailable || undefined}
        aria-busy={busy || undefined}
      >
        {content(leadingIcon, children, trailingIcon, busy)}
      </a>
    );
  }

  const {
    variant: _variant,
    size: _size,
    leadingIcon,
    trailingIcon,
    children,
    className: _className,
    busy: _busy,
    type = "button",
    ...buttonProps
  } = props;
  return (
    <button
      ref={forwardedRef as Ref<HTMLButtonElement>}
      type={type}
      className={classes}
      {...buttonProps}
      disabled={buttonProps.disabled || unavailable}
      aria-busy={busy || undefined}
    >
      {content(leadingIcon, children, trailingIcon, busy)}
    </button>
  );
});
