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
  /** Text alignment for the eyebrow and quotation. */
  readonly align?: "start" | "end";
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
      align = "start",
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
        className={classNames(
          "discern-voice-break",
          `discern-voice-break--${align}`,
          className,
        )}
        {...props}
      >
        <figure className="discern-voice-break__figure">
          <div className="discern-voice-break__statement">
            {eyebrow
              ? <div className="discern-voice-break__eyebrow">{eyebrow}</div>
              : null}
            <blockquote className="discern-voice-break__quote">
              {quote}
            </blockquote>
          </div>
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
