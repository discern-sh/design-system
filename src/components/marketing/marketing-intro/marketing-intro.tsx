import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { Kicker } from "../../display/kicker/kicker.tsx";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import type {
  MarketingIntroAlign,
  MarketingIntroScale,
  MarketingIntroTone,
} from "./marketing-intro.types.ts";

export type {
  MarketingIntroAlign,
  MarketingIntroScale,
  MarketingIntroTone,
} from "./marketing-intro.types.ts";

/** Props for the {@linkcode MarketingIntro} component. */
export interface MarketingIntroProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** Optional Kicker copy above the title. */
  readonly eyebrow?: ReactNode;
  /** Section title. */
  readonly title: ReactNode;
  /** Native heading rank for the title. */
  readonly headingLevel?: 2 | 3;
  /** Optional standfirst or supporting copy below the title. */
  readonly description?: ReactNode;
  /** Start-aligned narrative or centred campaign composition. */
  readonly align?: MarketingIntroAlign;
  /** Ordinary system heading or the larger editorial marketing scale. */
  readonly scale?: MarketingIntroScale;
  /** Ordinary semantic ink or stable light ink for a custom dark surface. */
  readonly tone?: MarketingIntroTone;
}

/** Eyebrow, headline, and standfirst composition for marketing-page sections. */
export const MarketingIntro: DiscernComponent<
  HTMLElement,
  MarketingIntroProps
> = forwardRef<HTMLElement, MarketingIntroProps>(function MarketingIntro(
  {
    eyebrow,
    title,
    headingLevel = 2,
    description,
    align = "start",
    scale = "standard",
    tone = "default",
    className,
    ...props
  },
  ref,
) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <header
      ref={ref}
      className={classNames(
        "discern-marketing-intro",
        `discern-marketing-intro--${align}`,
        `discern-marketing-intro--${scale}`,
        `discern-marketing-intro--${tone}`,
        className,
      )}
      {...props}
    >
      {eyebrow
        ? (
          <Kicker className="discern-marketing-intro__eyebrow">
            {eyebrow}
          </Kicker>
        )
        : null}
      <Heading className="discern-marketing-intro__title">{title}</Heading>
      {description
        ? (
          <div className="discern-marketing-intro__description">
            {description}
          </div>
        )
        : null}
    </header>
  );
});
