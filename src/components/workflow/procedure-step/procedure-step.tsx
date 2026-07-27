import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import {
  BranchChoice,
  type BranchChoiceProps,
} from "../branch-choice/branch-choice.tsx";
import { Command, type CommandProps } from "../command/command.tsx";
import {
  ExpectedResult,
  type ExpectedResultProps,
} from "../expected-result/expected-result.tsx";

/** Props for the {@linkcode ProcedureStep} component. */
export interface ProcedureStepProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly title: ReactNode;
  readonly action: ReactNode;
  readonly command?: CommandProps;
  readonly expectedResult?: ExpectedResultProps;
  readonly completionCriterion?: ReactNode;
  readonly recovery?: ReactNode;
  readonly recoveryLabel?: ReactNode;
  readonly branch?: BranchChoiceProps;
}

/** One operational action with its executable input, proof, completion criterion, fork, and recovery guidance. */
export const ProcedureStep: DiscernComponent<
  HTMLElement,
  ProcedureStepProps
> = forwardRef<HTMLElement, ProcedureStepProps>(function ProcedureStep(
  {
    title,
    action,
    command,
    expectedResult,
    completionCriterion,
    recovery,
    recoveryLabel = "If this fails",
    branch,
    className,
    ...props
  },
  ref,
) {
  return (
    <article
      ref={ref}
      className={classNames("discern-procedure-step", className)}
      {...props}
    >
      <header className="discern-procedure-step__header">
        <h3 className="discern-procedure-step__title">{title}</h3>
        <div className="discern-procedure-step__action">{action}</div>
      </header>
      {command !== undefined
        ? (
          <div className="discern-procedure-step__command">
            <Command {...command} />
          </div>
        )
        : null}
      {expectedResult !== undefined
        ? (
          <div className="discern-procedure-step__expected-result">
            <ExpectedResult {...expectedResult} />
          </div>
        )
        : null}
      {completionCriterion !== undefined
        ? (
          <div className="discern-procedure-step__criterion">
            <strong className="discern-procedure-step__slot-label">
              Step complete when
            </strong>
            <div className="discern-procedure-step__slot-copy">
              {completionCriterion}
            </div>
          </div>
        )
        : null}
      {branch !== undefined
        ? (
          <div className="discern-procedure-step__branch">
            <BranchChoice {...branch} />
          </div>
        )
        : null}
      {recovery !== undefined
        ? (
          <div className="discern-procedure-step__recovery">
            <strong className="discern-procedure-step__slot-label">
              {recoveryLabel}
            </strong>
            <div className="discern-procedure-step__slot-copy">{recovery}</div>
          </div>
        )
        : null}
    </article>
  );
});
