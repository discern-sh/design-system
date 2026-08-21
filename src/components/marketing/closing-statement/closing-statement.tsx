import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { MarketingIntro } from "../marketing-intro/marketing-intro.tsx";
import { MarketingSection } from "../marketing-section/marketing-section.tsx";
import type { MarketingSectionSurface } from "../marketing-section/marketing-section.tsx";

/** Props for the {@linkcode ClosingStatement} component. */
export interface ClosingStatementProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly eyebrow?: ReactNode;
  readonly title: ReactNode;
  readonly headingLevel?: 2 | 3;
  readonly description?: ReactNode;
  readonly actions: ReactNode;
  readonly reassurance?: ReactNode;
  /** Decorative artwork rendered behind the complete composition. */
  readonly ground?: ReactNode;
  readonly surface?: MarketingSectionSurface;
}

/** Calm final chapter with one proposition, a focused action area, and optional reassurance. */
export const ClosingStatement: DiscernComponent<
  HTMLElement,
  ClosingStatementProps
> = forwardRef<HTMLElement, ClosingStatementProps>(function ClosingStatement(
  {
    eyebrow,
    title,
    headingLevel = 2,
    description,
    actions,
    reassurance,
    ground,
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
      className={classNames("discern-closing-statement", className)}
      {...props}
    >
      {ground
        ? (
          <div className="discern-closing-statement__ground" aria-hidden="true">
            {ground}
          </div>
        )
        : null}
      <div className="discern-closing-statement__content">
        <MarketingIntro
          className="discern-closing-statement__intro"
          eyebrow={eyebrow}
          title={title}
          headingLevel={headingLevel}
          description={description}
          align="center"
          scale="editorial"
          tone={surface === "contrast" ? "contrast" : "default"}
        />
        <div className="discern-closing-statement__actions">{actions}</div>
        {reassurance
          ? (
            <div className="discern-closing-statement__reassurance">
              {reassurance}
            </div>
          )
          : null}
      </div>
    </MarketingSection>
  );
});
