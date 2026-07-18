import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** One row rendered by the {@linkcode Fleet} component. */
export interface FleetRow {
  readonly persona: ReactNode;
  readonly branch?: ReactNode;
  readonly state?: ReactNode;
  readonly ahead?: number;
  readonly behind?: number;
  readonly meta?: ReactNode;
}

/** Props for the {@linkcode Fleet} component. */
export interface FleetProps extends HTMLAttributes<HTMLUListElement> {
  readonly rows: readonly FleetRow[];
  readonly label?: string;
}

function drift(ahead: number | undefined, behind: number | undefined) {
  if (ahead === undefined && behind === undefined) return null;
  const spoken = [
    ahead !== undefined ? `${ahead} ahead` : null,
    behind !== undefined ? `${behind} behind` : null,
  ].filter((part) => part !== null).join(", ");
  return (
    <span className="discern-fleet__drift">
      <span aria-hidden="true">
        {ahead !== undefined ? `↑${ahead}` : null}
        {ahead !== undefined && behind !== undefined ? " " : null}
        {behind !== undefined ? `↓${behind}` : null}
      </span>
      <span className="discern-visually-hidden">{spoken}</span>
    </span>
  );
}

/** Board of parallel efforts: one row per worktree pairing a persona with branch, state, and drift. */
export const Fleet: DiscernComponent<HTMLUListElement, FleetProps> = forwardRef<
  HTMLUListElement,
  FleetProps
>(function Fleet({ rows, label, className, ...props }, ref) {
  return (
    <ul
      ref={ref}
      className={classNames("discern-fleet", className)}
      {...(label !== undefined ? { "aria-label": label } : {})}
      {...props}
    >
      {rows.map((row, index) => (
        <li className="discern-fleet__row" key={index}>
          <span className="discern-fleet__persona">{row.persona}</span>
          {row.branch !== undefined && row.branch !== null
            ? <span className="discern-fleet__branch">{row.branch}</span>
            : null}
          {row.state !== undefined && row.state !== null
            ? <span className="discern-fleet__state">{row.state}</span>
            : null}
          {drift(row.ahead, row.behind)}
          {row.meta !== undefined && row.meta !== null
            ? <span className="discern-fleet__meta">{row.meta}</span>
            : null}
        </li>
      ))}
    </ul>
  );
});
