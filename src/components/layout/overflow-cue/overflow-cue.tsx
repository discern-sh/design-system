import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import {
  overflowCueAxes,
  overflowCueEdgeNames,
  overflowCueMarkupAttributes,
  overflowCueStateAttributes,
} from "../../../internal/overflow-cue-state.js";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Logical axes whose remaining scroll distance Overflow cue can signal. */
export type OverflowCueAxis = (typeof overflowCueAxes)[number];

/** Props for the {@linkcode OverflowCue} component. */
export interface OverflowCueProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Logical axes to observe. Defaults to block. */
  readonly axis?: OverflowCueAxis;
  /** Own a native viewport, or enhance one namespaced descendant target. */
  readonly scrollContainer?: "owned" | "descendant";
  /** Accessible name for the owned, keyboard-focusable scroll container. */
  readonly viewportLabel?: string;
  /** Additional class for the owned scroll container. */
  readonly viewportClassName?: string;
  readonly children: ReactNode;
}

const initialEdgeState = Object.fromEntries(
  Object.values(overflowCueStateAttributes).map((attribute) => [
    attribute,
    "false",
  ]),
);

const rootContract = {
  [overflowCueMarkupAttributes.root]: "",
  ...initialEdgeState,
};

const targetContract = { [overflowCueMarkupAttributes.target]: "" };

/**
 * Preserve native scrolling while indicating only the logical edges with
 * measurable content remaining. By default the inner viewport owns overflow;
 * descendant mode instead enhances one existing namespaced target.
 */
export const OverflowCue: DiscernComponent<HTMLDivElement, OverflowCueProps> =
  forwardRef<HTMLDivElement, OverflowCueProps>(function OverflowCue(
    {
      axis = "block",
      scrollContainer = "owned",
      viewportLabel,
      viewportClassName,
      className,
      children,
      ...props
    },
    ref,
  ) {
    const content = scrollContainer === "owned"
      ? (
        <div
          className={classNames(
            "discern-overflow-cue__viewport",
            viewportClassName,
          )}
          role={viewportLabel === undefined ? undefined : "region"}
          aria-label={viewportLabel}
          tabIndex={0}
          {...targetContract}
        >
          {children}
        </div>
      )
      : children;

    return (
      <div
        {...props}
        ref={ref}
        className={classNames("discern-overflow-cue", className)}
        {...rootContract}
        {...{ [overflowCueMarkupAttributes.axis]: axis }}
      >
        {content}
        {Object.entries(overflowCueEdgeNames).map(([edge, name]) => (
          <span
            className={classNames(
              "discern-overflow-cue__edge",
              `discern-overflow-cue__edge--${name}`,
            )}
            data-discern-overflow-cue-edge={name}
            aria-hidden="true"
            key={edge}
          />
        ))}
      </div>
    );
  });
