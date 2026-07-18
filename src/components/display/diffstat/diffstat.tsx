import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Props for the {@linkcode Diffstat} component. */
export interface DiffstatProps extends HTMLAttributes<HTMLSpanElement> {
  readonly added: number;
  readonly removed: number;
  readonly blocks?: number;
}

function allocate(
  added: number,
  removed: number,
  blocks: number,
): readonly ("added" | "removed" | "neutral")[] {
  const total = added + removed;
  if (total === 0) return Array.from({ length: blocks }, () => "neutral");
  let plus = Math.round((added / total) * blocks);
  if (added > 0 && plus === 0) plus = 1;
  if (removed > 0 && plus === blocks) plus = blocks - 1;
  return Array.from(
    { length: blocks },
    (_, index) => index < plus ? "added" : "removed",
  );
}

/** Inline added/removed change summary: signed counts beside proportional squares. */
export const Diffstat: DiscernComponent<HTMLSpanElement, DiffstatProps> =
  forwardRef<HTMLSpanElement, DiffstatProps>(function Diffstat(
    { added, removed, blocks = 5, className, ...props },
    ref,
  ) {
    return (
      <span
        ref={ref}
        className={classNames("discern-diffstat", className)}
        {...props}
      >
        <span className="discern-diffstat__added">{`+${added}`}</span>
        <span className="discern-diffstat__removed">{`−${removed}`}</span>
        <span className="discern-diffstat__blocks" aria-hidden="true">
          {allocate(added, removed, blocks).map((share, index) => (
            <span
              className={`discern-diffstat__block discern-diffstat__block--${share}`}
              key={index}
            />
          ))}
        </span>
      </span>
    );
  });
