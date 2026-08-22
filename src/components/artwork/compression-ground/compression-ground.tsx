/** Reusable fold artwork: a ticked ribbon concertina-folded at its middle. */

import { forwardRef } from "react";
import type { CSSProperties, ReactElement } from "react";
import { classNames } from "../../class-names.ts";
import type { DiscernComponent } from "../../component-type.ts";
import { Ground } from "../ground/ground.tsx";
import type { GroundProps } from "../ground/ground.tsx";

/** One cross-tick on a flat run, resolved to its place in the drift. */
interface CompressionTick {
  readonly x: number;
  /** Position along the whole ribbon, 0 at the head's outer end. */
  readonly order: number;
  /**
   * Whether this tick is a registration mark. A perfectly even comb slides
   * invisibly — one taller mark every few ticks is what lets the eye see the
   * flat runs travel, which is the whole claim the figure makes.
   */
  readonly major: boolean;
}

/** One crease: the turn the ribbon makes, and the arc that draws it. */
interface CompressionCrease {
  readonly x: number;
  readonly y: number;
  /** The arc alone, overdrawn in accent so the turn carries the colour. */
  readonly arc: string;
}

/** One end of the breath, and the slide it asks of each flat run. */
interface CompressionExtreme {
  readonly scaleX: number;
  readonly scaleY: number;
  readonly slide: number;
}

/** The single proportion authority for the whole plate. */
const COMPRESSION_GEOMETRY = Object.freeze({
  plate: Object.freeze({ width: 760, height: 540 }),
  /** The ribbon's axis, and the point the fold breathes about. */
  axis: Object.freeze({ x: 380, y: 270 }),
  /** Half the ribbon's own height, measured across its cross-ticks. */
  halfHeight: 17,
  /** Spacing between cross-ticks along the flat runs. */
  tickPitch: 13,
  /** Every so many ticks carries a taller registration mark. */
  majorEvery: 5,
  /** How much taller that mark stands than an ordinary tick. */
  majorScale: 1.45,
  /** How far the flat runs continue past the plate on either side. */
  reserve: 150,
  /** Creases in the concertina; an odd count keeps entry and exit alike. */
  creases: 17,
  /** Half the horizontal pitch between successive creases. */
  creaseHalfPitch: 11,
  /** Half the fold's authored height, crease row to crease row. */
  creaseRise: 150,
  /**
   * The radius of the turn at each crease, as a fraction of the half-pitch.
   * Below 1 the leaves still lean; at 1 they would stand exactly parallel.
   */
  turnRatio: 0.72,
  /** Seconds of the phrase the drift along the cross-ticks is spread over. */
  drift: 20,
});

const { axis, creases, creaseHalfPitch, creaseRise, tickPitch, reserve } =
  COMPRESSION_GEOMETRY;

/** Trim a derived coordinate to one decimal so the markup stays readable. */
function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Half the fold's authored width: the distance the flat runs answer to. */
const COMPRESSION_HALF_WIDTH = creases * creaseHalfPitch;

const COMPRESSION_START = axis.x - COMPRESSION_HALF_WIDTH;
const COMPRESSION_END = axis.x + COMPRESSION_HALF_WIDTH;
const HEAD_OUTER = -reserve;
const TAIL_OUTER = COMPRESSION_GEOMETRY.plate.width + reserve;
const RIBBON_SPAN = TAIL_OUTER - HEAD_OUTER;
const TURN = round(creaseHalfPitch * COMPRESSION_GEOMETRY.turnRatio);

/**
 * The two ends of the breath. `fold.css` animates between exactly these, and
 * each flat run translates by COMPRESSION_HALF_WIDTH * (1 - scaleX), so the
 * fold's edge and the flat run meeting it never part company. The derived
 * translations are passed to CSS with the scales below.
 */
const COMPRESSION_BREATH: Readonly<
  Record<"open" | "closed", CompressionExtreme>
> = Object.freeze({
  open: Object.freeze({
    scaleX: 1.25,
    scaleY: 0.94,
    slide: round(COMPRESSION_HALF_WIDTH * (1 - 1.25)),
  }),
  closed: Object.freeze({
    scaleX: 0.6,
    scaleY: 1.12,
    slide: round(COMPRESSION_HALF_WIDTH * (1 - 0.6)),
  }),
});

type CompressionPlateStyle = CSSProperties & {
  readonly "--discern-compression-ground-open-x": number;
  readonly "--discern-compression-ground-open-y": number;
  readonly "--discern-compression-ground-open-slide": string;
  readonly "--discern-compression-ground-closed-x": number;
  readonly "--discern-compression-ground-closed-y": number;
  readonly "--discern-compression-ground-closed-slide": string;
};

const COMPRESSION_PLATE_STYLE: CompressionPlateStyle = {
  "--discern-compression-ground-open-x": COMPRESSION_BREATH.open.scaleX,
  "--discern-compression-ground-open-y": COMPRESSION_BREATH.open.scaleY,
  "--discern-compression-ground-open-slide":
    `${COMPRESSION_BREATH.open.slide}px`,
  "--discern-compression-ground-closed-x": COMPRESSION_BREATH.closed.scaleX,
  "--discern-compression-ground-closed-y": COMPRESSION_BREATH.closed.scaleY,
  "--discern-compression-ground-closed-slide":
    `${COMPRESSION_BREATH.closed.slide}px`,
};

/**
 * The creases, alternating above and below the axis from the entry leaf. A
 * crease is a turn, not a corner: the ribbon runs up, comes round a half
 * circle and runs back down, so the two leaves meeting there stay a material
 * thickness apart the way folded paper does.
 */
const COMPRESSION_CREASES: readonly CompressionCrease[] = Object.freeze(
  Array.from({ length: creases }, (_, index): CompressionCrease => {
    const above = index % 2 === 0;
    const x = COMPRESSION_START + creaseHalfPitch * (1 + 2 * index);
    const y = axis.y + (above ? -creaseRise : creaseRise);
    const sweep = above ? 1 : 0;
    return Object.freeze({
      x,
      y,
      arc: `M ${x - TURN} ${y} A ${TURN} ${TURN} 0 0 ${sweep} ${x + TURN} ${y}`,
    });
  }),
);

/** The pleats: one path from the head's junction to the tail's. */
const COMPRESSION_PLEATS: string = [
  `M ${COMPRESSION_START} ${axis.y}`,
  ...COMPRESSION_CREASES.flatMap((crease) => [
    `L ${crease.x - TURN} ${crease.y}`,
    crease.arc.slice(crease.arc.indexOf("A")),
  ]),
  `L ${COMPRESSION_END} ${axis.y}`,
].join(" ");

/** One flat run's cross-ticks, laid outward from the fold's junction. */
function flatTicks(direction: 1 | -1): readonly CompressionTick[] {
  const first = direction === -1
    ? COMPRESSION_START - tickPitch / 2
    : COMPRESSION_END + tickPitch / 2;
  const outer = direction === -1 ? HEAD_OUTER : TAIL_OUTER;
  const count = Math.floor(Math.abs(first - outer) / tickPitch) + 1;
  return Object.freeze(
    Array.from({ length: count }, (_, index): CompressionTick => {
      const x = first + direction * index * tickPitch;
      return Object.freeze({
        x: round(x),
        order: (x - HEAD_OUTER) / RIBBON_SPAN,
        major: (index + 2) % COMPRESSION_GEOMETRY.majorEvery === 0,
      });
    }),
  );
}

const COMPRESSION_HEAD_TICKS: readonly CompressionTick[] = flatTicks(-1);
const COMPRESSION_TAIL_TICKS: readonly CompressionTick[] = flatTicks(1);

/** Convert a tick's place along the ribbon into its drift delay. */
function driftDelay(order: number): string {
  const offset = -(1 - order) * COMPRESSION_GEOMETRY.drift;
  return `${Math.round(offset * 1000) / 1000}s`;
}

/** One flat run: the ribbon's line, and the ticks that show it holds. */
function flatRun(
  className: string,
  outer: number,
  junction: number,
  ticks: readonly CompressionTick[],
): ReactElement {
  return (
    <g className={className}>
      <line
        className="discern-compression-ground__run"
        x1={outer}
        y1={axis.y}
        x2={junction}
        y2={axis.y}
        vectorEffect="non-scaling-stroke"
      />
      {ticks.map((tick) => {
        const reach = tick.major
          ? COMPRESSION_GEOMETRY.halfHeight * COMPRESSION_GEOMETRY.majorScale
          : COMPRESSION_GEOMETRY.halfHeight;
        return (
          <line
            key={tick.x}
            className={tick.major
              ? "discern-compression-ground__tick discern-compression-ground__tick--major"
              : "discern-compression-ground__tick"}
            x1={tick.x}
            y1={round(axis.y - reach)}
            x2={tick.x}
            y2={round(axis.y + reach)}
            vectorEffect="non-scaling-stroke"
            style={{ animationDelay: driftDelay(tick.order) }}
          />
        );
      })}
    </g>
  );
}

/** Props for the {@linkcode CompressionGround} component. */
export interface CompressionGroundProps extends Omit<GroundProps, "children"> {}

/**
 * Grd. X — compression. One ribbon crosses the plate: flat and ticked at both
 * ends, turned back on itself seventeen times at its middle. The fold
 * breathes, and the flat runs translate by exactly the width it gives up, so
 * the ribbon's length is conserved on the plate rather than asserted. The
 * authored SVG is the resolved mid-breath composition; the stylesheet supplies
 * only the compression and the drift.
 */
export const CompressionGround: DiscernComponent<
  HTMLDivElement,
  CompressionGroundProps
> = forwardRef<HTMLDivElement, CompressionGroundProps>(
  function CompressionGround(
    { className, ...props },
    ref,
  ) {
    return (
      <Ground
        ref={ref}
        className={classNames("discern-compression-ground", className)}
        {...props}
      >
        <svg
          className="discern-ground__plate"
          viewBox="0 0 760 540"
          preserveAspectRatio="xMidYMid slice"
          focusable="false"
          style={COMPRESSION_PLATE_STYLE}
        >
          <g aria-hidden="true">
            {flatRun(
              "discern-compression-ground__head",
              HEAD_OUTER,
              COMPRESSION_START,
              COMPRESSION_HEAD_TICKS,
            )}
            {flatRun(
              "discern-compression-ground__tail",
              TAIL_OUTER,
              COMPRESSION_END,
              COMPRESSION_TAIL_TICKS,
            )}

            <g className="discern-compression-ground__fold">
              <path
                className="discern-compression-ground__pleats"
                d={COMPRESSION_PLEATS}
                vectorEffect="non-scaling-stroke"
              />
              <g className="discern-compression-ground__creases">
                {COMPRESSION_CREASES.map((crease) => (
                  <path
                    key={crease.x}
                    d={crease.arc}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
            </g>
          </g>
        </svg>
      </Ground>
    );
  },
);
