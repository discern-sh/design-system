import { forwardRef } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Visual treatments available to a Window. */
export type WindowVariant = "standard" | "showcase";

/** Props for the {@linkcode Window} component. */
export interface WindowProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly title?: ReactNode;
  /** Optional trailing content in the window chrome. */
  readonly actions?: ReactNode;
  readonly bodyStyle?: CSSProperties;
  /** Standard utility frame or the larger campaign-page showcase frame. */
  readonly variant?: WindowVariant;
  readonly children: ReactNode;
}
/** Framed presentation surface for product UI and code examples. */
export const Window: DiscernComponent<HTMLElement, WindowProps> = forwardRef<
  HTMLElement,
  WindowProps
>(function Window(
  {
    title,
    actions,
    bodyStyle,
    variant = "standard",
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <figure
      ref={ref}
      className={classNames(
        "discern-window",
        variant === "showcase" && "discern-window--showcase",
        className,
      )}
      {...props}
    >
      <div
        className="discern-window__bar"
        aria-hidden={title || actions ? undefined : true}
      >
        <span className="discern-window__dots" aria-hidden="true">
          <span className="discern-window__dot" />
          <span className="discern-window__dot" />
          <span className="discern-window__dot" />
        </span>
        {title ? <span className="discern-window__title">{title}</span> : null}
        {actions
          ? <span className="discern-window__actions">{actions}</span>
          : null}
      </div>
      <div className="discern-window__body" style={bodyStyle}>{children}</div>
    </figure>
  );
});
