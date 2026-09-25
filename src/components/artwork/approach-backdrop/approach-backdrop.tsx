import { forwardRef, useId } from "react";
import type { CSSProperties, ReactNode } from "react";
import { classNames } from "../../class-names.ts";
import type { DiscernComponent } from "../../component-type.ts";
import { Backdrop } from "../backdrop/backdrop.tsx";
import type { BackdropProps } from "../backdrop/backdrop.tsx";

/**
 * Grd. II — the approach. Nine triangles nested about one station in the
 * right third, each 1.32 times the last, with three sightlines drawn from the
 * station through the outermost vertices. The station emits the figure ring
 * by ring, one wave of light runs back in to it, and the nest holds still.
 */

/** The station every ring and sightline is drawn about. */
const APPROACH_STATION = Object.freeze({ x: 1020, y: 372 });

/** Each ring's circumradius over the one inside it — and one step of drift,
 * because scaling the nest by it lands every ring on its neighbour. */
const APPROACH_RATIO = 1.32;

/** The innermost authored ring's circumradius. */
const APPROACH_INNER_RADIUS = 60;

/** The authored rings, counted from the station outward. */
const APPROACH_RING_COUNT = 9;

/** How far past the outermost vertex each sightline runs. */
const APPROACH_SIGHT_REACH = 1.22;

/** The wavefront the station emits, drawn at this circumradius and scaled. */
const APPROACH_FRONT_RADIUS = 100;

const HALF_ROOT_THREE = Math.sqrt(3) / 2;

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** An apex-up triangle of circumradius `radius` about the station. */
function trianglePath(radius: number): string {
  const { x, y } = APPROACH_STATION;
  const half = radius * HALF_ROOT_THREE;
  return `M${round(x)},${round(y - radius)} L${round(x + half)},${
    round(y + radius / 2)
  } L${round(x - half)},${round(y + radius / 2)} Z`;
}

/** One ring of the nest: its place in depth and its outline. */
interface ApproachRing {
  readonly index: number;
  readonly path: string;
}

/**
 * The rings, innermost first. Ring −1 is drawn only for drift: it waits one
 * step inside the station and is carried out to take ring 0's place.
 */
const APPROACH_RINGS: readonly ApproachRing[] = Object.freeze(
  Array.from({ length: APPROACH_RING_COUNT + 1 }, (_, slot) => {
    const index = slot - 1;
    return Object.freeze({
      index,
      path: trianglePath(APPROACH_INNER_RADIUS * APPROACH_RATIO ** index),
    });
  }),
);

/** The three sightlines from the station through the outermost vertices. */
const APPROACH_SIGHTLINES: readonly string[] = Object.freeze(
  [[0, -1], [HALF_ROOT_THREE, 0.5], [-HALF_ROOT_THREE, 0.5]].map(
    ([dx = 0, dy = 0]) => {
      const reach = APPROACH_INNER_RADIUS *
        APPROACH_RATIO ** (APPROACH_RING_COUNT - 1) * APPROACH_SIGHT_REACH;
      const { x, y } = APPROACH_STATION;
      return `M${x},${y} L${round(x + dx * reach)},${round(y + dy * reach)}`;
    },
  ),
);

const APPROACH_FRONT = trianglePath(APPROACH_FRONT_RADIUS);

/** Where the nest's depth reads from. */
export type ApproachBackdropDepth = "haze" | "lantern";

/** Which way continuous drift carries the nest. */
export type ApproachBackdropDrift = "in" | "out";

/** Props for the {@linkcode ApproachBackdrop} component. */
export interface ApproachBackdropProps extends Omit<BackdropProps, "children"> {
  /**
   * `haze` strengthens and thickens the nearer, outer rings; `lantern`
   * brightens the rings toward the station. Defaults to `haze`.
   */
  readonly depth?: ApproachBackdropDepth;
  /** Stack a faint fill inside every ring so the corridor deepens in steps. Defaults to true. */
  readonly terraces?: boolean;
  /** A soft light well at the station, in the ambient illumination role. Defaults to false. */
  readonly light?: boolean;
  /** Entrance: the station emits the figure, one ring at a time. Defaults to true. */
  readonly construct?: boolean;
  /** Entrance: the nest approaches from a distance and settles. Combines with `construct`. Defaults to false. */
  readonly arrive?: boolean;
  /** After the entrance, one wave of light runs in to the station. Defaults to true. */
  readonly signal?: boolean;
  /**
   * Keep the nest moving after its entrance: `in` gathers it into the station
   * and `out` carries it toward the reader, one ring-step at a time, without
   * end. Omitted, the figure holds still once its entrance ends. Motion that
   * never ends needs a way for the reader to pause it (WCAG 2.2.2).
   */
  readonly drift?: ApproachBackdropDrift;
  /** Beats of drift per ring-step. Defaults to 15, 36s at the default beat. */
  readonly driftBeats?: number;
  /** Dolly into the station and fade as the backdrop scrolls out of view. Defaults to false. */
  readonly dolly?: boolean;
}

type ApproachStyle = CSSProperties & {
  readonly "--discern-approach-backdrop-drift-beats"?: number;
};

/** Nested right-anchored triangles drawn out from one station and answered by a wave of light. */
export const ApproachBackdrop: DiscernComponent<
  HTMLDivElement,
  ApproachBackdropProps
> = forwardRef<HTMLDivElement, ApproachBackdropProps>(function ApproachBackdrop(
  {
    depth = "haze",
    terraces = true,
    light = false,
    construct = true,
    arrive = false,
    signal = true,
    drift,
    driftBeats,
    dolly = false,
    className,
    style,
    ...props
  },
  ref,
) {
  const rings = drift === undefined
    ? APPROACH_RINGS.filter(({ index }) => index >= 0)
    : APPROACH_RINGS;
  const approachStyle: ApproachStyle | undefined =
    drift !== undefined && driftBeats !== undefined
      ? { ...style, "--discern-approach-backdrop-drift-beats": driftBeats }
      : style;
  /** The camera every plate shares, from the outside in: the scroll dolly,
   * the arrival, and drift. */
  const camera = (children: ReactNode) => (
    <g className="discern-approach-backdrop__scroll">
      <g className="discern-approach-backdrop__arrive">
        <g className="discern-approach-backdrop__drift">{children}</g>
      </g>
    </g>
  );
  const ringStyle = (index: number) =>
    ({ "--discern-approach-backdrop-ring": index }) as CSSProperties;
  /** The emitted front's reach: the base plate shows only what it has
   * passed, in the plate's own coordinates. */
  const reachId = `discern-approach-${useId().replaceAll(":", "")}-reach`;

  return (
    <Backdrop
      ref={ref}
      className={classNames(
        "discern-approach-backdrop",
        depth === "lantern" && "discern-approach-backdrop--lantern",
        terraces && "discern-approach-backdrop--terraces",
        construct && "discern-approach-backdrop--construct",
        arrive && "discern-approach-backdrop--arrive",
        signal && "discern-approach-backdrop--signal",
        drift !== undefined && `discern-approach-backdrop--drift-${drift}`,
        dolly && "discern-approach-backdrop--dolly",
        className,
      )}
      style={approachStyle}
      {...props}
    >
      <div className="discern-approach-backdrop__stage">
        {light ? <div className="discern-approach-backdrop__light" /> : null}
        <svg
          className="discern-backdrop__plate discern-approach-backdrop__plate discern-approach-backdrop__plate--base"
          viewBox="0 0 1200 760"
          preserveAspectRatio="xMaxYMid slice"
          focusable="false"
        >
          {construct
            ? (
              <defs>
                <clipPath id={reachId}>
                  <path
                    className="discern-approach-backdrop__reach"
                    d={APPROACH_FRONT}
                  />
                </clipPath>
              </defs>
            )
            : null}
          <g clipPath={construct ? `url(#${reachId})` : undefined}>
            <g className="discern-approach-backdrop__sightlines">
              {APPROACH_SIGHTLINES.map((path) => (
                <path key={path} d={path} vectorEffect="non-scaling-stroke" />
              ))}
            </g>
            {camera(
              [...rings].reverse().map((ring) => (
                <g
                  key={ring.index}
                  className="discern-approach-backdrop__ring-set"
                  style={ringStyle(ring.index)}
                >
                  {terraces
                    ? (
                      <path
                        className="discern-approach-backdrop__terrace"
                        d={ring.path}
                      />
                    )
                    : null}
                  <path
                    className="discern-approach-backdrop__ring"
                    d={ring.path}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              )),
            )}
          </g>
        </svg>
        {construct || signal
          ? (
            <svg
              className="discern-backdrop__plate discern-approach-backdrop__plate discern-approach-backdrop__plate--signal"
              viewBox="0 0 1200 760"
              preserveAspectRatio="xMaxYMid slice"
              focusable="false"
            >
              {signal
                ? camera(
                  rings.filter(({ index }) => index >= 0).map((ring) => (
                    <g
                      key={ring.index}
                      className="discern-approach-backdrop__ring-set"
                      style={ringStyle(ring.index)}
                    >
                      <path
                        className="discern-approach-backdrop__bloom"
                        d={ring.path}
                        vectorEffect="non-scaling-stroke"
                      />
                      <path
                        className="discern-approach-backdrop__pulse"
                        d={ring.path}
                        vectorEffect="non-scaling-stroke"
                      />
                    </g>
                  )),
                )
                : null}
              {construct
                ? (
                  <path
                    className="discern-approach-backdrop__front"
                    d={APPROACH_FRONT}
                    vectorEffect="non-scaling-stroke"
                  />
                )
                : null}
            </svg>
          )
          : null}
      </div>
    </Backdrop>
  );
});
