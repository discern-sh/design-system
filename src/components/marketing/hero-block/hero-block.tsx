import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import type { HeroBlockLayout, HeroBlockSurface } from "./hero-block.types.ts";

export type { HeroBlockLayout, HeroBlockSurface } from "./hero-block.types.ts";

/** Props for the {@linkcode HeroBlock} component. */
export interface HeroBlockProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly eyebrow?: ReactNode;
  readonly title: ReactNode;
  readonly headingLevel?: 1 | 2;
  readonly description?: ReactNode;
  readonly actions?: ReactNode;
  readonly meta?: ReactNode;
  readonly visual?: ReactNode;
  /** Decorative artwork rendered behind the complete foreground composition. */
  readonly ground?: ReactNode;
  readonly layout?: HeroBlockLayout;
  readonly surface?: HeroBlockSurface;
}

/** High-impact opening section with split and centered compositions, flexible actions, proof, and visual slots. */
export const HeroBlock: DiscernComponent<HTMLElement, HeroBlockProps> =
  forwardRef<HTMLElement, HeroBlockProps>(function HeroBlock(
    {
      eyebrow,
      title,
      headingLevel = 1,
      description,
      actions,
      meta,
      visual,
      ground,
      layout = "split",
      surface = "canvas",
      className,
      ...props
    },
    ref,
  ) {
    const Heading = headingLevel === 1 ? "h1" : "h2";
    return (
      <section
        ref={ref}
        className={classNames(
          "discern-hero-block",
          `discern-hero-block--${layout}`,
          `discern-hero-block--${surface}`,
          !visual && "discern-hero-block--without-visual",
          className,
        )}
        {...props}
      >
        {ground
          ? (
            <div className="discern-hero-block__ground" aria-hidden="true">
              {ground}
            </div>
          )
          : null}
        <div className="discern-hero-block__inner">
          <div className="discern-hero-block__content">
            {eyebrow
              ? <div className="discern-hero-block__eyebrow">{eyebrow}</div>
              : null}
            <Heading className="discern-hero-block__title">{title}</Heading>
            {description
              ? (
                <div className="discern-hero-block__description">
                  {description}
                </div>
              )
              : null}
            {actions
              ? <div className="discern-hero-block__actions">{actions}</div>
              : null}
            {meta
              ? <div className="discern-hero-block__meta">{meta}</div>
              : null}
          </div>
          {visual
            ? <div className="discern-hero-block__visual">{visual}</div>
            : null}
        </div>
      </section>
    );
  });
