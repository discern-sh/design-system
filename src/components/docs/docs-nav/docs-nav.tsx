import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { useInitialFragmentTarget } from "../../use-initial-fragment-target.ts";

/** One destination rendered by the Docs nav component. */
export interface DocsNavItem {
  readonly label: ReactNode;
  readonly href: string;
  readonly current?: boolean;
}

/** One titled run of destinations rendered by the Docs nav component. */
export interface DocsNavSection {
  readonly title?: ReactNode;
  readonly items: readonly DocsNavItem[];
}

/** Props for the {@linkcode DocsNav} component. */
export interface DocsNavProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  readonly sections: readonly DocsNavSection[];
  readonly label?: string;
}

/** Sectioned documentation navigation rail with one explicit current destination. */
export const DocsNav: DiscernComponent<HTMLElement, DocsNavProps> = forwardRef<
  HTMLElement,
  DocsNavProps
>(function DocsNav(
  { sections, label = "Section navigation", className, ...props },
  ref,
) {
  useInitialFragmentTarget();
  return (
    <nav
      ref={ref}
      className={classNames("discern-docs-nav", className)}
      aria-label={label}
      {...props}
    >
      {sections.map((section, index) => (
        <div className="discern-docs-nav__section" key={index}>
          {section.title !== undefined && (
            <strong className="discern-docs-nav__title">
              {section.title}
            </strong>
          )}
          <ul>
            {section.items.map((item, itemIndex) => (
              <li key={itemIndex}>
                <a
                  href={item.href}
                  aria-current={item.current ? "page" : undefined}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
});
