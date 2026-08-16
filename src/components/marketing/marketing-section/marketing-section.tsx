import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import type {
  MarketingSectionFrame,
  MarketingSectionSpacing,
  MarketingSectionSurface,
} from "./marketing-section.types.ts";

export type {
  MarketingSectionFrame,
  MarketingSectionSpacing,
  MarketingSectionSurface,
} from "./marketing-section.types.ts";

/** Props for the {@linkcode MarketingSection} component. */
export interface MarketingSectionProps extends HTMLAttributes<HTMLElement> {
  /** Semantic surface or an explicit request to inherit the surrounding one. */
  readonly surface?: MarketingSectionSurface;
  /** Ordinary design-system rhythm or the larger campaign-page rhythm. */
  readonly spacing?: MarketingSectionSpacing;
  /** Ordinary editorial measure or the wider campaign-page frame. */
  readonly frame?: MarketingSectionFrame;
  readonly children: ReactNode;
}

/** Opt-in campaign-page section with durable frame, rhythm, and contrast scopes. */
export const MarketingSection: DiscernComponent<
  HTMLElement,
  MarketingSectionProps
> = forwardRef<HTMLElement, MarketingSectionProps>(function MarketingSection(
  {
    surface = "canvas",
    spacing = "standard",
    frame = "standard",
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <section
      ref={ref}
      className={classNames(
        "discern-marketing-section",
        `discern-marketing-section--${surface}`,
        `discern-marketing-section--space-${spacing}`,
        `discern-marketing-section--frame-${frame}`,
        className,
      )}
      {...props}
    >
      <div className="discern-marketing-section__inner">{children}</div>
    </section>
  );
});
