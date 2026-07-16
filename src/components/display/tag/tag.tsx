import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  readonly children: ReactNode;
  readonly onRemove?: () => void;
  readonly removeLabel?: string;
}
export const Tag: DiscernComponent<HTMLSpanElement, TagProps> = forwardRef<
  HTMLSpanElement,
  TagProps
>(function Tag(
  { children, onRemove, removeLabel = "Remove", className, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      className={classNames("discern-tag", className)}
      {...props}
    >
      {children}
      {onRemove
        ? (
          <button
            type="button"
            className="discern-tag__remove"
            aria-label={removeLabel}
            onClick={onRemove}
          >
            <span aria-hidden="true">×</span>
          </button>
        )
        : null}
    </span>
  );
});
