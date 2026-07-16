import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Props for the {@linkcode Prose} component. */
export interface ProseProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly dropCap?: boolean;
  readonly lead?: boolean;
  readonly measure?: "narrow" | "default" | "wide";
}

/** Long-form typographic context for headings, paragraphs, lists, links, inline code, rules, and optional lead or drop-cap treatments. */
export const Prose: DiscernComponent<HTMLDivElement, ProseProps> = forwardRef<
  HTMLDivElement,
  ProseProps
>(function Prose(
  {
    children,
    dropCap = false,
    lead = false,
    measure = "default",
    className,
    ...props
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={classNames(
        "discern-prose",
        `discern-prose--${measure}`,
        dropCap && "discern-prose--drop-cap",
        lead && "discern-prose--lead",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});
