import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { useInitialFragmentTarget } from "../../use-initial-fragment-target.ts";

/** One nav item entry rendered by the Site header component. */
export interface SiteHeaderNavItem {
  readonly label: ReactNode;
  readonly href: string;
}

/** Props for the {@linkcode SiteHeader} component. */
export interface SiteHeaderProps extends HTMLAttributes<HTMLElement> {
  readonly brand: ReactNode;
  readonly brandMark?: ReactNode;
  readonly brandTypeface?: "inherit" | "ui" | "display" | "mono";
  readonly brandMarkTreatment?: "plain" | "tile";
  readonly brandMarkShape?: "natural" | "square";
  readonly homeHref?: string;
  readonly navItems?: readonly SiteHeaderNavItem[];
  readonly navLabel?: string;
  readonly actions?: ReactNode;
  readonly notice?: ReactNode;
  readonly sticky?: boolean;
}

/** Responsive landing-page masthead with optional notice, navigation, actions, and sticky positioning. */
export const SiteHeader: DiscernComponent<HTMLElement, SiteHeaderProps> =
  forwardRef<HTMLElement, SiteHeaderProps>(function SiteHeader(
    {
      brand,
      brandMark,
      brandTypeface = "display",
      brandMarkTreatment = "tile",
      brandMarkShape,
      homeHref = "/",
      navItems = [],
      navLabel = "Primary",
      actions,
      notice,
      sticky = false,
      className,
      ...props
    },
    ref,
  ) {
    useInitialFragmentTarget();
    const resolvedMarkShape = brandMarkShape ??
      (brandMarkTreatment === "tile" ? "square" : "natural");
    return (
      <header
        ref={ref}
        className={classNames(
          "discern-site-header",
          sticky && "discern-site-header--sticky",
          Boolean(notice) && "discern-site-header--with-notice",
          className,
        )}
        {...props}
      >
        {notice
          ? <div className="discern-site-header__notice">{notice}</div>
          : null}
        <div className="discern-site-header__inner">
          <a
            className={classNames(
              "discern-site-header__brand",
              "discern-site-header__brand--" + brandTypeface,
            )}
            href={homeHref}
          >
            {brandMark
              ? (
                <span
                  className={classNames(
                    "discern-site-header__mark",
                    "discern-site-header__mark--" + brandMarkTreatment,
                    "discern-site-header__mark--" + resolvedMarkShape,
                  )}
                  aria-hidden="true"
                >
                  {brandMark}
                </span>
              )
              : null}
            <span>{brand}</span>
          </a>
          {navItems.length
            ? (
              <nav className="discern-site-header__nav" aria-label={navLabel}>
                {navItems.map((item) => (
                  <a href={item.href} key={item.href}>{item.label}</a>
                ))}
              </nav>
            )
            : null}
          {actions
            ? <div className="discern-site-header__actions">{actions}</div>
            : null}
        </div>
      </header>
    );
  });
