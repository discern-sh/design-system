import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
export interface SectionProps extends HTMLAttributes<HTMLElement> {
  readonly surface?: "canvas" | "surface" | "sunken";
  readonly spacing?: "none" | "sm" | "md" | "lg";
  readonly children: ReactNode;
}
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
