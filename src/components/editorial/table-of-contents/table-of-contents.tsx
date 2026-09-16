import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { useInitialFragmentTarget } from "../../use-initial-fragment-target.ts";
import { tableOfContentsNumbers } from "./table-of-contents.numbers.ts";

/** One item entry rendered by the Table of contents component. */
export interface TableOfContentsItem {
  readonly label: ReactNode;
  readonly href: string;
  readonly current?: boolean;
  readonly nested?: boolean;
  /**
   * Authored number for a top-level item: a string renders verbatim in the
   * number slot without advancing the sequence, `false` leaves the slot
   * empty for a framing section, and `undefined` takes the next
   * sequential number.
   */
  readonly number?: string | false;
}

/** Props for the {@linkcode TableOfContents} component. */
export interface TableOfContentsProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly title?: ReactNode;
  readonly items: readonly TableOfContentsItem[];
  readonly progress?: ReactNode;
  readonly label?: string;
}

/** Compact numbered article navigation with an optional reading-progress note and a clear current-location state. */
export const TableOfContents: DiscernComponent<
  HTMLElement,
  TableOfContentsProps
> = forwardRef<HTMLElement, TableOfContentsProps>(function TableOfContents(
  {
    title = "On this page",
    items,
    progress,
    label = "Table of contents",
    className,
    ...props
  },
  ref,
) {
  useInitialFragmentTarget();
  const numbers = tableOfContentsNumbers(items);
  return (
    <nav
      ref={ref}
      className={classNames("discern-table-of-contents", className)}
      aria-label={label}
      {...props}
    >
      <strong className="discern-table-of-contents__title">{title}</strong>
      <ol>
        {items.map((item, index) => {
          const number = numbers[index];
          return (
            <li
              className={classNames(
                item.current && "discern-table-of-contents__item--current",
                item.nested && "discern-table-of-contents__item--nested",
              )}
              key={item.href}
            >
              <a
                href={item.href}
                aria-current={item.current ? "location" : undefined}
              >
                {number === undefined ? null : <span>{number}</span>}
                {item.label}
              </a>
            </li>
          );
        })}
      </ol>
      {progress
        ? (
          <div className="discern-table-of-contents__progress">
            {progress}
          </div>
        )
        : null}
    </nav>
  );
});
