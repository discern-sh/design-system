import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { useInitialFragmentTarget } from "../../use-initial-fragment-target.ts";

/** One link entry rendered by the Site footer component. */
export interface SiteFooterLink {
  readonly label: ReactNode;
  readonly href: string;
}

/** One group entry rendered by the Site footer component. */
export interface SiteFooterGroup {
  readonly title: ReactNode;
  readonly links: readonly SiteFooterLink[];
}

/** Props for the {@linkcode SiteFooter} component. */
export interface SiteFooterProps extends HTMLAttributes<HTMLElement> {
  readonly brand: ReactNode;
  readonly brandMark?: ReactNode;
  readonly description?: ReactNode;
  readonly groups?: readonly SiteFooterGroup[];
  readonly legal?: ReactNode;
  readonly meta?: ReactNode;
}

/** Responsive page colophon with product context, grouped navigation, legal copy, and a compact metadata rail. */
export const SiteFooter: DiscernComponent<HTMLElement, SiteFooterProps> =
  forwardRef<HTMLElement, SiteFooterProps>(function SiteFooter(
    {
      brand,
      brandMark,
      description,
      groups = [],
      legal,
      meta,
      className,
      ...props
    },
    ref,
  ) {
    useInitialFragmentTarget();
    return (
      <footer
        ref={ref}
        className={classNames("discern-site-footer", className)}
        {...props}
      >
        <div className="discern-site-footer__inner">
          <div className="discern-site-footer__brand-column">
            <a className="discern-site-footer__brand" href="/">
              {brandMark
                ? (
                  <span
                    className="discern-site-footer__mark"
                    aria-hidden="true"
                  >
                    {brandMark}
                  </span>
                )
                : null}
              <span>{brand}</span>
            </a>
            {description
              ? (
                <div className="discern-site-footer__description">
                  {description}
                </div>
              )
              : null}
          </div>
          {groups.length
            ? (
              <nav className="discern-site-footer__nav" aria-label="Footer">
                {groups.map((group, index) => (
                  <div key={index}>
                    <h2>{group.title}</h2>
                    <ul>
                      {group.links.map((link) => (
                        <li key={link.href}>
                          <a href={link.href}>{link.label}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
            )
            : null}
          {legal || meta
            ? (
              <div className="discern-site-footer__base">
                <span>{legal}</span>
                <span>{meta}</span>
              </div>
            )
            : null}
        </div>
      </footer>
    );
  });
