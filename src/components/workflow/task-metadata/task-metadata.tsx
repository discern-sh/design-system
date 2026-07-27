import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** File-change states carried by {@linkcode TaskMetadata}. */
export type TaskFileEffects = "none" | "may-change" | "changes-files";

/** Retry-safety states carried by {@linkcode TaskMetadata}. */
export type TaskRetrySafety = "safe" | "check-first" | "do-not-retry";

/** Props for the {@linkcode TaskMetadata} component. */
export interface TaskMetadataProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  readonly outcome: ReactNode;
  readonly audience: ReactNode;
  readonly prerequisites: ReactNode;
  readonly complexity: ReactNode;
  readonly fileEffects: TaskFileEffects;
  readonly retrySafety: TaskRetrySafety;
  readonly expectedState: ReactNode;
}

const fileEffectLabels: Readonly<Record<TaskFileEffects, string>> = {
  none: "Does not change files",
  "may-change": "May change files",
  "changes-files": "Changes files",
};

const retrySafetyLabels: Readonly<Record<TaskRetrySafety, string>> = {
  safe: "Safe to retry",
  "check-first": "Check the current state before retrying",
  "do-not-retry": "Do not retry",
};

/** Quiet page-level orientation facts for an operational task. */
export const TaskMetadata: DiscernComponent<
  HTMLElement,
  TaskMetadataProps
> = forwardRef<HTMLElement, TaskMetadataProps>(function TaskMetadata(
  {
    outcome,
    audience,
    prerequisites,
    complexity,
    fileEffects,
    retrySafety,
    expectedState,
    className,
    "aria-label": ariaLabel,
    ...props
  },
  ref,
) {
  const facts = [
    { label: "Outcome", value: outcome },
    { label: "For", value: audience },
    { label: "Prerequisites", value: prerequisites },
    { label: "Approximate complexity", value: complexity },
    { label: "File effects", value: fileEffectLabels[fileEffects] },
    { label: "Retry safety", value: retrySafetyLabels[retrySafety] },
    { label: "Expected end state", value: expectedState },
  ] as const;

  return (
    <section
      ref={ref}
      className={classNames("discern-task-metadata", className)}
      aria-label={ariaLabel ?? "Task overview"}
      {...props}
    >
      <dl className="discern-task-metadata__facts">
        {facts.map((fact) => (
          <div className="discern-task-metadata__fact" key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
});
