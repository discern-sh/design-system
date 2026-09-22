import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import type { MarketingFrame } from "../frame.ts";

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
      <section
        ref={ref}
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
            {eyebrow
              ? <div className="discern-split-feature__eyebrow">{eyebrow}</div>
              : null}
            <h2>{title}</h2>
            {description
              ? (
                <div className="discern-split-feature__description">
                  {description}
                </div>
              )
              : null}
            {points.length
              ? (
                <ul className="discern-split-feature__points">
                  {points.map((point, index) => (
                    <li key={index}>
                      <span
                        className="discern-split-feature__check"
                        aria-hidden="true"
                      >
                        ✓
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
              ? <div className="discern-split-feature__actions">{actions}</div>
              : null}
          </div>
          <div className="discern-split-feature__media">{media}</div>
        </div>
      </section>
    );
  });
