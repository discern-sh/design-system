import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Preset visual size for the {@linkcode Logo} component. */
export type LogoSize = "sm" | "md" | "lg" | "xl";

/** Boundary treatment for the {@linkcode Logo} component. */
export type LogoTreatment = "plain" | "tile";

/** Intrinsic or square layout for the {@linkcode Logo} component. */
export type LogoShape = "natural" | "square";

/** Props for the {@linkcode Logo} component. */
export interface LogoProps extends
  Omit<
    HTMLAttributes<HTMLSpanElement>,
    "aria-hidden" | "aria-label" | "children" | "role"
  > {
  readonly children: ReactNode;
  readonly label?: string;
  readonly size?: LogoSize;
  readonly treatment?: LogoTreatment;
  readonly shape?: LogoShape;
}

/** Adaptive logo wrapper for text glyphs, injected graphics, and wide or square marks. */
export const Logo: DiscernComponent<HTMLSpanElement, LogoProps> = forwardRef<
  HTMLSpanElement,
  LogoProps
>(function Logo(
  {
    children,
    label,
    size = "md",
    treatment = "plain",
    shape = "natural",
    className,
    ...props
  },
  ref,
) {
  const accessibility = label === undefined
    ? { "aria-hidden": true as const }
    : { role: "img", "aria-label": label };
  return (
    <span
      ref={ref}
      className={classNames(
        "discern-logo",
        "discern-logo--" + size,
        "discern-logo--" + treatment,
        "discern-logo--" + shape,
        className,
      )}
      {...accessibility}
      {...props}
    >
      {children}
    </span>
  );
});
