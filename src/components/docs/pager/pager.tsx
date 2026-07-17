import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** One adjacent page rendered by the Pager component. */
export interface PagerLink {
  readonly label: ReactNode;
  readonly href: string;
}

/** Props for the {@linkcode Pager} component. */
export interface PagerProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  readonly previous?: PagerLink;
  readonly next?: PagerLink;
  readonly previousLabel?: ReactNode;
  readonly nextLabel?: ReactNode;
  readonly label?: string;
}

/** Sequential previous/next navigation between adjacent pages in a reading order. */
export const Pager: DiscernComponent<HTMLElement, PagerProps> = forwardRef<
  HTMLElement,
  PagerProps
>(function Pager(
  {
    previous,
    next,
    previousLabel = "Previous",
    nextLabel = "Next",
    label = "Pagination",
    className,
    ...props
  },
  ref,
) {
  return (
    <nav
      ref={ref}
      className={classNames("discern-pager", className)}
      aria-label={label}
      {...props}
    >
      {previous
        ? (
          <a
            className="discern-pager__link discern-pager__link--previous"
            href={previous.href}
          >
            <span className="discern-pager__direction">{previousLabel}</span>
            <span className="discern-pager__title">{previous.label}</span>
          </a>
        )
        : <span aria-hidden="true" />}
      {next && (
        <a
          className="discern-pager__link discern-pager__link--next"
          href={next.href}
        >
          <span className="discern-pager__direction">{nextLabel}</span>
          <span className="discern-pager__title">{next.label}</span>
        </a>
      )}
    </nav>
  );
});
