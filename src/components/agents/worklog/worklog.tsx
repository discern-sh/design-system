import { forwardRef } from "react";
import type { OlHTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { worklogPositions, type WorklogStatus } from "./worklog.types.ts";

export type { WorklogStatus } from "./worklog.types.ts";

/** One entry rendered by the {@linkcode Worklog} component. */
export interface WorklogEntry {
  readonly label: ReactNode;
  readonly status: WorklogStatus;
  readonly statusLabel?: string;
  readonly detail?: ReactNode;
  readonly meta?: ReactNode;
  /** Explicit label for adjacent routine entries; omit for decisions or boundaries. */
  readonly routineGroup?: string;
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
    const positions = worklogPositions(entries);
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
            data-discern-routine={positions[index]?.continued
              ? "continuation"
              : positions[index]
              ? "start"
              : undefined}
            key={index}
          >
            <span
              className="discern-worklog__marker"
              role="img"
              aria-label={entry.statusLabel === undefined
                ? entry.status
                : `${entry.statusLabel}, ${entry.status}`}
            >
              {markers[entry.status]}
            </span>
            <span className="discern-worklog__body">
              {positions[index] && !positions[index]!.continued && (
                <strong className="discern-worklog__group">
                  {positions[index]!.label} · {positions[index]!.size}{" "}
                  {entry.statusLabel ?? entry.status}
                </strong>
              )}
              <span className="discern-worklog__label">
                {entry.label}
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
