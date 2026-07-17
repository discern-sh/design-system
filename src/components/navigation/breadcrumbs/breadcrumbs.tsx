import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** One ancestor link rendered before the current breadcrumb. */
export interface BreadcrumbItem {
  readonly label: ReactNode;
  readonly href: string;
}

/** Props for the {@linkcode Breadcrumbs} component. */
export interface BreadcrumbsProps
  extends Omit<HTMLAttributes<HTMLElement>, "aria-label" | "children"> {
  readonly items?: readonly BreadcrumbItem[];
  readonly current: ReactNode;
  readonly label?: string;
  readonly separator?: ReactNode;
}

/** Hierarchical page location using a labelled navigation landmark, ordered ancestors, and one explicit current page. */
export const Breadcrumbs: DiscernComponent<HTMLElement, BreadcrumbsProps> =
  forwardRef<HTMLElement, BreadcrumbsProps>(function Breadcrumbs(
    {
      items = [],
      current,
      label = "Breadcrumb",
      separator = "/",
      className,
      ...props
    },
    ref,
  ) {
    return (
      <nav
        ref={ref}
        className={classNames("discern-breadcrumbs", className)}
        aria-label={label}
        {...props}
      >
        <ol>
          {items.map((item, index) => (
            <li key={index}>
              <a href={item.href}>{item.label}</a>
              <span
                className="discern-breadcrumbs__separator"
                aria-hidden="true"
              >
                {separator}
              </span>
            </li>
          ))}
          <li className="discern-breadcrumbs__current">
            <span aria-current="page">{current}</span>
          </li>
        </ol>
      </nav>
    );
  });
