import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { Avatar } from "../avatar/avatar.tsx";
import type { AvatarPresence } from "../avatar/avatar.tsx";

/** Size step for the {@linkcode Persona} lockup. */
export type PersonaSize = "sm" | "md" | "lg";

/** Props for the {@linkcode Persona} component. */
export interface PersonaProps extends HTMLAttributes<HTMLSpanElement> {
  readonly name: string;
  readonly detail?: ReactNode;
  readonly src?: string;
  readonly presence?: AvatarPresence;
  readonly presenceLabel?: string;
  readonly size?: PersonaSize;
  readonly avatar?: ReactNode;
}

/** Avatar, name, and detail lockup identifying one person in interface chrome. */
export const Persona: DiscernComponent<HTMLSpanElement, PersonaProps> =
  forwardRef<HTMLSpanElement, PersonaProps>(function Persona(
    {
      name,
      detail,
      src,
      presence,
      presenceLabel,
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
          "discern-persona",
          `discern-persona--${size}`,
          className,
        )}
        {...props}
      >
        {avatar ?? (
          <Avatar
            decorative
            name={name}
            size={size}
            {...(src !== undefined ? { src } : {})}
            {...(presence !== undefined ? { presence } : {})}
          />
        )}
        <span className="discern-persona__text">
          <span className="discern-persona__name">
            {name}
            {presence !== undefined
              ? (
                <span className="discern-visually-hidden">
                  {`, ${presenceLabel ?? presence}`}
                </span>
              )
              : null}
          </span>
          {detail !== undefined && detail !== null
            ? <span className="discern-persona__detail">{detail}</span>
            : null}
        </span>
      </span>
    );
  });
