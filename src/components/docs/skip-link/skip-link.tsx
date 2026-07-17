import { forwardRef } from "react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Props for the {@linkcode SkipLink} component. */
export interface SkipLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  readonly href: string;
  readonly children?: ReactNode;
}

/** Visually hidden bypass link that surfaces on keyboard focus and jumps to the page's main content. */
export const SkipLink: DiscernComponent<HTMLAnchorElement, SkipLinkProps> =
  forwardRef<HTMLAnchorElement, SkipLinkProps>(function SkipLink(
    { href, className, children = "Skip to content", ...props },
    ref,
  ) {
    return (
      <a
        ref={ref}
        className={classNames("discern-skip-link", className)}
        href={href}
        {...props}
      >
        {children}
      </a>
    );
  });
