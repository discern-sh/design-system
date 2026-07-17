import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { Heading } from "../../display/heading/heading.tsx";
import type { HeadingLevel } from "../../display/heading/heading.tsx";

/** Props for the {@linkcode AnchorHeading} component. */
export interface AnchorHeadingProps
  extends Omit<HTMLAttributes<HTMLHeadingElement>, "id"> {
  readonly id: string;
  readonly level?: HeadingLevel;
  readonly anchorLabel?: string;
  readonly children: ReactNode;
}

/** Heading with a hover-revealed self link, so any section can be linked to directly. */
export const AnchorHeading: DiscernComponent<
  HTMLHeadingElement,
  AnchorHeadingProps
> = forwardRef<HTMLHeadingElement, AnchorHeadingProps>(function AnchorHeading(
  {
    id,
    level = 2,
    anchorLabel = "Link to this section",
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <Heading
      ref={ref}
      level={level}
      id={id}
      className={classNames("discern-anchor-heading", className)}
      {...props}
    >
      {children}
      <a
        className="discern-anchor-heading__anchor"
        href={`#${id}`}
        aria-label={anchorLabel}
      >
        §
      </a>
    </Heading>
  );
});
