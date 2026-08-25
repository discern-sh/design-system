import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import {
  sparklineAnnotation,
  sparklineFractions,
  type SparklineValue,
} from "./sparkline.shared.ts";

/** Props for the {@linkcode Sparkline} component. */
export interface SparklineProps extends HTMLAttributes<HTMLSpanElement> {
  /** Recent movement in order: finite values with explicit null gaps. */
  readonly values: readonly SparklineValue[];
}

const VIEW_WIDTH = 100;
const VIEW_HEIGHT = 32;
const VIEW_PADDING = 3;

interface SparklineRun {
  readonly kind: "path" | "point";
  readonly key: string;
  readonly points: readonly { readonly x: number; readonly y: number }[];
}

function sparklineRuns(
  values: readonly SparklineValue[],
): readonly SparklineRun[] {
  const fractions = sparklineFractions(values);
  const innerHeight = VIEW_HEIGHT - VIEW_PADDING * 2;
  const step = values.length === 1 ? 0 : VIEW_WIDTH / (values.length - 1);
  const runs: SparklineRun[] = [];
  let current: { x: number; y: number }[] = [];
  const flush = (endIndex: number): void => {
    if (current.length === 0) return;
    runs.push({
      kind: current.length === 1 ? "point" : "path",
      key: `run-${endIndex - current.length}`,
      points: current,
    });
    current = [];
  };
  fractions.forEach((fraction, index) => {
    if (fraction === null) {
      flush(index);
      return;
    }
    current.push({
      x: index * step,
      y: VIEW_PADDING + (1 - fraction) * innerHeight,
    });
  });
  flush(values.length);
  return runs;
}

/**
 * Compact recent-movement graphic with its mandatory endpoint annotation.
 * The drawing is lossy by design — each sparkline scales to its own
 * extremes, so two sparklines are never comparable — and the annotation
 * text carries the numeric truth.
 */
export const Sparkline: DiscernComponent<HTMLSpanElement, SparklineProps> =
  forwardRef<HTMLSpanElement, SparklineProps>(
    function Sparkline({ values, className, ...props }, ref) {
      const runs = sparklineRuns(values);
      return (
        <span
          ref={ref}
          className={classNames("discern-sparkline", className)}
          {...props}
        >
          <svg
            className="discern-sparkline__graphic"
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {runs.map((run) =>
              run.kind === "point"
                ? (
                  <circle
                    key={run.key}
                    className="discern-sparkline__point"
                    cx={run.points[0]?.x}
                    cy={run.points[0]?.y}
                    r={2.5}
                  />
                )
                : (
                  <polyline
                    key={run.key}
                    className="discern-sparkline__path"
                    points={run.points.map(({ x, y }) => `${x},${y}`).join(
                      " ",
                    )}
                  />
                )
            )}
          </svg>
          <span className="discern-sparkline__annotation">
            {sparklineAnnotation(values, true)}
          </span>
        </span>
      );
    },
  );
