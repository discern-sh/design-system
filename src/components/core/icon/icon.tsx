import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Props for the {@linkcode Icon} component. */
export interface IconProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  readonly children: ReactNode;
  readonly label?: string;
  readonly size?: number | string;
  /** Quiet relief with fit="contain" at allocations of at least 2.5rem; intrinsic and smaller graphics stay flat. */
  readonly relief?: boolean;
  /** Preserve supplied dimensions by default; contain scales the graphic into the Icon allocation. */
  readonly fit?: "intrinsic" | "contain";
}

/** Vendor-neutral sizing and accessibility wrapper for an injected icon graphic. */
export const Icon: DiscernComponent<HTMLSpanElement, IconProps> = forwardRef<
  HTMLSpanElement,
  IconProps
>(function Icon(
  {
    children,
    label,
    size = "1em",
    relief = false,
    fit = "intrinsic",
    className,
    style,
    ...props
  },
  ref,
) {
  const accessibility = label
    ? { role: "img", "aria-label": label }
    : { "aria-hidden": true as const };
  return (
    <span
      ref={ref}
      className={classNames(
        "discern-icon",
        relief && "discern-icon--relief",
        fit === "contain" && "discern-icon--contain",
        className,
      )}
      style={{ width: size, height: size, ...style }}
      {...accessibility}
      {...props}
    >
      {children}
    </span>
  );
});
