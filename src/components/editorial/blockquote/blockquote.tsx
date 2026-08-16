import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Props for the {@linkcode Blockquote} component. */
export interface BlockquoteProps extends HTMLAttributes<HTMLQuoteElement> {
  /** One or more semantic block children that make up the quotation. */
  readonly children: ReactNode;
}

/** An ordinary block quotation without attribution or decorative quote marks. */
export const Blockquote: DiscernComponent<
  HTMLQuoteElement,
  BlockquoteProps
> = forwardRef<HTMLQuoteElement, BlockquoteProps>(function Blockquote(
  { children, className, ...props },
  ref,
) {
  return (
    <blockquote
      ref={ref}
      className={classNames("discern-blockquote", className)}
      {...props}
    >
      {children}
    </blockquote>
  );
});
