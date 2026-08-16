import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import type { ActivityLogLineTone as ActivityLogLineToneVocabulary } from "./activity-log.types.ts";

/** Narration severity accepted by pinned activity log lines. */
export type ActivityLogLineTone = ActivityLogLineToneVocabulary;

/** Overall state presented by one {@linkcode ActivityLog} snapshot. */
export type ActivityLogStatus = "active" | "complete" | "cancelled";

/** One pinned stable line rendered by the {@linkcode ActivityLog} component. */
export interface ActivityLogStableLine {
  readonly text: ReactNode;
  readonly tone: ActivityLogLineTone;
}

/** Props for the {@linkcode ActivityLog} component. */
export interface ActivityLogProps extends HTMLAttributes<HTMLElement> {
  readonly label: ReactNode;
  readonly status?: ActivityLogStatus;
  readonly stable?: readonly ActivityLogStableLine[];
  /** Most recent committed streamed lines, oldest first. */
  readonly tail?: readonly string[];
  /** In-progress line still being replaced in place. */
  readonly partial?: string;
  readonly hint?: ReactNode;
}

const stableMarkers: Record<ActivityLogLineTone, string> = {
  success: "✓",
  note: "▸",
  warning: "!",
  failure: "✕",
};

const statusMarkers: Record<ActivityLogStatus, string> = {
  active: "◢",
  complete: "◥",
  cancelled: "×",
};

/**
 * Long-running work as one calm frame: a headline naming the work, pinned
 * stable results, and the most recent streamed detail with its in-progress
 * partial line.
 */
export const ActivityLog: DiscernComponent<HTMLElement, ActivityLogProps> =
  forwardRef<HTMLElement, ActivityLogProps>(function ActivityLog(
    {
      label,
      status = "active",
      stable,
      tail,
      partial,
      hint,
      className,
      ...props
    },
    ref,
  ) {
    return (
      <section
        ref={ref}
        className={classNames("discern-activity-log", className)}
        data-discern-status={status}
        {...props}
      >
        <p className="discern-activity-log__headline">
          <span className="discern-activity-log__marker" aria-hidden="true">
            {statusMarkers[status]}
          </span>
          <span className="discern-activity-log__label">
            {label}
            <span className="discern-visually-hidden">{`, ${status}`}</span>
          </span>
        </p>
        {stable !== undefined && stable.length > 0
          ? (
            <ul className="discern-activity-log__stable">
              {stable.map((line, index) => (
                <li
                  className="discern-activity-log__stable-line"
                  data-discern-tone={line.tone}
                  key={index}
                >
                  <span
                    className="discern-activity-log__stable-marker"
                    aria-hidden="true"
                  >
                    {stableMarkers[line.tone]}
                  </span>
                  <span className="discern-activity-log__stable-text">
                    {line.text}
                  </span>
                </li>
              ))}
            </ul>
          )
          : null}
        {(tail !== undefined && tail.length > 0) || partial !== undefined
          ? (
            <div className="discern-activity-log__tail" role="log">
              {(tail ?? []).map((line, index) => (
                <span className="discern-activity-log__line" key={index}>
                  {line === "" ? " " : line}
                </span>
              ))}
              {partial !== undefined
                ? (
                  <span className="discern-activity-log__line discern-activity-log__line--partial">
                    {partial}
                  </span>
                )
                : null}
            </div>
          )
          : null}
        {hint !== undefined && hint !== null
          ? <p className="discern-activity-log__hint">{hint}</p>
          : null}
      </section>
    );
  });
