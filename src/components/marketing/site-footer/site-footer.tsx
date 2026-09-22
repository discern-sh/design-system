import { forwardRef } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { useInitialFragmentTarget } from "../../use-initial-fragment-target.ts";
import type { MarketingFrame } from "../frame.ts";

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
  readonly brandTypeface?: "inherit" | "ui" | "display" | "mono";
  readonly brandMarkTreatment?: "plain" | "tile";
  readonly brandMarkShape?: "natural" | "square";
  readonly description?: ReactNode;
  readonly groups?: readonly SiteFooterGroup[];
  readonly legal?: ReactNode;
  readonly meta?: ReactNode;
  /** Lay content out at the editorial page measure or the wider campaign frame. */
  readonly frame?: MarketingFrame;
  /**
   * Navigation groups set side by side: beside the brand while that many fit,
   * otherwise beneath it at full width, and fewer only when even that is too
   * narrow for each group's minimum.
   */
  readonly columns?: number;
}

/** Responsive page colophon with product context, grouped navigation, legal copy, and a compact metadata rail. */
export const SiteFooter: DiscernComponent<HTMLElement, SiteFooterProps> =
  forwardRef<HTMLElement, SiteFooterProps>(function SiteFooter(
    {
      brand,
      brandMark,
      brandTypeface = "display",
      brandMarkTreatment = "tile",
      brandMarkShape,
      description,
      groups = [],
      legal,
      meta,
      frame = "standard",
      columns,
      className,
      style,
      ...props
    },
    ref,
  ) {
    useInitialFragmentTarget();
    if (
      columns !== undefined && (!Number.isSafeInteger(columns) || columns < 1)
    ) {
      throw new RangeError(
        `Site footer columns must be a positive integer; received ${columns}`,
      );
    }
    const resolvedMarkShape = brandMarkShape ??
      (brandMarkTreatment === "tile" ? "square" : "natural");
    return (
      <footer
        ref={ref}
        className={classNames(
          "discern-site-footer",
          frame === "wide" && "discern-site-footer--frame-wide",
          columns !== undefined && "discern-site-footer--columns",
          className,
        )}
        style={columns === undefined ? style : {
          "--discern-site-footer-columns": columns,
          ...style,
        } as CSSProperties}
        {...props}
      >
        <div className="discern-site-footer__inner">
          <div className="discern-site-footer__brand-column">
            <a
              className={classNames(
                "discern-site-footer__brand",
                "discern-site-footer__brand--" + brandTypeface,
              )}
              href="/"
            >
              {brandMark
                ? (
                  <span
                    className={classNames(
                      "discern-site-footer__mark",
                      "discern-site-footer__mark--" + brandMarkTreatment,
                      "discern-site-footer__mark--" + resolvedMarkShape,
                    )}
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
