import { Children, forwardRef } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { spaceValue } from "../space.ts";
import type { SpaceStep } from "../space.ts";

type MasonryStyle = CSSProperties & {
  readonly "--discern-masonry-gap"?: string;
  readonly "--discern-masonry-min"?: string;
};

/** Props for the {@linkcode Masonry} component. */
export interface MasonryProps extends HTMLAttributes<HTMLDivElement> {
  /** Token-constrained horizontal and vertical item spacing. */
  readonly gap?: SpaceStep;
  /** Preferred minimum column width before the layout removes a column. */
  readonly minimum?: string;
  /** Independent peer items whose natural heights should remain intact. */
  readonly children: ReactNode;
}

/** Standards-first variable-height columns with a packed CSS fallback. */
export const Masonry: DiscernComponent<HTMLDivElement, MasonryProps> =
  forwardRef<HTMLDivElement, MasonryProps>(function Masonry(
    {
      gap = 5,
      minimum = "16rem",
      className,
      style,
      children,
      ...props
    },
    ref,
  ) {
    const masonryStyle: MasonryStyle = {
      "--discern-masonry-gap": spaceValue(gap),
      "--discern-masonry-min": minimum,
      ...style,
    };
    return (
      <div
        ref={ref}
        className={classNames("discern-masonry", className)}
        style={masonryStyle}
        {...props}
      >
        {Children.toArray(children).map((child, index) => (
          <div className="discern-masonry__item" key={index}>{child}</div>
        ))}
      </div>
    );
  });
