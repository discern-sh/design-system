import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { Sparkline } from "../sparkline/sparkline.tsx";
import type { SparklineValue } from "../sparkline/sparkline.shared.ts";
import type { StatTrend } from "./stat.types.ts";

/** Props for the {@linkcode Stat} component. */
export interface StatProps extends HTMLAttributes<HTMLDivElement> {
  readonly label: ReactNode;
  readonly value: ReactNode;
  readonly context?: ReactNode;
  readonly trend?: StatTrend;
  /** Recent movement rendered as an annotated Sparkline beneath the trend. */
  readonly sparkline?: readonly SparklineValue[];
}

/**
 * One labelled figure with an optional trend-coloured context line and an
 * optional annotated Sparkline of the recent movement behind the figure.
 */
export const Stat: DiscernComponent<HTMLDivElement, StatProps> = forwardRef<
  HTMLDivElement,
  StatProps
>(function Stat(
  { label, value, context, trend = "neutral", sparkline, className, ...props },
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
      {sparkline !== undefined && (
        <Sparkline className="discern-stat__sparkline" values={sparkline} />
      )}
    </div>
  );
});
