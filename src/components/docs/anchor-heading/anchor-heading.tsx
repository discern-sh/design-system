import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { Heading } from "../../display/heading/heading.tsx";
import type { AnchorHeadingLevel } from "./anchor-heading.types.ts";

/** Props for the {@linkcode AnchorHeading} component. */
export interface AnchorHeadingProps
  extends Omit<HTMLAttributes<HTMLHeadingElement>, "id"> {
  /** Document-unique fragment destination carried by the heading element. */
  readonly id: string;
  readonly level?: AnchorHeadingLevel;
  /** Accessible name of the self link, which never joins the heading's name. */
  readonly anchorLabel?: string;
  readonly children: ReactNode;
}

/**
 * Heading with a hover-revealed self link, so any section can be linked to
 * directly. The heading and the link are siblings inside one row, so
 * assistive technology reads the heading text alone. `className` names the
 * row; every other attribute and the forwarded ref address the heading
 * element, which keeps the id and the fragment focus target.
 */
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
    <div className={classNames("discern-anchor-heading", className)}>
      <Heading ref={ref} level={level} id={id} tabIndex={-1} {...props}>
        {children}
      </Heading>
      <a
        className="discern-anchor-heading__anchor"
        href={`#${encodeURIComponent(id)}`}
        aria-label={anchorLabel}
      >
        §
      </a>
    </div>
  );
});
