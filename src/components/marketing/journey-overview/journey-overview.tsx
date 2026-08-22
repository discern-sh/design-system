import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { MarketingIntro } from "../marketing-intro/marketing-intro.tsx";
import { MarketingSection } from "../marketing-section/marketing-section.tsx";
import type { MarketingSectionSurface } from "../marketing-section/marketing-section.tsx";

/** One plain-language moment in a {@linkcode JourneyOverview}. */
export interface JourneyOverviewStep {
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly outcome?: ReactNode;
}

/** Props for the {@linkcode JourneyOverview} component. */
export interface JourneyOverviewProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly eyebrow?: ReactNode;
  readonly title: ReactNode;
  readonly headingLevel?: 2 | 3;
  readonly description?: ReactNode;
  readonly steps: readonly JourneyOverviewStep[];
  readonly surface?: MarketingSectionSurface;
}

/** Spacious ordered overview that compresses a journey into a few plain-language moments. */
export const JourneyOverview: DiscernComponent<
  HTMLElement,
  JourneyOverviewProps
> = forwardRef<HTMLElement, JourneyOverviewProps>(function JourneyOverview(
  {
    eyebrow,
    title,
    headingLevel = 2,
    description,
    steps,
    surface = "surface",
    className,
    ...props
  },
  ref,
) {
  return (
    <MarketingSection
      ref={ref}
      surface={surface}
      spacing="spacious"
      frame="wide"
      className={classNames("discern-journey-overview", className)}
      {...props}
    >
      <MarketingIntro
        className="discern-journey-overview__intro"
        eyebrow={eyebrow}
        title={title}
        headingLevel={headingLevel}
        description={description}
      />
      <ol className="discern-journey-overview__steps">
        {steps.map((step, index) => (
          <li className="discern-journey-overview__step" key={index}>
            <h3 className="discern-journey-overview__title">{step.title}</h3>
            {step.description
              ? (
                <div className="discern-journey-overview__description">
                  {step.description}
                </div>
              )
              : null}
            {step.outcome
              ? (
                <div className="discern-journey-overview__outcome">
                  {step.outcome}
                </div>
              )
              : null}
          </li>
        ))}
      </ol>
    </MarketingSection>
  );
});
