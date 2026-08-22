import { forwardRef } from "react";
import type { CSSProperties } from "react";
import { classNames } from "../../class-names.ts";
import type { DiscernComponent } from "../../component-type.ts";
import { Backdrop } from "../backdrop/backdrop.tsx";
import type { BackdropProps } from "../backdrop/backdrop.tsx";

/** Grd. II — the approach. Nine triangles nested about one station in the right third, held still, with one accent moving between depths. */

/** One nested ring: its outline, and where its turn falls in the phrase. */
interface ApproachRing {
  readonly points: string;
  readonly offset: number;
}

/** The station point every ring and sightline is drawn about. */
const APPROACH_STATION = Object.freeze({ x: 1020, y: 372 });

/**
 * The nine authored rings, innermost first. The offsets follow an order that
 * never lights two neighbours in succession, so the accent reads as attention
 * moving between depths rather than a mark marching outward.
 */
const APPROACH_RINGS: readonly ApproachRing[] = Object.freeze([
  { "points": "1020,312 968.04,402 1071.96,402", "offset": 0 },
  { "points": "1020,292.8 951.41,411.6 1088.59,411.6", "offset": -48 },
  { "points": "1020,267.46 929.46,424.27 1110.54,424.27", "offset": -24 },
  { "points": "1020,234 900.49,441 1139.51,441", "offset": -72 },
  { "points": "1020,189.84 862.25,463.08 1177.75,463.08", "offset": -12 },
  { "points": "1020,131.55 811.77,492.22 1228.23,492.22", "offset": -60 },
  { "points": "1020,54.61 745.13,530.7 1294.87,530.7", "offset": -96 },
  { "points": "1020,-46.96 657.17,581.48 1382.83,581.48", "offset": -36 },
  { "points": "1020,-181.02 541.07,648.51 1498.93,648.51", "offset": -84 },
]);

/** The three sightlines from the station through the outermost vertices. */
const APPROACH_SIGHTLINES: readonly { x2: number; y2: number }[] = Object
  .freeze([{ "x2": 1020, "y2": -302.69 }, { "x2": 435.7, "y2": 709.34 }, {
    "x2": 1604.3,
    "y2": 709.34,
  }]);

/** Props for the {@linkcode ApproachBackdrop} component. */
export interface ApproachBackdropProps
  extends Omit<BackdropProps, "children"> {}

/** Nested right-anchored triangles whose accent moves between depths. */
export const ApproachBackdrop: DiscernComponent<
  HTMLDivElement,
  ApproachBackdropProps
> = forwardRef<HTMLDivElement, ApproachBackdropProps>(function ApproachBackdrop(
  { className, ...props },
  ref,
) {
  return (
    <Backdrop
      ref={ref}
      className={classNames("discern-approach-backdrop", className)}
      {...props}
    >
      <svg
        className="discern-backdrop__plate discern-approach-backdrop__plate"
        viewBox="0 0 1200 760"
        preserveAspectRatio="xMaxYMid slice"
        focusable="false"
      >
        <g className="discern-approach-backdrop__sightline">
          {APPROACH_SIGHTLINES.map((line, index) => (
            <line
              key={index}
              x1={APPROACH_STATION.x}
              y1={APPROACH_STATION.y}
              x2={line.x2}
              y2={line.y2}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
        {APPROACH_RINGS.map((ring, index) => (
          <polygon
            key={index}
            className="discern-approach-backdrop__ring"
            points={ring.points}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {APPROACH_RINGS.map((ring, index) => (
          <polygon
            key={index}
            className="discern-approach-backdrop__attend"
            style={{
              "--discern-approach-backdrop-offset": `${ring.offset}s`,
            } as CSSProperties}
            points={ring.points}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <g className="discern-approach-backdrop__station">
          <line
            x1={APPROACH_STATION.x - 6}
            y1={APPROACH_STATION.y}
            x2={APPROACH_STATION.x + 6}
            y2={APPROACH_STATION.y}
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={APPROACH_STATION.x}
            y1={APPROACH_STATION.y - 6}
            x2={APPROACH_STATION.x}
            y2={APPROACH_STATION.y + 6}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </svg>
    </Backdrop>
  );
});
