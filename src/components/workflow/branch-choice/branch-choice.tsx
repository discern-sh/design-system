import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** One labelled route rendered by {@linkcode BranchChoice}. */
export interface BranchChoiceItem {
  readonly label: ReactNode;
  readonly path: ReactNode;
  readonly href?: string;
}

/** Props for the {@linkcode BranchChoice} component. */
export interface BranchChoiceProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  readonly title?: ReactNode;
  readonly choices: readonly BranchChoiceItem[];
}

/** Two or three explicit routes through a procedure, complete and linkable in static HTML. */
export const BranchChoice: DiscernComponent<
  HTMLDivElement,
  BranchChoiceProps
> = forwardRef<HTMLDivElement, BranchChoiceProps>(function BranchChoice(
  {
    title = "Choose what happens next",
    choices,
    className,
    "aria-label": ariaLabel,
    ...props
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={classNames("discern-branch-choice", className)}
      role="group"
      aria-label={ariaLabel ?? (typeof title === "string" ? title : undefined)}
      {...props}
    >
      <div className="discern-branch-choice__title">{title}</div>
      <ul className="discern-branch-choice__choices">
        {choices.map((choice, index) => (
          <li className="discern-branch-choice__choice" key={index}>
            <span className="discern-branch-choice__label">
              {choice.label}
            </span>
            <ul className="discern-branch-choice__paths">
              <li className="discern-branch-choice__path">
                {choice.href !== undefined
                  ? <a href={choice.href}>{choice.path}</a>
                  : <span>{choice.path}</span>}
              </li>
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
});
