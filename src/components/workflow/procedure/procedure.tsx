import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import {
  PrerequisiteList,
  type PrerequisiteListProps,
} from "../prerequisite-list/prerequisite-list.tsx";
import {
  ProcedureStep,
  type ProcedureStepProps,
} from "../procedure-step/procedure-step.tsx";

/** Props for the {@linkcode Procedure} component. */
export interface ProcedureProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly prerequisites?: PrerequisiteListProps;
  readonly steps: readonly ProcedureStepProps[];
  readonly completion: ReactNode;
  readonly completionLabel?: ReactNode;
}

/** Complete operational sequence with prerequisites, ordered steps, and explicit evidence of completion. */
export const Procedure: DiscernComponent<HTMLElement, ProcedureProps> =
  forwardRef<HTMLElement, ProcedureProps>(function Procedure(
    {
      title,
      description,
      prerequisites,
      steps,
      completion,
      completionLabel = "You are done when",
      className,
      ...props
    },
    ref,
  ) {
    return (
      <section
        ref={ref}
        className={classNames("discern-procedure", className)}
        {...props}
      >
        <header className="discern-procedure__header">
          <h2 className="discern-procedure__title">{title}</h2>
          {description !== undefined
            ? (
              <div className="discern-procedure__description">
                {description}
              </div>
            )
            : null}
        </header>
        {prerequisites !== undefined
          ? (
            <div className="discern-procedure__prerequisites">
              <PrerequisiteList {...prerequisites} />
            </div>
          )
          : null}
        <ol className="discern-procedure__steps">
          {steps.map((step, index) => (
            <li className="discern-procedure__step" key={index}>
              <ProcedureStep {...step} />
            </li>
          ))}
        </ol>
        <footer className="discern-procedure__completion">
          <strong className="discern-procedure__completion-label">
            {completionLabel}
          </strong>
          <div className="discern-procedure__completion-copy">
            {completion}
          </div>
        </footer>
      </section>
    );
  });
