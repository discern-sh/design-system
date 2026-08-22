import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Surface treatments available to a {@linkcode MarketingStage}. */
export type MarketingStageTreatment = "plain" | "framed" | "inset";

/** Stable media proportions available to a {@linkcode MarketingStage}. */
export type MarketingStageAspect = "auto" | "landscape" | "square";

/** Props for the {@linkcode MarketingStage} component. */
export interface MarketingStageProps extends HTMLAttributes<HTMLElement> {
  /** Optional short context above the visual. */
  readonly label?: ReactNode;
  /** Optional explanation below the visual. */
  readonly caption?: ReactNode;
  /** Material treatment around the supplied visual. */
  readonly treatment?: MarketingStageTreatment;
  /** Optional stable proportion for artwork that can fill a bounded stage. */
  readonly aspect?: MarketingStageAspect;
  readonly children: ReactNode;
}

/** Quiet, consistent framing for conceptual, atmospheric, or evidential marketing visuals. */
export const MarketingStage: DiscernComponent<
  HTMLElement,
  MarketingStageProps
> = forwardRef<HTMLElement, MarketingStageProps>(function MarketingStage(
  {
    label,
    caption,
    treatment = "framed",
    aspect = "auto",
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <figure
      ref={ref}
      className={classNames(
        "discern-marketing-stage",
        `discern-marketing-stage--${treatment}`,
        `discern-marketing-stage--${aspect}`,
        className,
      )}
      {...props}
    >
      {label
        ? <div className="discern-marketing-stage__label">{label}</div>
        : null}
      <div className="discern-marketing-stage__body">{children}</div>
      {caption
        ? (
          <figcaption className="discern-marketing-stage__caption">
            {caption}
          </figcaption>
        )
        : null}
    </figure>
  );
});
