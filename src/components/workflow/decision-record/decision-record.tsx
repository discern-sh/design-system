import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { Badge } from "../../display/badge/badge.tsx";

/** Canonical statuses rendered by the {@linkcode DecisionRecord} component. */
export const decisionRecordStatuses = ["accepted", "superseded"] as const;

/** One canonical decision-record status. */
export type DecisionRecordStatus = (typeof decisionRecordStatuses)[number];

/** Props for the {@linkcode DecisionRecord} component. */
export interface DecisionRecordProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly identifier?: ReactNode;
  readonly title: ReactNode;
  readonly status: DecisionRecordStatus;
  readonly date: string;
  readonly dateLabel?: ReactNode;
  readonly context: ReactNode;
  readonly decision: ReactNode;
  readonly consequences: ReactNode;
}

const statusLabels: Record<DecisionRecordStatus, string> = {
  accepted: "Accepted",
  superseded: "Superseded",
};

/** Architecture decision record with context, decision, consequences, status, and date. */
export const DecisionRecord: DiscernComponent<
  HTMLElement,
  DecisionRecordProps
> = forwardRef<HTMLElement, DecisionRecordProps>(function DecisionRecord(
  {
    identifier,
    title,
    status,
    date,
    dateLabel,
    context,
    decision,
    consequences,
    className,
    ...props
  },
  ref,
) {
  return (
    <article
      ref={ref}
      className={classNames("discern-decision-record", className)}
      data-discern-status={status}
      {...props}
    >
      <header className="discern-decision-record__header">
        {identifier !== undefined && identifier !== null
          ? (
            <span className="discern-decision-record__identifier">
              {identifier}
            </span>
          )
          : null}
        <h3>{title}</h3>
        <div className="discern-decision-record__meta">
          <Badge tone={status === "accepted" ? "success" : "neutral"}>
            {statusLabels[status]}
          </Badge>
          <time dateTime={date}>{dateLabel ?? date}</time>
        </div>
      </header>
      <section>
        <h4>Context</h4>
        <div>{context}</div>
      </section>
      <section>
        <h4>Decision</h4>
        <div>{decision}</div>
      </section>
      <section>
        <h4>Consequences</h4>
        <div>{consequences}</div>
      </section>
    </article>
  );
});
