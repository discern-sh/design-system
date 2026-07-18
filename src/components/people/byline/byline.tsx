import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Props for the {@linkcode Byline} component. */
export interface BylineProps extends HTMLAttributes<HTMLElement> {
  readonly authors: ReactNode;
  readonly lede?: ReactNode;
  readonly children?: ReactNode;
}

/** Attribution row naming an article's authors beside its publication meta. */
export const Byline: DiscernComponent<HTMLElement, BylineProps> = forwardRef<
  HTMLElement,
  BylineProps
>(function Byline({ authors, lede, children, className, ...props }, ref) {
  return (
    <address
      ref={ref}
      className={classNames("discern-byline", className)}
      {...props}
    >
      {lede !== undefined && lede !== null
        ? <span className="discern-byline__lede">{lede}</span>
        : null}
      <span className="discern-byline__authors">{authors}</span>
      {children !== undefined && children !== null
        ? <span className="discern-byline__meta">{children}</span>
        : null}
    </address>
  );
});
