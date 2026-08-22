import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { MarketingSection } from "../marketing-section/marketing-section.tsx";
import type { MarketingSectionSurface } from "../marketing-section/marketing-section.tsx";
import { MarketingStage } from "../marketing-stage/marketing-stage.tsx";
import type { MarketingStageTreatment } from "../marketing-stage/marketing-stage.tsx";

/** Props for the {@linkcode EditorialHero} component. */
export interface EditorialHeroProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly eyebrow?: ReactNode;
  readonly title: ReactNode;
  readonly headingLevel?: 1 | 2;
  readonly description?: ReactNode;
  readonly actions?: ReactNode;
  readonly meta?: ReactNode;
  readonly visual?: ReactNode;
  readonly visualLabel?: ReactNode;
  readonly visualCaption?: ReactNode;
  readonly visualTreatment?: MarketingStageTreatment;
  /** Decorative artwork rendered behind the complete composition. */
  readonly backdrop?: ReactNode;
  readonly surface?: MarketingSectionSurface;
}

/** Selectively dramatic page opening with a broad editorial title and an optional quiet visual stage. */
export const EditorialHero: DiscernComponent<HTMLElement, EditorialHeroProps> =
  forwardRef<HTMLElement, EditorialHeroProps>(function EditorialHero(
    {
      eyebrow,
      title,
      headingLevel = 1,
      description,
      actions,
      meta,
      visual,
      visualLabel,
      visualCaption,
      visualTreatment = "inset",
      backdrop,
      surface = "canvas",
      className,
      ...props
    },
    ref,
  ) {
    const Heading = headingLevel === 1 ? "h1" : "h2";
    return (
      <MarketingSection
        ref={ref}
        surface={surface}
        spacing="spacious"
        frame="wide"
        className={classNames(
          "discern-editorial-hero",
          !visual && "discern-editorial-hero--without-visual",
          className,
        )}
        {...props}
      >
        {backdrop
          ? (
            <div
              className="discern-editorial-hero__backdrop"
              aria-hidden="true"
            >
              {backdrop}
            </div>
          )
          : null}
        <div className="discern-editorial-hero__content">
          <header className="discern-editorial-hero__header">
            {eyebrow
              ? (
                <div className="discern-editorial-hero__eyebrow">
                  {eyebrow}
                </div>
              )
              : null}
            <Heading className="discern-editorial-hero__title">
              {title}
            </Heading>
          </header>
          <div className="discern-editorial-hero__lower">
            <div className="discern-editorial-hero__copy">
              {description
                ? (
                  <div className="discern-editorial-hero__description">
                    {description}
                  </div>
                )
                : null}
              {actions
                ? (
                  <div className="discern-editorial-hero__actions">
                    {actions}
                  </div>
                )
                : null}
              {meta
                ? <div className="discern-editorial-hero__meta">{meta}</div>
                : null}
            </div>
            {visual
              ? (
                <MarketingStage
                  className="discern-editorial-hero__visual"
                  label={visualLabel}
                  caption={visualCaption}
                  treatment={visualTreatment}
                  aspect="landscape"
                >
                  {visual}
                </MarketingStage>
              )
              : null}
          </div>
        </div>
      </MarketingSection>
    );
  });
