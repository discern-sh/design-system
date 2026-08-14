import { forwardRef } from "react";
import { classNames } from "../../class-names.ts";
import type { DiscernComponent } from "../../component-type.ts";
import { Ground } from "../ground/ground.tsx";
import type { GroundProps } from "../ground/ground.tsx";

/** Grd. VIII — resonance: two remote wave fields and the contour they hold in common. */

interface ResonanceField {
  readonly name: "west" | "east";
  readonly cx: number;
  readonly cy: number;
  readonly radii: readonly number[];
  readonly coupledRadius: number;
}

/**
 * The sources sit beyond opposite sides of the plate. Their intervals differ
 * by twenty units, so the crossings never settle into a mechanically even
 * grid. One circle from each field meets just beyond the top edge and just
 * inside the lower edge; those two arcs make the shared lens below.
 */
const RESONANCE_FIELDS: readonly ResonanceField[] = Object.freeze([{
  name: "west",
  cx: -150,
  cy: 520,
  radii: [280, 410, 540, 670, 800, 930, 1060, 1190, 1320, 1450, 1580],
  coupledRadius: 1060,
}, {
  name: "east",
  cx: 1750,
  cy: 340,
  radii: [260, 390, 520, 650, 780, 910, 1040, 1170, 1300, 1430, 1560],
  coupledRadius: 1040,
}]);

/**
 * The exact minor-arc intersection of the coupled circles. The two arcs
 * close into a slender lens: neither source owns it, but both describe it.
 */
const RESONANCE_CONTOUR =
  "M 769.64 -7.13 A 1060 1060 0 0 1 852.27 865.05 A 1040 1040 0 0 1 769.64 -7.13 Z";

/** Props for the {@linkcode ResonanceGround} component. */
export interface ResonanceGroundProps extends Omit<GroundProps, "children"> {}

/** Two distant wave fields joined by one slowly travelling interval. */
export const ResonanceGround: DiscernComponent<
  HTMLDivElement,
  ResonanceGroundProps
> = forwardRef<HTMLDivElement, ResonanceGroundProps>(function ResonanceGround(
  { className, ...props },
  ref,
) {
  return (
    <Ground
      ref={ref}
      className={classNames("discern-resonance-ground", className)}
      {...props}
    >
      <svg
        className="discern-ground__plate"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        {RESONANCE_FIELDS.map((field) => (
          <g
            key={field.name}
            className={classNames(
              "discern-resonance-ground__field",
              field.name === "east" &&
                "discern-resonance-ground__field--east",
            )}
          >
            {field.radii.map((radius, index) => (
              <circle
                key={radius}
                className={classNames(
                  "discern-resonance-ground__wave",
                  index % 4 === 2 &&
                    "discern-resonance-ground__wave--measure",
                  radius === field.coupledRadius &&
                    "discern-resonance-ground__wave--coupled",
                )}
                cx={field.cx}
                cy={field.cy}
                r={radius}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        ))}
        <path
          className="discern-resonance-ground__well"
          d={RESONANCE_CONTOUR}
        />
        <path
          className="discern-resonance-ground__contour"
          d={RESONANCE_CONTOUR}
          vectorEffect="non-scaling-stroke"
        />
        <path
          className="discern-resonance-ground__interval"
          d={RESONANCE_CONTOUR}
          pathLength={100}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </Ground>
  );
});
