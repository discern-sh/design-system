import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { derivedInitials } from "../../initials.ts";

/** Size step shared by {@linkcode Avatar} and the components composing it. */
export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

/** Presence state an {@linkcode Avatar} badge can carry. */
export type AvatarPresence = "online" | "away" | "busy" | "offline";

/** Props for the {@linkcode Avatar} component. */
export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  readonly name: string;
  readonly src?: string;
  readonly initials?: string;
  readonly size?: AvatarSize;
  readonly shape?: "circle" | "square";
  readonly presence?: AvatarPresence;
  readonly presenceLabel?: string;
  readonly decorative?: boolean;
}

/** Portrait photo or serif monogram identifying one person, with optional presence. */
export const Avatar: DiscernComponent<HTMLSpanElement, AvatarProps> =
  forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
    {
      name,
      src,
      initials,
      size = "md",
      shape = "circle",
      presence,
      presenceLabel,
      decorative = false,
      className,
      ...props
    },
    ref,
  ) {
    const monogram = initials ?? derivedInitials(name, size === "xs" ? 1 : 2);
    const stateLabel = presence !== undefined
      ? presenceLabel ?? presence
      : undefined;
    const identity = decorative ? { "aria-hidden": true } : {
      role: "img",
      "aria-label": stateLabel !== undefined ? `${name} (${stateLabel})` : name,
    };
    return (
      <span
        ref={ref}
        className={classNames(
          "discern-avatar",
          `discern-avatar--${size}`,
          shape === "square" && "discern-avatar--square",
          src !== undefined
            ? "discern-avatar--photo"
            : "discern-avatar--monogram",
          className,
        )}
        {...identity}
        {...props}
      >
        {src !== undefined
          ? (
            <img
              className="discern-avatar__image"
              src={src}
              alt=""
              loading="lazy"
            />
          )
          : (
            <span className="discern-avatar__monogram" aria-hidden="true">
              {monogram}
            </span>
          )}
        {presence !== undefined
          ? (
            <span
              className="discern-avatar__presence"
              data-discern-presence={presence}
              aria-hidden="true"
            />
          )
          : null}
      </span>
    );
  });
