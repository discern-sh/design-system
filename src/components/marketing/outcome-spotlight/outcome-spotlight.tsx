import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { MarketingIntro } from "../marketing-intro/marketing-intro.tsx";
import { MarketingSection } from "../marketing-section/marketing-section.tsx";
import type { MarketingSectionSurface } from "../marketing-section/marketing-section.tsx";

/** One secondary fact supporting an {@linkcode OutcomeSpotlight}. */
export interface OutcomeSpotlightFact {
  readonly value: ReactNode;
  readonly label: ReactNode;
}

/** Props for the {@linkcode OutcomeSpotlight} component. */
export interface OutcomeSpotlightProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly eyebrow?: ReactNode;
  readonly title: ReactNode;
  readonly headingLevel?: 2 | 3;
  readonly description?: ReactNode;
  readonly value: ReactNode;
  readonly valueLabel: ReactNode;
  /** Display scale for numerical outcomes or longer qualitative phrases. */
  readonly valueScale?: "standard" | "compact";
  readonly supporting?: readonly OutcomeSpotlightFact[];
  readonly surface?: MarketingSectionSurface;
}

/** Evidence chapter that asks the reader to remember one outcome and only a few supporting facts. */
export const OutcomeSpotlight: DiscernComponent<
  HTMLElement,
  OutcomeSpotlightProps
> = forwardRef<HTMLElement, OutcomeSpotlightProps>(function OutcomeSpotlight(
  {
    eyebrow,
    title,
    headingLevel = 2,
    description,
    value,
    valueLabel,
    valueScale = "standard",
    supporting = [],
    surface = "contrast",
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
      className={classNames(
        "discern-outcome-spotlight",
        `discern-outcome-spotlight--${valueScale}`,
        className,
      )}
      {...props}
    >
      <div className="discern-outcome-spotlight__lead">
        <MarketingIntro
          className="discern-outcome-spotlight__intro"
          eyebrow={eyebrow}
          title={title}
          headingLevel={headingLevel}
          description={description}
          tone={surface === "contrast" ? "contrast" : "default"}
        />
        <dl className="discern-outcome-spotlight__primary">
          <div>
            <dt className="discern-outcome-spotlight__label">
              {valueLabel}
            </dt>
            <dd className="discern-outcome-spotlight__value">{value}</dd>
          </div>
        </dl>
      </div>
      {supporting.length > 0
        ? (
          <dl className="discern-outcome-spotlight__supporting">
            {supporting.map((fact, index) => (
              <div className="discern-outcome-spotlight__fact" key={index}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        )
        : null}
    </MarketingSection>
  );
});
