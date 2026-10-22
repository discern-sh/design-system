import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import type { MarketingFrame } from "../frame.ts";
import { getGlyph } from "../../../glyphs/mod.ts";
import { Kicker } from "../../display/kicker/kicker.tsx";
import { FeedbackMark } from "../../feedback/feedback-marks.tsx";
import { MarketingIntro } from "../marketing-intro/marketing-intro.tsx";
import { MarketingSection } from "../marketing-section/marketing-section.tsx";
import type { ProcessStepStatus } from "./process-steps.types.ts";

export type { ProcessStepStatus } from "./process-steps.types.ts";

/** One process step entry rendered by the Process steps component. */
export interface ProcessStep {
  readonly title: ReactNode;
  readonly description: ReactNode;
  readonly eyebrow?: ReactNode;
  readonly detail?: ReactNode;
  /** Optional progress state; pair it with detail wording that names the state. */
  readonly status?: ProcessStepStatus;
}

function stepMarker(index: number, status: ProcessStepStatus | undefined) {
  if (status === "complete") return getGlyph("status-complete").unicode;
  if (status === "error") return <FeedbackMark name="warning" />;
  return String(index + 1).padStart(2, "0");
}

/** Props for the {@linkcode ProcessSteps} component. */
export interface ProcessStepsProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly eyebrow?: ReactNode;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly steps: readonly ProcessStep[];
  readonly orientation?: "horizontal" | "vertical";
  /** Lay content out at the editorial page measure or the wider campaign frame. */
  readonly frame?: MarketingFrame;
}

/** Numbered horizontal or vertical journey for onboarding, workflow, implementation, or methodology stories. */
export const ProcessSteps: DiscernComponent<HTMLElement, ProcessStepsProps> =
  forwardRef<HTMLElement, ProcessStepsProps>(function ProcessSteps(
    {
      eyebrow,
      title,
      description,
      steps,
      orientation = "horizontal",
      frame = "standard",
      className,
      ...props
    },
    ref,
  ) {
    return (
      <MarketingSection
        ref={ref}
        frame={frame}
        className={classNames(
          "discern-process-steps",
          frame === "wide" && "discern-process-steps--frame-wide",
          `discern-process-steps--${orientation}`,
          className,
        )}
        {...props}
      >
        <div className="discern-process-steps__inner">
          <header className="discern-process-steps__header">
            <MarketingIntro
              className="discern-process-steps__intro"
              eyebrow={eyebrow}
              title={title}
            />
            {description
              ? (
                <div className="discern-process-steps__description">
                  {description}
                </div>
              )
              : null}
          </header>
          <ol className="discern-process-steps__list">
            {steps.map((step, index) => (
              <li
                key={index}
                className={classNames(
                  "discern-process-steps__step",
                  step.status && `discern-process-steps__step--${step.status}`,
                )}
                aria-current={step.status === "active" ? "step" : undefined}
              >
                <div className="discern-process-steps__marker">
                  <span
                    aria-hidden={step.status === "complete" ||
                        step.status === "error"
                      ? true
                      : undefined}
                  >
                    {stepMarker(index, step.status)}
                  </span>
                </div>
                <div className="discern-process-steps__content">
                  {step.eyebrow
                    ? (
                      <Kicker className="discern-process-steps__step-eyebrow">
                        {step.eyebrow}
                      </Kicker>
                    )
                    : null}
                  <h3>{step.title}</h3>
                  <div className="discern-process-steps__copy">
                    {step.description}
                  </div>
                  {step.detail
                    ? (
                      <div className="discern-process-steps__detail">
                        {step.detail}
                      </div>
                    )
                    : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </MarketingSection>
    );
  });
