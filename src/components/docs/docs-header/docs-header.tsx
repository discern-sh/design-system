import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Props for the {@linkcode DocsHeader} component. */
export interface DocsHeaderProps extends HTMLAttributes<HTMLElement> {
  readonly brand: ReactNode;
  readonly actions?: ReactNode;
  readonly children?: ReactNode;
}

/** Sticky opaque documentation top bar with brand, middle, and action regions. */
export const DocsHeader: DiscernComponent<HTMLElement, DocsHeaderProps> =
  forwardRef<HTMLElement, DocsHeaderProps>(function DocsHeader(
    { brand, actions, className, children, ...props },
    ref,
  ) {
    return (
      <header
        ref={ref}
        className={classNames("discern-docs-header", className)}
        {...props}
        data-discern-floating-surface="surface"
      >
        <div className="discern-docs-header__inner">
          <div className="discern-docs-header__brand">{brand}</div>
          <div className="discern-docs-header__middle">{children}</div>
          {actions !== undefined && (
            <div className="discern-docs-header__actions">{actions}</div>
          )}
        </div>
      </header>
    );
  });
