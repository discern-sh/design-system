import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
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

const toneWitnesses: Readonly<
  Record<CalloutTone, { label: string; glyph: string }>
> = {
  note: { label: "Information", glyph: "i" },
  insight: { label: "Insight", glyph: "✦" },
  warning: { label: "Warning", glyph: "!" },
  success: { label: "Success", glyph: "✓" },
};

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
        {icon ?? toneWitnesses[tone].glyph}
      </span>
      <div className="discern-callout__content">
        {eyebrow
          ? <span className="discern-callout__eyebrow">{eyebrow}</span>
          : null}
        <h3>{title}</h3>
        <div className="discern-callout__body">{children}</div>
        {actions !== undefined && (
          <div className="discern-callout__actions">{actions}</div>
        )}
      </div>
    </aside>
  );
});
