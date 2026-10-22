import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import type { MarketingFrame } from "../frame.ts";
import { MarketingIntro } from "../marketing-intro/marketing-intro.tsx";
import { getGlyph } from "../../../glyphs/mod.ts";
import { Icon } from "../../core/icon/icon.tsx";
import {
  marketingActionsClassName,
  MarketingSection,
} from "../marketing-section/marketing-section.tsx";

/** One point entry rendered by the Split feature component. */
export interface SplitFeaturePoint {
  readonly title: ReactNode;
  readonly description?: ReactNode;
}

/** Props for the {@linkcode SplitFeature} component. */
export interface SplitFeatureProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly eyebrow?: ReactNode;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly points?: readonly SplitFeaturePoint[];
  readonly actions?: ReactNode;
  readonly media: ReactNode;
  readonly reverse?: boolean;
  readonly surface?: "canvas" | "surface" | "sunken";
  /** Lay content out at the editorial page measure or the wider campaign frame. */
  readonly frame?: MarketingFrame;
}

/** Alternating editorial feature section with narrative copy, proof points, actions, and an unconstrained media slot. */
export const SplitFeature: DiscernComponent<HTMLElement, SplitFeatureProps> =
  forwardRef<HTMLElement, SplitFeatureProps>(function SplitFeature(
    {
      eyebrow,
      title,
      description,
      points = [],
      actions,
      media,
      reverse = false,
      surface = "canvas",
      frame = "standard",
      className,
      ...props
    },
    ref,
  ) {
    return (
      <MarketingSection
        ref={ref}
        surface={surface}
        frame={frame}
        className={classNames(
          "discern-split-feature",
          frame === "wide" && "discern-split-feature--frame-wide",
          reverse && "discern-split-feature--reverse",
          `discern-split-feature--${surface}`,
          className,
        )}
        {...props}
      >
        <div className="discern-split-feature__inner">
          <div className="discern-split-feature__content">
            <MarketingIntro
              className="discern-split-feature__intro"
              eyebrow={eyebrow}
              title={title}
              description={description}
            />
            {points.length
              ? (
                <ul className="discern-split-feature__points">
                  {points.map((point, index) => (
                    <li key={index}>
                      <span className="discern-split-feature__check">
                        <Icon>{getGlyph("status-complete").unicode}</Icon>
                      </span>
                      <span>
                        <strong>{point.title}</strong>
                        {point.description
                          ? <span>{point.description}</span>
                          : null}
                      </span>
                    </li>
                  ))}
                </ul>
              )
              : null}
            {actions
              ? (
                <div
                  className={marketingActionsClassName(
                    "discern-split-feature__actions",
                  )}
                >
                  {actions}
                </div>
              )
              : null}
          </div>
          <div className="discern-split-feature__media">{media}</div>
        </div>
      </MarketingSection>
    );
  });
