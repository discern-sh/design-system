import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Props for the {@linkcode Table} component. */
export interface TableProps extends HTMLAttributes<HTMLDivElement> {
  readonly caption?: ReactNode;
  readonly striped?: boolean;
  readonly numeric?: boolean;
  readonly children: ReactNode;
}

/** Scrollable semantic data table wrapper: consumers author the table content, the wrapper owns overflow and styling. */
export const Table: DiscernComponent<HTMLDivElement, TableProps> = forwardRef<
  HTMLDivElement,
  TableProps
>(function Table(
  { caption, striped = false, numeric = false, className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={classNames(
        "discern-table",
        striped && "discern-table--striped",
        numeric && "discern-table--numeric",
        className,
      )}
      {...props}
    >
      <table>
        {caption !== undefined && <caption>{caption}</caption>}
        {children}
      </table>
    </div>
  );
});
