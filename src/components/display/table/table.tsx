import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Logical alignment supported by rich Table header and data cells. */
export type TableCellAlignment = "start" | "center" | "end";

/** Namespaced cell hook consumed by Table's own alignment rules. */
export interface TableCellAlignmentProps {
  readonly "data-discern-table-align"?: TableCellAlignment;
}

/**
 * Project one optional logical alignment into the Table-owned cell contract.
 */
export function tableCellAlignmentProps(
  alignment: TableCellAlignment | undefined,
): TableCellAlignmentProps {
  return alignment === undefined
    ? {}
    : { "data-discern-table-align": alignment };
}

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
  const accessibleCaption = typeof caption === "string" && caption.trim()
    ? caption.trim()
    : undefined;

  return (
    <div
      ref={ref}
      className={classNames(
        "discern-table",
        striped && "discern-table--striped",
        numeric && "discern-table--numeric",
        className,
      )}
      role="group"
      aria-label={accessibleCaption === undefined
        ? "Scrollable table viewport"
        : `Scrollable table viewport: ${accessibleCaption}`}
      tabIndex={0}
      {...props}
    >
      <table>
        {caption !== undefined && <caption>{caption}</caption>}
        {children}
      </table>
    </div>
  );
});
