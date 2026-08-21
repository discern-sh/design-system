import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { MarketingSection } from "../marketing-section/marketing-section.tsx";
import type { MarketingSectionSurface } from "../marketing-section/marketing-section.tsx";

/** Props for the {@linkcode VoiceBreak} component. */
export interface VoiceBreakProps extends HTMLAttributes<HTMLElement> {
  readonly eyebrow?: ReactNode;
  readonly quote: ReactNode;
  readonly attribution: ReactNode;
  readonly context?: ReactNode;
  /** Optional decorative portrait or identifying mark. */
  readonly portrait?: ReactNode;
  readonly surface?: MarketingSectionSurface;
}

/** Low-burden change of voice that lets one concise quotation interrupt a demanding page. */
export const VoiceBreak: DiscernComponent<HTMLElement, VoiceBreakProps> =
  forwardRef<HTMLElement, VoiceBreakProps>(function VoiceBreak(
    {
      eyebrow,
      quote,
      attribution,
      context,
      portrait,
      surface = "canvas",
      className,
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
        className={classNames("discern-voice-break", className)}
        {...props}
      >
        {eyebrow
          ? <div className="discern-voice-break__eyebrow">{eyebrow}</div>
          : null}
        <figure className="discern-voice-break__figure">
          <blockquote className="discern-voice-break__quote">
            {quote}
          </blockquote>
          <figcaption className="discern-voice-break__attribution">
            {portrait
              ? (
                <span
                  className="discern-voice-break__portrait"
                  aria-hidden="true"
                >
                  {portrait}
                </span>
              )
              : null}
            <span>
              <strong>{attribution}</strong>
              {context ? <span>{context}</span> : null}
            </span>
          </figcaption>
        </figure>
      </MarketingSection>
    );
  });
