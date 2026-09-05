import { forwardRef, useId } from "react";
import type { HTMLAttributes } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { resolveProgress } from "./progress.types.ts";
import type { ProgressValue } from "./progress.types.ts";

export type { ProgressValue } from "./progress.types.ts";

/** Props for the labelled task {@linkcode Progress} indicator. */
export interface ProgressProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children">, ProgressValue {
  /** Visible accessible name of the task. */
  readonly label: string;
  /** Optional supplied context, such as units or the current task step. */
  readonly context?: string;
}

/** Determinate task completion or an explicitly unknown waiting state. */
export const Progress: DiscernComponent<HTMLDivElement, ProgressProps> =
  forwardRef<HTMLDivElement, ProgressProps>(function Progress(
    { label, value, max, context, className, ...props },
    ref,
  ) {
    if (!label.trim()) throw new TypeError("Progress needs a non-empty label");
    const state = resolveProgress({
      ...(value === undefined ? {} : { value }),
      ...(max === undefined ? {} : { max }),
    });
    const id = useId();
    return (
      <div
        {...props}
        ref={ref}
        className={classNames("discern-progress", className)}
      >
        <div className="discern-progress__row">
          <span id={`${id}-label`} className="discern-progress__label">
            {label}
          </span>
          <span className="discern-progress__reading">{state.reading}</span>
        </div>
        <div
          className="discern-progress__track"
          role="progressbar"
          aria-labelledby={`${id}-label`}
          aria-valuemin={0}
          aria-valuemax={state.max}
          aria-valuenow={state.value}
          aria-valuetext={[state.reading, context].filter(Boolean).join(" — ")}
          data-discern-indeterminate={state.value === undefined
            ? "true"
            : undefined}
        >
          <div
            className="discern-progress__fill"
            style={state.fraction === undefined
              ? undefined
              : { inlineSize: `${state.fraction * 100}%` }}
          />
        </div>
        {context !== undefined && (
          <span className="discern-progress__context">{context}</span>
        )}
      </div>
    );
  });
