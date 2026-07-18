import { forwardRef } from "react";
import type { OlHTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Progress state one {@linkcode WorklogEntry} can carry. */
export type WorklogStatus =
  | "done"
  | "active"
  | "queued"
  | "failed"
  | "skipped";

/** One entry rendered by the {@linkcode Worklog} component. */
export interface WorklogEntry {
  readonly label: ReactNode;
  readonly status: WorklogStatus;
  readonly statusLabel?: string;
  readonly detail?: ReactNode;
  readonly meta?: ReactNode;
}

/** Props for the {@linkcode Worklog} component. */
export interface WorklogProps extends OlHTMLAttributes<HTMLOListElement> {
  readonly entries: readonly WorklogEntry[];
}

const markers: Record<WorklogStatus, string> = {
  done: "✓",
  active: "❯",
  queued: "·",
  failed: "✕",
  skipped: "–",
};

/** Compact statused feed of the steps a run has taken, is taking, and has queued. */
export const Worklog: DiscernComponent<HTMLOListElement, WorklogProps> =
  forwardRef<HTMLOListElement, WorklogProps>(function Worklog(
    { entries, className, ...props },
    ref,
  ) {
    return (
      <ol
        ref={ref}
        className={classNames("discern-worklog", className)}
        {...props}
      >
        {entries.map((entry, index) => (
          <li
            className="discern-worklog__entry"
            data-discern-status={entry.status}
            key={index}
          >
            <span className="discern-worklog__marker" aria-hidden="true">
              {markers[entry.status]}
            </span>
            <span className="discern-worklog__body">
              <span className="discern-worklog__label">
                {entry.label}
                <span className="discern-visually-hidden">
                  {`, ${entry.statusLabel ?? entry.status}`}
                </span>
              </span>
              {entry.detail !== undefined && entry.detail !== null
                ? (
                  <span className="discern-worklog__detail">
                    {entry.detail}
                  </span>
                )
                : null}
            </span>
            {entry.meta !== undefined && entry.meta !== null
              ? <span className="discern-worklog__meta">{entry.meta}</span>
              : null}
          </li>
        ))}
      </ol>
    );
  });
