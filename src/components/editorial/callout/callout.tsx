import { Cluster } from "../../layout/cluster/cluster.tsx";
import { Stack } from "../../layout/stack/stack.tsx";
import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { FeedbackMark } from "../../feedback/feedback-marks.tsx";
import type { FeedbackMarkName } from "../../feedback/feedback-marks.tsx";
import type { CalloutTone } from "./callout.types.ts";

/** Props for the {@linkcode Callout} component. */
export interface CalloutProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly eyebrow?: ReactNode;
  readonly title: ReactNode;
  readonly children: ReactNode;
  readonly icon?: ReactNode;
  readonly tone?: CalloutTone;
  /** Follow-up controls beneath the editorial context. */
  readonly actions?: ReactNode;
}

/** Each tone's accessible name and its stroke-matched feedback mark. */
const toneWitnesses: Readonly<
  Record<CalloutTone, { label: string; mark: FeedbackMarkName }>
> = Object.freeze({
  note: { label: "Information", mark: "neutral" },
  insight: { label: "Insight", mark: "accent" },
  warning: { label: "Warning", mark: "warning" },
  success: { label: "Success", mark: "success" },
});

/** Inset editorial note for context, interpretation, cautions, and successful outcomes without breaking the reading flow. */
export const Callout: DiscernComponent<HTMLElement, CalloutProps> = forwardRef<
  HTMLElement,
  CalloutProps
>(function Callout(
  {
    eyebrow,
    title,
    children,
    icon,
    actions,
    tone = "note",
    className,
    ...props
  },
  ref,
) {
  return (
    <aside
      ref={ref}
      className={classNames(
        "discern-callout",
        `discern-callout--${tone}`,
        className,
      )}
      role="note"
      {...props}
    >
      <span
        className="discern-callout__icon"
        role="img"
        aria-label={toneWitnesses[tone].label}
      >
        {icon ?? <FeedbackMark name={toneWitnesses[tone].mark} />}
      </span>
      <Stack gap={2}>
        {eyebrow
          ? <span className="discern-callout__eyebrow">{eyebrow}</span>
          : null}
        <h3>{title}</h3>
        <Stack className="discern-callout__body">{children}</Stack>
        {actions !== undefined && (
          <Cluster className="discern-callout__actions">{actions}</Cluster>
        )}
      </Stack>
    </aside>
  );
});
