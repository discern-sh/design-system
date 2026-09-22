import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import type { CtaBandAlign, CtaBandTone } from "./cta-band.types.ts";
import type { MarketingFrame } from "../frame.ts";

export type { CtaBandAlign, CtaBandTone } from "./cta-band.types.ts";

/** Props for the {@linkcode CtaBand} component. */
export interface CtaBandProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly eyebrow?: ReactNode;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly actions?: ReactNode;
  readonly note?: ReactNode;
  readonly visual?: ReactNode;
  readonly tone?: CtaBandTone;
  readonly align?: CtaBandAlign;
  /** Lay content out at the editorial page measure or the wider campaign frame. */
  readonly frame?: MarketingFrame;
}

/** High-emphasis closing invitation with centered or split layouts, three surface treatments, and a visual slot. */
export const CtaBand: DiscernComponent<HTMLElement, CtaBandProps> = forwardRef<
  HTMLElement,
  CtaBandProps
>(function CtaBand(
  {
    eyebrow,
    title,
    description,
    actions,
    note,
    visual,
    tone = "accent",
    align = "center",
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
        "discern-cta-band",
        frame === "wide" && "discern-cta-band--frame-wide",
        `discern-cta-band--${tone}`,
        `discern-cta-band--${align}`,
        Boolean(visual) && "discern-cta-band--with-visual",
        className,
      )}
      {...props}
    >
      <div className="discern-cta-band__inner">
        <div className="discern-cta-band__content">
          {eyebrow
            ? <div className="discern-cta-band__eyebrow">{eyebrow}</div>
            : null}
          <h2>{title}</h2>
          {description
            ? (
              <div className="discern-cta-band__description">
                {description}
              </div>
            )
            : null}
          {actions
            ? <div className="discern-cta-band__actions">{actions}</div>
            : null}
          {note ? <div className="discern-cta-band__note">{note}</div> : null}
        </div>
        {visual
          ? <div className="discern-cta-band__visual">{visual}</div>
          : null}
      </div>
    </section>
  );
});
