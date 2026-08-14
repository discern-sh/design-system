import { forwardRef, useId } from "react";
import type { CSSProperties } from "react";
import { classNames } from "../../class-names.ts";
import type { DiscernComponent } from "../../component-type.ts";
import { Ground } from "../ground/ground.tsx";
import type { GroundProps } from "../ground/ground.tsx";

/** Grd. IV — the aperture. One triangular opening set off-centre, raking three unequal beams across the head of the page. */

/** One admitted beam: its body, its lit edge, and its own gradient run. */
interface ApertureBeam {
  readonly index: number;
  readonly accent: boolean;
  readonly lean: number;
  readonly offset: number;
  readonly points: string;
  readonly edge: {
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
  };
  readonly grad: {
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
  };
}

/** The opening's two edges, drawn as one path through the off-plate apex. */
const APERTURE_FRAME_PATH = "M 622.62 790 L 1210 -150 L 0 466.53";

/** The three beams: unequal in width, reach, and spacing. */
const APERTURE_BEAMS: readonly ApertureBeam[] = Object.freeze([{
  "index": 0,
  "accent": false,
  "lean": 0.5,
  "offset": 0,
  "points": "1011.77,126.35 549.37,829.7 450.34,755.08 998.99,116.72",
  "edge": { "x1": 1011.77, "y1": 126.35, "x2": 549.37, "y2": 829.7 },
  "grad": { "x1": 1005.38, "y1": 121.54, "x2": 499.86, "y2": 792.39 },
}, {
  "index": 1,
  "accent": true,
  "lean": -0.42,
  "offset": -28,
  "points": "972.32,93.47 463.66,690.59 331.5,551.32 954.42,74.61",
  "edge": { "x1": 972.32, "y1": 93.47, "x2": 463.66, "y2": 690.59 },
  "grad": { "x1": 963.37, "y1": 84.04, "x2": 397.58, "y2": 620.96 },
}, {
  "index": 2,
  "accent": false,
  "lean": 0.58,
  "offset": -56,
  "points": "928.12,40.21 409.89,417.29 366.32,350.2 921.58,30.15",
  "edge": { "x1": 928.12, "y1": 40.21, "x2": 409.89, "y2": 417.29 },
  "grad": { "x1": 924.85, "y1": 35.18, "x2": 388.1, "y2": 383.75 },
}]);

/** Props for the {@linkcode ApertureGround} component. */
export type ApertureGroundProps = Omit<GroundProps, "children">;

/** Off-centre triangular opening that admits three unequal beams. */
export const ApertureGround: DiscernComponent<
  HTMLDivElement,
  ApertureGroundProps
> = forwardRef<HTMLDivElement, ApertureGroundProps>(function ApertureGround(
  { className, ...props },
  ref,
) {
  const generatedId = useId().replaceAll(":", "");
  const gradientPrefix = `discern-aperture-${generatedId}`;

  return (
    <Ground
      ref={ref}
      className={classNames("discern-aperture-ground", className)}
      {...props}
    >
      <svg
        className="discern-ground__plate discern-aperture-ground__plate"
        viewBox="0 0 1600 760"
        preserveAspectRatio="xMidYMin slice"
        focusable="false"
      >
        <defs>
          {APERTURE_BEAMS.map((beam) => {
            const tone = beam.accent
              ? "var(--discern-ground-accent)"
              : "currentColor";
            const gradientId = `${gradientPrefix}-beam-${beam.index}`;
            return (
              <linearGradient
                key={beam.index}
                id={gradientId}
                gradientUnits="userSpaceOnUse"
                x1={beam.grad.x1}
                y1={beam.grad.y1}
                x2={beam.grad.x2}
                y2={beam.grad.y2}
              >
                <stop offset="0" stopColor={tone} stopOpacity="0" />
                <stop offset="0.14" stopColor={tone} stopOpacity="1" />
                <stop offset="0.58" stopColor={tone} stopOpacity="0.4" />
                <stop offset="1" stopColor={tone} stopOpacity="0" />
              </linearGradient>
            );
          })}
        </defs>
        {APERTURE_BEAMS.map((beam) => (
          <g
            key={beam.index}
            className={beam.accent
              ? "discern-aperture-ground__beam discern-aperture-ground__beam--accent"
              : "discern-aperture-ground__beam"}
            style={{
              "--discern-aperture-ground-offset": `${beam.offset}s`,
              "--discern-aperture-ground-lean": `${beam.lean}deg`,
            } as CSSProperties}
          >
            <polygon
              points={beam.points}
              fill={`url(#${gradientPrefix}-beam-${beam.index})`}
            />
            <line
              className="discern-aperture-ground__edge"
              x1={beam.edge.x1}
              y1={beam.edge.y1}
              x2={beam.edge.x2}
              y2={beam.edge.y2}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
        <path
          className="discern-aperture-ground__frame"
          d={APERTURE_FRAME_PATH}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </Ground>
  );
});
