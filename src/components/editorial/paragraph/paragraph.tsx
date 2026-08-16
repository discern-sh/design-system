import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Props for the {@linkcode Paragraph} component. */
export interface ParagraphProps extends HTMLAttributes<HTMLParagraphElement> {
  /** Ordinary React phrasing content rendered inside the semantic paragraph. */
  readonly children: ReactNode;
}

/** One semantic paragraph with the package reading typography and measure. */
export const Paragraph: DiscernComponent<
  HTMLParagraphElement,
  ParagraphProps
> = forwardRef<HTMLParagraphElement, ParagraphProps>(function Paragraph(
  { children, className, ...props },
  ref,
) {
  return (
    <p
      ref={ref}
      className={classNames("discern-paragraph", className)}
      {...props}
    >
      {children}
    </p>
  );
});
