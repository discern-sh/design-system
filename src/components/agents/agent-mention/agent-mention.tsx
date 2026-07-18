import { forwardRef } from "react";
import type {
  AnchorHTMLAttributes,
  HTMLAttributes,
  ReactNode,
  Ref,
} from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

interface AgentMentionCommonProps {
  readonly name: string;
  readonly sigil?: ReactNode;
  readonly avatar?: ReactNode;
  readonly className?: string;
}

/** Linked mention props options for the Agent mention component. */
export type LinkedAgentMentionProps =
  & AgentMentionCommonProps
  & Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    keyof AgentMentionCommonProps | "href"
  >
  & {
    readonly href: string;
  };

/** Static mention props options for the Agent mention component. */
export type StaticAgentMentionProps =
  & AgentMentionCommonProps
  & Omit<
    HTMLAttributes<HTMLSpanElement>,
    keyof AgentMentionCommonProps | "href"
  >
  & {
    readonly href?: never;
  };

/** Props for the {@linkcode AgentMention} component. */
export type AgentMentionProps =
  | LinkedAgentMentionProps
  | StaticAgentMentionProps;

function chipContent(name: string, sigil: ReactNode, avatar: ReactNode) {
  const resolvedSigil = sigil !== undefined
    ? sigil
    : avatar !== undefined && avatar !== null
    ? null
    : "❯";
  return (
    <>
      {avatar}
      {resolvedSigil !== null && resolvedSigil !== false
        ? (
          <span className="discern-agent-mention__sigil" aria-hidden="true">
            {resolvedSigil}
          </span>
        )
        : null}
      <span className="discern-agent-mention__name">{name}</span>
    </>
  );
}

/** Inline agent chip: a prompt sigil or tiny tile beside the monospace name, linked or static. */
export const AgentMention: DiscernComponent<
  HTMLAnchorElement | HTMLSpanElement,
  AgentMentionProps
> = forwardRef<HTMLAnchorElement | HTMLSpanElement, AgentMentionProps>(
  function AgentMention(props, forwardedRef) {
    const classes = classNames("discern-agent-mention", props.className);
    if ("href" in props && typeof props.href === "string") {
      const {
        href,
        name,
        sigil,
        avatar,
        className: _className,
        ...anchorProps
      } = props;
      return (
        <a
          ref={forwardedRef as Ref<HTMLAnchorElement>}
          href={href}
          className={classes}
          {...anchorProps}
        >
          {chipContent(name, sigil, avatar)}
        </a>
      );
    }
    const {
      name,
      sigil,
      avatar,
      className: _className,
      ...spanProps
    } = props;
    return (
      <span
        ref={forwardedRef as Ref<HTMLSpanElement>}
        className={classes}
        {...spanProps}
      >
        {chipContent(name, sigil, avatar)}
      </span>
    );
  },
);
