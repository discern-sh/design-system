import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import type { HeadingLevel } from "./heading.types.ts";

export type { HeadingLevel } from "./heading.types.ts";
/** Props for the {@linkcode Heading} component. */
export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  readonly level?: HeadingLevel;
  /** Ordinary React phrasing content rendered inside the native heading. */
  readonly children: ReactNode;
}
/** Props for the {@linkcode HeadingAccent} component. */
export interface HeadingAccentProps extends HTMLAttributes<HTMLSpanElement> {
  readonly children: ReactNode;
}

/** Semantic heading with an explicit accent child instead of string parsing. */
export const Heading: DiscernComponent<HTMLHeadingElement, HeadingProps> =
  forwardRef<HTMLHeadingElement, HeadingProps>(function Heading(
    { level = 2, className, children, ...props },
    ref,
  ) {
    const Element = `h${level}` as const;
    return (
      <Element
        ref={ref}
        className={classNames("discern-heading", className)}
        {...props}
      >
        {children}
      </Element>
    );
  });

/** Accent span that highlights part of a Heading. */
export const HeadingAccent: DiscernComponent<
  HTMLSpanElement,
  HeadingAccentProps
> = forwardRef<HTMLSpanElement, HeadingAccentProps>(function HeadingAccent(
  { className, children, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      className={classNames("discern-heading__accent", className)}
      {...props}
    >
      {children}
    </span>
  );
});
