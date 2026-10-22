import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import type { MarketingFrame } from "../frame.ts";
import { Kicker } from "../../display/kicker/kicker.tsx";
import { MarketingIntro } from "../marketing-intro/marketing-intro.tsx";
import { MarketingSection } from "../marketing-section/marketing-section.tsx";

/** One item entry rendered by the Audience grid component. */
export interface AudienceGridItem {
  readonly eyebrow?: ReactNode;
  readonly title: ReactNode;
  readonly description: ReactNode;
  readonly icon?: ReactNode;
  readonly meta?: ReactNode;
  readonly href?: string;
  readonly linkLabel?: ReactNode;
  readonly featured?: boolean;
}

/** Props for the {@linkcode AudienceGrid} component. */
export interface AudienceGridProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly eyebrow?: ReactNode;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly items: readonly AudienceGridItem[];
  /** Lay content out at the editorial page measure or the wider campaign frame. */
  readonly frame?: MarketingFrame;
}

/** Persona-led card grid for explaining one product through the outcomes different audiences care about. */
export const AudienceGrid: DiscernComponent<HTMLElement, AudienceGridProps> =
  forwardRef<HTMLElement, AudienceGridProps>(function AudienceGrid(
    {
      eyebrow,
      title,
      description,
      items,
      frame = "standard",
      className,
      ...props
    },
    ref,
  ) {
    return (
      <MarketingSection
        ref={ref}
        frame={frame}
        className={classNames(
          "discern-audience-grid",
          frame === "wide" && "discern-audience-grid--frame-wide",
          className,
        )}
        {...props}
      >
        <div className="discern-audience-grid__inner">
          <header className="discern-audience-grid__header">
            <MarketingIntro
              className="discern-audience-grid__intro"
              eyebrow={eyebrow}
              title={title}
            />
            {description
              ? (
                <div className="discern-audience-grid__description">
                  {description}
                </div>
              )
              : null}
          </header>
          <div className="discern-audience-grid__items">
            {items.map((item, index) => (
              <article
                className={classNames(
                  "discern-audience-grid__item",
                  item.featured && "discern-audience-grid__item--featured",
                )}
                key={index}
              >
                <div className="discern-audience-grid__topline">
                  {item.icon
                    ? (
                      <span
                        className="discern-audience-grid__icon"
                        aria-hidden="true"
                      >
                        {item.icon}
                      </span>
                    )
                    : null}
                  <span
                    className="discern-audience-grid__index"
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                {item.eyebrow
                  ? (
                    <Kicker className="discern-audience-grid__item-eyebrow">
                      {item.eyebrow}
                    </Kicker>
                  )
                  : null}
                <h3>{item.title}</h3>
                <div className="discern-audience-grid__copy">
                  {item.description}
                </div>
                {item.meta
                  ? (
                    <div className="discern-audience-grid__meta">
                      {item.meta}
                    </div>
                  )
                  : null}
                {item.href && item.linkLabel
                  ? (
                    <a className="discern-audience-grid__link" href={item.href}>
                      {item.linkLabel}
                      <span
                        className="discern-audience-grid__arrow"
                        aria-hidden="true"
                      >
                        →
                      </span>
                    </a>
                  )
                  : null}
              </article>
            ))}
          </div>
        </div>
      </MarketingSection>
    );
  });
