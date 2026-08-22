import { forwardRef } from "react";
import { classNames } from "../../class-names.ts";
import type { DiscernComponent } from "../../component-type.ts";
import { Backdrop } from "../backdrop/backdrop.tsx";
import type { BackdropProps } from "../backdrop/backdrop.tsx";

/** Grd. VII — the cleave: one triangle larger than the page, and the two surfaces it leaves. */

/**
 * The triangle's vertices all lie outside the plate: only two of its edges
 * and its own median ever cross, so the figure reads as two surfaces meeting
 * rather than as a triangle. Everything is authored pre-rotated seven degrees
 * — no transform, nothing axis-aligned, and the resolved composition is the
 * markup.
 */
const CLEAVE_GEOMETRY = Object.freeze({
  /** The two halves the median leaves, filled at different weights. */
  left: "885.35,-578.06 -671.95,1426.67 1104.71,1208.52",
  right: "885.35,-578.06 1104.71,1208.52 2881.37,990.37",
  /** The two edges that cross the plate, through the off-plate apex. */
  edges: "M -671.95 1426.67 L 885.35 -578.06 L 2881.37 990.37",
  /** The median: the split the mark is named for, at hero scale. */
  split: Object.freeze({
    "x1": 885.35,
    "y1": -578.06,
    "x2": 1104.71,
    "y2": 1208.52,
  }),
});

/** Props for the {@linkcode CleaveBackdrop} component. */
export interface CleaveBackdropProps extends Omit<BackdropProps, "children"> {}

/** Oversized split geometry reduced to two surfaces, two edges, and a median. */
export const CleaveBackdrop: DiscernComponent<
  HTMLDivElement,
  CleaveBackdropProps
> = forwardRef<HTMLDivElement, CleaveBackdropProps>(function CleaveBackdrop(
  { className, ...props },
  ref,
) {
  return (
    <Backdrop
      ref={ref}
      className={classNames("discern-cleave-backdrop", className)}
      {...props}
    >
      <svg
        className="discern-backdrop__plate"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <polygon
          className="discern-cleave-backdrop__face discern-cleave-backdrop__face--left"
          points={CLEAVE_GEOMETRY.left}
        />
        <g className="discern-cleave-backdrop__inked">
          <polygon
            className="discern-cleave-backdrop__face discern-cleave-backdrop__face--right"
            points={CLEAVE_GEOMETRY.right}
          />
        </g>
        <path
          className="discern-cleave-backdrop__edge"
          d={CLEAVE_GEOMETRY.edges}
          vectorEffect="non-scaling-stroke"
        />
        <line
          className="discern-cleave-backdrop__split"
          x1={CLEAVE_GEOMETRY.split.x1}
          y1={CLEAVE_GEOMETRY.split.y1}
          x2={CLEAVE_GEOMETRY.split.x2}
          y2={CLEAVE_GEOMETRY.split.y2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </Backdrop>
  );
});
