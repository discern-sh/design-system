import { Children, forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { Avatar } from "../avatar/avatar.tsx";
import type { AvatarSize } from "../avatar/avatar.tsx";

/** Props for the {@linkcode AvatarGroup} component. */
export interface AvatarGroupProps extends HTMLAttributes<HTMLSpanElement> {
  readonly children: ReactNode;
  readonly max?: number;
  readonly label?: string;
  readonly size?: AvatarSize;
  readonly overflowLabel?: (hidden: number) => string;
}

function defaultOverflowLabel(hidden: number): string {
  return `${hidden} more`;
}

/** Overlapping stack of Avatars with a labelled overflow count. */
export const AvatarGroup: DiscernComponent<HTMLSpanElement, AvatarGroupProps> =
  forwardRef<HTMLSpanElement, AvatarGroupProps>(function AvatarGroup(
    {
      children,
      max,
      label,
      size = "md",
      overflowLabel = defaultOverflowLabel,
      className,
      ...props
    },
    ref,
  ) {
    const items = Children.toArray(children);
    const limit = max !== undefined && max >= 0 ? max : items.length;
    const visible = items.length > limit ? items.slice(0, limit) : items;
    const hidden = items.length - visible.length;
    return (
      <span
        ref={ref}
        className={classNames("discern-avatar-group", className)}
        {...(label !== undefined ? { role: "group", "aria-label": label } : {})}
        {...props}
      >
        {visible}
        {hidden > 0
          ? (
            <Avatar
              className="discern-avatar-group__overflow"
              name={overflowLabel(hidden)}
              initials={`+${hidden}`}
              size={size}
            />
          )
          : null}
      </span>
    );
  });
