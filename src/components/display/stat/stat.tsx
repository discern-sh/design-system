import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Direction options for the Stat context line. */
export type StatTrend = "positive" | "negative" | "neutral";

/** Props for the {@linkcode Stat} component. */
export interface StatProps extends HTMLAttributes<HTMLDivElement> {
  readonly label: ReactNode;
  readonly value: ReactNode;
  readonly context?: ReactNode;
  readonly trend?: StatTrend;
}

/** One labelled figure with an optional trend-coloured context line. */
export const Stat: DiscernComponent<HTMLDivElement, StatProps> = forwardRef<
  HTMLDivElement,
  StatProps
>(function Stat(
  { label, value, context, trend = "neutral", className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={classNames("discern-stat", className)}
      {...props}
    >
      <span className="discern-stat__label">{label}</span>
      <span className="discern-stat__value">{value}</span>
      {context !== undefined && (
        <span
          className={classNames(
            "discern-stat__context",
            trend === "positive" && "discern-stat__context--positive",
            trend === "negative" && "discern-stat__context--negative",
          )}
        >
          {context}
        </span>
      )}
    </div>
  );
});
