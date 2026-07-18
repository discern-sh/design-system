import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { Avatar } from "../avatar/avatar.tsx";

/** Props for the {@linkcode ProfileCard} component. */
export interface ProfileCardProps extends HTMLAttributes<HTMLElement> {
  readonly name: string;
  readonly detail?: ReactNode;
  readonly bio?: ReactNode;
  readonly src?: string;
  readonly avatar?: ReactNode;
  readonly links?: ReactNode;
  readonly layout?: "portrait" | "landscape";
}

/** Card presenting one person: portrait, serif name, detail, bio, and links. */
export const ProfileCard: DiscernComponent<HTMLElement, ProfileCardProps> =
  forwardRef<HTMLElement, ProfileCardProps>(function ProfileCard(
    {
      name,
      detail,
      bio,
      src,
      avatar,
      links,
      layout = "portrait",
      className,
      ...props
    },
    ref,
  ) {
    return (
      <article
        ref={ref}
        className={classNames(
          "discern-profile-card",
          `discern-profile-card--${layout}`,
          className,
        )}
        {...props}
      >
        {avatar ?? (
          <Avatar
            decorative
            name={name}
            shape="square"
            size={layout === "landscape" ? "lg" : "xl"}
            {...(src !== undefined ? { src } : {})}
          />
        )}
        <div className="discern-profile-card__body">
          <h3 className="discern-profile-card__name">{name}</h3>
          {detail !== undefined && detail !== null
            ? <span className="discern-profile-card__detail">{detail}</span>
            : null}
          {bio !== undefined && bio !== null
            ? <div className="discern-profile-card__bio">{bio}</div>
            : null}
        </div>
        {links !== undefined && links !== null
          ? <div className="discern-profile-card__links">{links}</div>
          : null}
      </article>
    );
  });
