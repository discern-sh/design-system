import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { Meter, type MeterTone } from "../../feedback/meter/meter.tsx";
import type {
  StandardDirection,
  StandardTrend,
} from "./standard-meter.types.ts";

export type {
  StandardDirection,
  StandardTrend,
} from "./standard-meter.types.ts";

/** Props for the {@linkcode StandardMeter} component. */
export interface StandardMeterProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  readonly label: ReactNode;
  readonly value: number;
  readonly limit: number;
  readonly direction: StandardDirection;
  readonly min?: number;
  readonly max?: number;
  readonly trend?: StandardTrend;
  readonly formatValue?: (value: number) => string;
}

function defaultFormat(value: number): string {
  return String(value);
}

/** Quality reading that states its limit, direction of virtue, headroom, and trend. */
export const StandardMeter: DiscernComponent<
  HTMLElement,
  StandardMeterProps
> = forwardRef<HTMLElement, StandardMeterProps>(function StandardMeter(
  {
    label,
    value,
    limit,
    direction,
    min = Math.min(0, value, limit),
    max = Math.max(1, value, limit),
    trend,
    formatValue = defaultFormat,
    className,
    ...props
  },
  ref,
) {
  const headroom = direction === "floor" ? value - limit : limit - value;
  const distance = Number(Math.abs(headroom).toPrecision(12));
  const withinLimit = headroom >= 0;
  const span = max - min;
  const nearLimit = span > 0 && distance / span <= 0.1;
  const tone: MeterTone = withinLimit
    ? (nearLimit ? "warning" : "neutral")
    : "danger";
  const headroomText = direction === "floor"
    ? `${formatValue(distance)} ${withinLimit ? "above" : "below"} floor`
    : `${formatValue(distance)} ${withinLimit ? "below" : "above"} ceiling`;
  const directionText = direction === "floor"
    ? "Floor rises; higher is better"
    : "Ceiling falls; lower is better";

  return (
    <article
      ref={ref}
      className={classNames("discern-standard-meter", className)}
      {...props}
    >
      <header className="discern-standard-meter__header">
        <strong>{label}</strong>
        {trend !== undefined
          ? (
            <span
              className="discern-standard-meter__trend"
              data-discern-state={trend}
            >
              {trend}
            </span>
          )
          : null}
      </header>
      <Meter
        label="Current value"
        value={value}
        min={min}
        max={max}
        reading={formatValue(value)}
        tone={tone}
      />
      <dl className="discern-standard-meter__facts">
        <div>
          <dt>Status</dt>
          <dd>{withinLimit ? "Within limit" : "Outside limit"}</dd>
        </div>
        <div>
          <dt>Limit</dt>
          <dd>{`${direction} ${formatValue(limit)}`}</dd>
        </div>
        <div>
          <dt>Direction</dt>
          <dd>{directionText}</dd>
        </div>
        <div>
          <dt>Headroom</dt>
          <dd>{headroomText}</dd>
        </div>
      </dl>
    </article>
  );
});
