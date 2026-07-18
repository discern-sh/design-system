import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { derivedInitials } from "../../initials.ts";

/** Size step shared by {@linkcode AgentAvatar} and the components composing it. */
export type AgentAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

/** Activity state an {@linkcode AgentAvatar} status light can carry. */
export type AgentStatus = "working" | "waiting" | "blocked" | "done" | "idle";

/** Props for the {@linkcode AgentAvatar} component. */
export interface AgentAvatarProps extends HTMLAttributes<HTMLSpanElement> {
  readonly name: string;
  readonly sigil?: ReactNode;
  readonly size?: AgentAvatarSize;
  readonly status?: AgentStatus;
  readonly statusLabel?: string;
  readonly decorative?: boolean;
}

/** Dark square tile with a monospace sigil identifying one agent, with optional status. */
export const AgentAvatar: DiscernComponent<HTMLSpanElement, AgentAvatarProps> =
  forwardRef<HTMLSpanElement, AgentAvatarProps>(function AgentAvatar(
    {
      name,
      sigil,
      size = "md",
      status,
      statusLabel,
      decorative = false,
      className,
      ...props
    },
    ref,
  ) {
    const mark = sigil ??
      derivedInitials(name, size === "xs" ? 1 : 2, /[\s\-_./]+/);
    const stateLabel = status !== undefined
      ? statusLabel ?? status
      : undefined;
    const identity = decorative ? { "aria-hidden": true } : {
      role: "img",
      "aria-label": stateLabel !== undefined ? `${name} (${stateLabel})` : name,
    };
    return (
      <span
        ref={ref}
        className={classNames(
          "discern-agent-avatar",
          `discern-agent-avatar--${size}`,
          className,
        )}
        {...identity}
        {...props}
      >
        <span className="discern-agent-avatar__sigil" aria-hidden="true">
          {mark}
        </span>
        {status !== undefined
          ? (
            <span
              className="discern-agent-avatar__status"
              data-discern-status={status}
              aria-hidden="true"
            />
          )
          : null}
      </span>
    );
  });
