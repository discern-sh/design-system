import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { MarketingIntro } from "../marketing-intro/marketing-intro.tsx";
import { MarketingSection } from "../marketing-section/marketing-section.tsx";
import type { MarketingSectionSurface } from "../marketing-section/marketing-section.tsx";

/** Props for the {@linkcode NarrativeChapter} component. */
export interface NarrativeChapterProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly eyebrow?: ReactNode;
  readonly title: ReactNode;
  readonly headingLevel?: 2 | 3;
  readonly lead?: ReactNode;
  /** Optional supporting context separated from the primary reading flow. */
  readonly aside?: ReactNode;
  /** Accessible name for the supplementary aside landmark. */
  readonly asideLabel?: string;
  readonly surface?: MarketingSectionSurface;
  readonly children: ReactNode;
}

/** Calm two-part reading section for explaining a substantial idea without adding visual burden. */
export const NarrativeChapter: DiscernComponent<
  HTMLElement,
  NarrativeChapterProps
> = forwardRef<HTMLElement, NarrativeChapterProps>(function NarrativeChapter(
  {
    eyebrow,
    title,
    headingLevel = 2,
    lead,
    aside,
    asideLabel = "Related information",
    surface = "canvas",
    className,
    children,
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
      className={classNames("discern-narrative-chapter", className)}
      {...props}
    >
      <div className="discern-narrative-chapter__layout">
        <MarketingIntro
          className="discern-narrative-chapter__intro"
          eyebrow={eyebrow}
          title={title}
          headingLevel={headingLevel}
          description={lead}
        />
        <div className="discern-narrative-chapter__reading">
          <div className="discern-narrative-chapter__body">{children}</div>
          {aside
            ? (
              <aside
                aria-label={asideLabel}
                className="discern-narrative-chapter__aside"
              >
                {aside}
              </aside>
            )
            : null}
        </div>
      </div>
    </MarketingSection>
  );
});
