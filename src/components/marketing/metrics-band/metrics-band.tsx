import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import type { MetricsBandTone } from "./metrics-band.types.ts";
import type { MarketingFrame } from "../frame.ts";
import { MarketingIntro } from "../marketing-intro/marketing-intro.tsx";
import { MarketingSection } from "../marketing-section/marketing-section.tsx";

export type { MetricsBandTone } from "./metrics-band.types.ts";

/** One metric item entry rendered by the Metrics band component. */
export interface MetricItem {
  readonly value: ReactNode;
  readonly label: ReactNode;
  readonly detail?: ReactNode;
}

/** Props for the {@linkcode MetricsBand} component. */
export interface MetricsBandProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly eyebrow?: ReactNode;
  readonly title?: ReactNode;
  readonly items: readonly MetricItem[];
  readonly tone?: MetricsBandTone;
  /** Lay content out at the editorial page measure or the wider campaign frame. */
  readonly frame?: MarketingFrame;
}

/** Compact evidence strip for a handful of high-signal outcomes, with surface, accent, and contrast treatments. */
export const MetricsBand: DiscernComponent<HTMLElement, MetricsBandProps> =
  forwardRef<HTMLElement, MetricsBandProps>(function MetricsBand(
    {
      eyebrow,
      title,
      items,
      tone = "surface",
      frame = "standard",
      className,
      ...props
    },
    ref,
  ) {
    return (
      <MarketingSection
        ref={ref}
        surface={tone === "accent" ? "canvas" : tone}
        spacing="compact"
        frame={frame}
        className={classNames(
          "discern-metrics-band",
          frame === "wide" && "discern-metrics-band--frame-wide",
          `discern-metrics-band--${tone}`,
          className,
        )}
        {...props}
      >
        <div className="discern-metrics-band__inner">
          {eyebrow || title
            ? (
              <MarketingIntro
                className="discern-metrics-band__header"
                eyebrow={eyebrow}
                title={title}
              />
            )
            : null}
          <dl className="discern-metrics-band__list">
            {items.map((item, index) => (
              <div key={index}>
                <dt>{item.label}</dt>
                <dd className="discern-metrics-band__value">
                  {item.value}
                </dd>
                {item.detail
                  ? (
                    <dd className="discern-metrics-band__detail">
                      {item.detail}
                    </dd>
                  )
                  : null}
              </div>
            ))}
          </dl>
        </div>
      </MarketingSection>
    );
  });
