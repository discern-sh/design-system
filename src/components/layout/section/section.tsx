import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import type { SectionSpacing, SectionSurface } from "./section.types.ts";
/** Props for the {@linkcode Section} component. */
export interface SectionProps extends HTMLAttributes<HTMLElement> {
  readonly surface?: SectionSurface;
  readonly spacing?: SectionSpacing;
  readonly children: ReactNode;
}
/** Semantic page section with tokenized surface and vertical rhythm. */
export const Section: DiscernComponent<HTMLElement, SectionProps> = forwardRef<
  HTMLElement,
  SectionProps
>(function Section(
  { surface = "canvas", spacing = "md", className, children, ...props },
  ref,
) {
  return (
    <section
      ref={ref}
      className={classNames(
        "discern-section",
        `discern-section--${surface}`,
        `discern-section--space-${spacing}`,
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
});
