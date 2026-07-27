import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { CopyButton } from "../../docs/copy-button/copy-button.tsx";

/** Props for the {@linkcode AgentHandoff} component. */
export interface AgentHandoffProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  readonly title: ReactNode;
  readonly children: string;
  readonly description?: ReactNode;
  readonly copyLabel?: ReactNode;
  readonly copiedLabel?: ReactNode;
}

/** Self-contained agent instructions whose visible prompt is the clipboard authority. */
export const AgentHandoff: DiscernComponent<
  HTMLDivElement,
  AgentHandoffProps
> = forwardRef<HTMLDivElement, AgentHandoffProps>(function AgentHandoff(
  {
    title,
    children,
    description,
    copyLabel = "Copy prompt",
    copiedLabel = "Prompt copied",
    className,
    "aria-label": ariaLabel,
    ...props
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={classNames("discern-agent-handoff", className)}
      role="group"
      aria-label={ariaLabel ?? (typeof title === "string" ? title : undefined)}
      {...props}
    >
      <header className="discern-agent-handoff__header">
        <div className="discern-agent-handoff__title">{title}</div>
        <CopyButton
          value={children}
          label={copyLabel}
          copiedLabel={copiedLabel}
        />
      </header>
      {description !== undefined
        ? (
          <div className="discern-agent-handoff__description">
            {description}
          </div>
        )
        : null}
      <pre className="discern-agent-handoff__prompt">{children}</pre>
    </div>
  );
});
