import { forwardRef } from "react";
import type {
  AnchorHTMLAttributes,
  HTMLAttributes,
  ReactNode,
  Ref,
} from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { Avatar } from "../avatar/avatar.tsx";

interface MentionCommonProps {
  readonly name: string;
  readonly src?: string;
  readonly sigil?: ReactNode;
  readonly avatar?: ReactNode;
  readonly className?: string;
}

/** Linked mention props options for the Mention component. */
export type LinkedMentionProps =
  & MentionCommonProps
  & Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    keyof MentionCommonProps | "href"
  >
  & {
    readonly href: string;
  };

/** Static mention props options for the Mention component. */
export type StaticMentionProps =
  & MentionCommonProps
  & Omit<HTMLAttributes<HTMLSpanElement>, keyof MentionCommonProps | "href">
  & {
    readonly href?: never;
  };

/** Props for the {@linkcode Mention} component. */
export type MentionProps = LinkedMentionProps | StaticMentionProps;

function chipContent(
  name: string,
  src: string | undefined,
  sigil: ReactNode,
  avatar: ReactNode,
) {
  const badge = avatar ?? (src !== undefined
    ? (
      <Avatar
        decorative
        name={name}
        src={src}
        className="discern-mention__avatar"
      />
    )
    : null);
  const resolvedSigil = sigil !== undefined
    ? sigil
    : badge !== null
    ? null
    : "@";
  return (
    <>
      {badge}
      {resolvedSigil !== null && resolvedSigil !== false
        ? (
          <span className="discern-mention__sigil" aria-hidden="true">
            {resolvedSigil}
          </span>
        )
        : null}
      <span className="discern-mention__name">{name}</span>
    </>
  );
}

/** Inline person chip: an @sigil or tiny portrait beside the name, linked or static. */
export const Mention: DiscernComponent<
  HTMLAnchorElement | HTMLSpanElement,
  MentionProps
> = forwardRef<HTMLAnchorElement | HTMLSpanElement, MentionProps>(
  function Mention(props, forwardedRef) {
    const classes = classNames("discern-mention", props.className);
    if ("href" in props && typeof props.href === "string") {
      const {
        href,
        name,
        src,
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
          {chipContent(name, src, sigil, avatar)}
        </a>
      );
    }
    const {
      name,
      src,
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
        {chipContent(name, src, sigil, avatar)}
      </span>
    );
  },
);
