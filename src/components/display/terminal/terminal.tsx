import { forwardRef } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Visual treatments available to a Terminal. */
export type TerminalVariant = "standard" | "showcase";

/** Props for the {@linkcode Terminal} component. */
export interface TerminalProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly title?: ReactNode;
  /** Optional trailing content in the terminal chrome. */
  readonly actions?: ReactNode;
  readonly bodyStyle?: CSSProperties;
  /** Optional contextual content beneath the terminal output. */
  readonly footer?: ReactNode;
  /** Theme-responsive utility frame or a stable dark campaign showcase. */
  readonly variant?: TerminalVariant;
  readonly children: ReactNode;
}

/** Framed monospace surface for commands and terminal output. */
export const Terminal: DiscernComponent<HTMLElement, TerminalProps> =
  forwardRef<HTMLElement, TerminalProps>(
    function Terminal(
      {
        title,
        actions,
        bodyStyle,
        footer,
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
            "discern-terminal",
            variant === "showcase" && "discern-terminal--showcase",
            className,
          )}
          {...props}
        >
          <div
            className="discern-terminal__bar"
            aria-hidden={title || actions ? undefined : true}
          >
            <span className="discern-terminal__dots" aria-hidden="true">
              <span className="discern-terminal__dot" />
              <span className="discern-terminal__dot" />
              <span className="discern-terminal__dot" />
            </span>
            {title
              ? <span className="discern-terminal__title">{title}</span>
              : null}
            {actions
              ? <span className="discern-terminal__actions">{actions}</span>
              : null}
          </div>
          <pre
            className="discern-terminal__body"
            style={bodyStyle}
            role="group"
            aria-label={typeof title === "string"
              ? `Scrollable terminal output: ${title}`
              : "Scrollable terminal output"}
            tabIndex={0}
          >
          <code>{children}</code>
          </pre>
          {footer
            ? (
              <figcaption className="discern-terminal__footer">
                {footer}
              </figcaption>
            )
            : null}
        </figure>
      );
    },
  );
