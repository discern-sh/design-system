import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Props for the {@linkcode Callout} component. */
export interface CalloutProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly eyebrow?: ReactNode;
  readonly title: ReactNode;
  readonly children: ReactNode;
  readonly icon?: ReactNode;
  readonly tone?: "note" | "insight" | "warning" | "success";
}

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
      {icon
        ? (
          <span className="discern-callout__icon" aria-hidden="true">
            {icon}
          </span>
        )
        : null}
      <div>
        {eyebrow
          ? <span className="discern-callout__eyebrow">{eyebrow}</span>
          : null}
        <h3>{title}</h3>
        <div className="discern-callout__body">{children}</div>
      </div>
    </aside>
  );
});
