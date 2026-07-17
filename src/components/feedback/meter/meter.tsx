import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Tone options for the Meter fill. */
export type MeterTone = "neutral" | "warning" | "danger";

/** Props for the {@linkcode Meter} component. */
export interface MeterProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  readonly label: ReactNode;
  readonly value: number;
  readonly min?: number;
  readonly max?: number;
  readonly reading?: ReactNode;
  readonly tone?: MeterTone;
}

/** Labelled fraction-of-a-range meter with an optional textual reading beside the bar. */
export const Meter: DiscernComponent<HTMLDivElement, MeterProps> = forwardRef<
  HTMLDivElement,
  MeterProps
>(function Meter(
  {
    label,
    value,
    min = 0,
    max = 100,
    reading,
    tone = "neutral",
    className,
    ...props
  },
  ref,
) {
  const span = max - min;
  const fraction = span > 0 ? (value - min) / span : 0;
  const percent = Math.min(100, Math.max(0, fraction * 100));
  return (
    <div
      ref={ref}
      className={classNames(
        "discern-meter",
        tone === "warning" && "discern-meter--warning",
        tone === "danger" && "discern-meter--danger",
        className,
      )}
      {...props}
    >
      <div className="discern-meter__row">
        <span className="discern-meter__label">{label}</span>
        {reading !== undefined && (
          <span className="discern-meter__reading">{reading}</span>
        )}
      </div>
      <div
        className="discern-meter__track"
        role="meter"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={typeof label === "string" ? label : undefined}
      >
        <div
          className="discern-meter__fill"
          style={{ inlineSize: `${percent}%` }}
        />
      </div>
    </div>
  );
});
