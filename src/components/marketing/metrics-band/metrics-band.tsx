import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

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
  readonly tone?: "surface" | "accent" | "contrast";
}

/** Compact evidence strip for a handful of high-signal outcomes, with surface, accent, and contrast treatments. */
export const MetricsBand: DiscernComponent<HTMLElement, MetricsBandProps> =
  forwardRef<HTMLElement, MetricsBandProps>(function MetricsBand(
    { eyebrow, title, items, tone = "surface", className, ...props },
    ref,
  ) {
    return (
      <section
        ref={ref}
        className={classNames(
          "discern-metrics-band",
          `discern-metrics-band--${tone}`,
          className,
        )}
        {...props}
      >
        <div className="discern-metrics-band__inner">
          {eyebrow || title
            ? (
              <header className="discern-metrics-band__header">
                {eyebrow
                  ? (
                    <div className="discern-metrics-band__eyebrow">
                      {eyebrow}
                    </div>
                  )
                  : null}
                {title ? <h2>{title}</h2> : null}
              </header>
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
      </section>
    );
  });
