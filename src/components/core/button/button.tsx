import { forwardRef } from "react";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
  Ref,
} from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Variant options for the Button component. */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
/** Size options for the Button component. */
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonCommonProps {
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
  const classes = classNames(
    "discern-button",
    `discern-button--${variant}`,
    `discern-button--${size}`,
    props.className,
  );

  if ("href" in props && typeof props.href === "string") {
    const {
      href,
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
        href={href}
        className={classes}
        {...anchorProps}
      >
        {content(leadingIcon, children, trailingIcon)}
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
    type = "button",
    ...buttonProps
  } = props;
  return (
    <button
      ref={forwardedRef as Ref<HTMLButtonElement>}
      type={type}
      className={classes}
      {...buttonProps}
    >
      {content(leadingIcon, children, trailingIcon)}
    </button>
  );
});
