import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { AgentAvatar } from "../agent-avatar/agent-avatar.tsx";
import type { AgentStatus } from "../agent-avatar/agent-avatar.tsx";

/** Size step for the {@linkcode AgentPersona} lockup. */
export type AgentPersonaSize = "sm" | "md" | "lg";

/** Props for the {@linkcode AgentPersona} component. */
export interface AgentPersonaProps extends HTMLAttributes<HTMLSpanElement> {
  readonly name: string;
  readonly detail?: ReactNode;
  readonly sigil?: ReactNode;
  readonly status?: AgentStatus;
  readonly statusLabel?: string;
  readonly size?: AgentPersonaSize;
  readonly avatar?: ReactNode;
}

/** Agent avatar, name, and monospace detail lockup identifying one agent in interface chrome. */
export const AgentPersona: DiscernComponent<
  HTMLSpanElement,
  AgentPersonaProps
> = forwardRef<HTMLSpanElement, AgentPersonaProps>(function AgentPersona(
  {
    name,
    detail,
    sigil,
    status,
    statusLabel,
    size = "md",
    avatar,
    className,
    ...props
  },
  ref,
) {
  return (
    <span
      ref={ref}
      className={classNames(
        "discern-agent-persona",
        `discern-agent-persona--${size}`,
        className,
      )}
      {...props}
    >
      {avatar ?? (
        <AgentAvatar
          decorative
          name={name}
          size={size}
          {...(sigil !== undefined ? { sigil } : {})}
          {...(status !== undefined ? { status } : {})}
        />
      )}
      <span className="discern-agent-persona__text">
        <span className="discern-agent-persona__name">
          {name}
          {status !== undefined
            ? (
              <span className="discern-visually-hidden">
                {`, ${statusLabel ?? status}`}
              </span>
            )
            : null}
        </span>
        {detail !== undefined && detail !== null
          ? <span className="discern-agent-persona__detail">{detail}</span>
          : null}
      </span>
    </span>
  );
});
