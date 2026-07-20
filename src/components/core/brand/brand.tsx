import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { Logo } from "../logo/logo.tsx";
import type { LogoShape, LogoSize, LogoTreatment } from "../logo/logo.tsx";

/** Name typeface for the {@linkcode Brand} component. */
export type BrandTypeface = "inherit" | "ui" | "display" | "mono";

/** Preset visual size for the {@linkcode Brand} component. */
export type BrandSize = "sm" | "md" | "lg";

/** Props for the {@linkcode Brand} component. */
export interface BrandProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  readonly name: ReactNode;
  readonly mark?: ReactNode;
  readonly tagline?: ReactNode;
  readonly size?: BrandSize;
  readonly typeface?: BrandTypeface;
  readonly markTreatment?: LogoTreatment;
  readonly markShape?: LogoShape;
}

const markSizes: Readonly<Record<BrandSize, LogoSize>> = {
  sm: "sm",
  md: "md",
  lg: "lg",
};

/** Composable brand lockup pairing an adaptive decorative mark with a name and optional tagline. */
export const Brand: DiscernComponent<HTMLSpanElement, BrandProps> = forwardRef<
  HTMLSpanElement,
  BrandProps
>(function Brand(
  {
    name,
    mark,
    tagline,
    size = "md",
    typeface = "display",
    markTreatment = "plain",
    markShape = "natural",
    className,
    ...props
  },
  ref,
) {
  return (
    <span
      ref={ref}
      className={classNames(
        "discern-brand",
        "discern-brand--" + size,
        "discern-brand--" + typeface,
        className,
      )}
      {...props}
    >
      {mark !== undefined && mark !== null
        ? (
          <Logo
            className="discern-brand__mark"
            size={markSizes[size]}
            treatment={markTreatment}
            shape={markShape}
          >
            {mark}
          </Logo>
        )
        : null}
      <span className="discern-brand__copy">
        <span className="discern-brand__name">{name}</span>
        {tagline !== undefined && tagline !== null
          ? <span className="discern-brand__tagline">{tagline}</span>
          : null}
      </span>
    </span>
  );
});
