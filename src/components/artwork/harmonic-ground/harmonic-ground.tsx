/** Reusable Harmonic artwork: grains migrating onto a plate's nodal lines. */

import { forwardRef } from "react";
import type { CSSProperties } from "react";
import { classNames } from "../../class-names.ts";
import type { DiscernComponent } from "../../component-type.ts";
import { Ground } from "../ground/ground.tsx";
import type { GroundProps } from "../ground/ground.tsx";

interface Point {
  readonly x: number;
  readonly y: number;
}

/** One vibrational mode of the square plate, as a pair of half-wave counts. */
interface HarmonicMode {
  readonly m: number;
  readonly n: number;
}

/** One grain, resolved to its three positions and its place in the phrase. */
interface HarmonicGrain {
  /** Authored position: this grain's node on mode A, in plate units. */
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  /** Offset from the authored position to the loose scatter. */
  readonly scattered: Point;
  /** Offset from the authored position to this grain's node on mode B. */
  readonly gathered: Point;
  /** Arrival lag, longest for the grains with furthest to travel. */
  readonly delay: string;
  /** Which tremble group carries this grain. */
  readonly phase: number;
}

/** One tremble group: a shared sub-pixel agitation at its own phase. */
interface HarmonicTremble {
  readonly dx: number;
  readonly dy: number;
  readonly delay: string;
}

/** The single proportion authority for the whole plate. */
const HARMONIC_GEOMETRY = Object.freeze({
  plate: Object.freeze({ width: 760, height: 540 }),
  /** The square plate, centred, occupying most of the plate's height. */
  side: 460,
  grains: 460,
  /**
   * Two modes of the square plate. Each is the symmetric combination of the
   * degenerate (m,n) and (n,m) product modes, which is what a real square
   * plate sounds; its nodal set is where that combination vanishes. The two
   * share a central ring, so the change of figure reads as one plate
   * resounding rather than two unrelated pictures.
   */
  modeA: Object.freeze({ m: 2, n: 4 }),
  modeB: Object.freeze({ m: 3, n: 5 }),
  /** The scatter is drawn from this seed, and everything else follows from it. */
  seed: 90210,
  /** Seeds for the two nearest-target matchings, kept apart from the scatter. */
  matchSeeds: Object.freeze([4711, 8123]),
  /**
   * Grains land on the nodal set by Newton descent, which crowds them into the
   * middle of each watershed and leaves the ridges dashed. These passes push
   * each grain along its own nodal line, away from its neighbours, and
   * re-project it — so the ridges read as an even deposit of powder.
   */
  relax: Object.freeze({ passes: 22, radius: 0.055, push: 0.011, reach: 3 }),
  /** How far a grain may sit off its nodal line, so a ridge has thickness. */
  ridge: 1.4,
  grain: Object.freeze({ radius: 0.95, vary: 0.3 }),
  /** Seconds of arrival lag between the first grain home and the last. */
  arrivalSpread: 1.6,
  /**
   * The agitation while the plate is driven. One oscillation per beat, in as
   * many phases as there are groups, so the field fizzes rather than pulsing
   * in unison. Amplitude is deliberately sub-pixel at plate scale.
   */
  tremble: Object.freeze({ amplitude: 0.42, phases: 8 }),
  /** The phrase, in seconds. Every delay below is a fraction of it. */
  phraseSeconds: 48,
  /** One beat, matching the series metre; also the tremble's period. */
  beatSeconds: 1.2,
});

const { side, grains: GRAIN_COUNT, relax, plate } = HARMONIC_GEOMETRY;
const ORIGIN: Point = Object.freeze({
  x: (plate.width - side) / 2,
  y: (plate.height - side) / 2,
});

/** Trim a derived coordinate to two decimals so the markup stays readable. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** The one random source, so the whole composition follows from the seed. */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return (): number => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * The mode function. Its zero set is the nodal set — the curves along which
 * the plate does not move, and so the only places powder can rest.
 */
function modeFunction(mode: HarmonicMode): (x: number, y: number) => number {
  const { m, n } = mode;
  return (x, y) =>
    Math.cos(m * Math.PI * x) * Math.cos(n * Math.PI * y) +
    Math.cos(n * Math.PI * x) * Math.cos(m * Math.PI * y);
}

type Field = (x: number, y: number) => number;

function gradient(field: Field, x: number, y: number): Point {
  const h = 1e-4;
  return {
    x: (field(x + h, y) - field(x - h, y)) / (2 * h),
    y: (field(x, y + h) - field(x, y - h)) / (2 * h),
  };
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/**
 * Walk a point onto the nearest nodal curve by Newton steps along the
 * gradient. This is the migration itself, in miniature: powder is driven off
 * the antinodes and comes to rest where the amplitude is zero.
 */
function project(field: Field, start: Point): Point {
  let { x, y } = start;
  for (let step = 0; step < 60; step += 1) {
    const value = field(x, y);
    if (Math.abs(value) < 1e-8) break;
    const g = gradient(field, x, y);
    const square = g.x * g.x + g.y * g.y;
    if (square < 1e-9) break;
    let nx = x - (value * g.x) / square;
    let ny = y - (value * g.y) / square;
    const travelled = Math.hypot(nx - x, ny - y);
    if (travelled > 0.05) {
      nx = x + ((nx - x) * 0.05) / travelled;
      ny = y + ((ny - y) * 0.05) / travelled;
    }
    x = clamp01(nx);
    y = clamp01(ny);
  }
  return { x, y };
}

/** A uniform bucket grid, so the relaxation stays linear in the grain count. */
function bucketed(
  points: readonly Point[],
  cell: number,
): Map<number, number[]> {
  const span = Math.max(1, Math.ceil(1 / cell));
  const buckets = new Map<number, number[]>();
  points.forEach((point, index) => {
    const key = Math.min(span - 1, Math.floor(point.x * span)) * span +
      Math.min(span - 1, Math.floor(point.y * span));
    const bucket = buckets.get(key);
    if (bucket === undefined) buckets.set(key, [index]);
    else bucket.push(index);
  });
  return buckets;
}

function neighbours(
  buckets: Map<number, number[]>,
  cell: number,
  at: Point,
): readonly number[] {
  const span = Math.max(1, Math.ceil(1 / cell));
  const cx = Math.min(span - 1, Math.floor(at.x * span));
  const cy = Math.min(span - 1, Math.floor(at.y * span));
  const out: number[] = [];
  for (let dx = -relax.reach; dx <= relax.reach; dx += 1) {
    for (let dy = -relax.reach; dy <= relax.reach; dy += 1) {
      const gx = cx + dx;
      const gy = cy + dy;
      if (gx < 0 || gy < 0 || gx >= span || gy >= span) continue;
      const bucket = buckets.get(gx * span + gy);
      if (bucket !== undefined) out.push(...bucket);
    }
  }
  return out;
}

/**
 * Spread grains along their nodal lines until the deposit is even. Each pass
 * pushes a grain tangentially away from its close neighbours, then re-projects
 * it onto the curve, so no grain ever leaves the nodal set.
 */
function relaxOnto(field: Field, start: readonly Point[]): readonly Point[] {
  const cell = relax.radius;
  let current = start.map((point) => project(field, point));
  for (let pass = 0; pass < relax.passes; pass += 1) {
    const buckets = bucketed(current, cell);
    const snapshot = current;
    current = current.map((point) => {
      const g = gradient(field, point.x, point.y);
      const length = Math.hypot(g.x, g.y) || 1;
      const tangent: Point = { x: -g.y / length, y: g.x / length };
      let force = 0;
      for (const index of neighbours(buckets, cell, point)) {
        const other = snapshot[index];
        if (other === undefined || other === point) continue;
        const dx = point.x - other.x;
        const dy = point.y - other.y;
        const distance = Math.hypot(dx, dy);
        if (distance > relax.radius || distance < 1e-9) continue;
        force += ((dx * tangent.x + dy * tangent.y) / distance) *
          (1 - distance / relax.radius);
      }
      const push = Math.max(
        -relax.push,
        Math.min(relax.push, force * relax.push),
      );
      return project(field, {
        x: clamp01(point.x + tangent.x * push),
        y: clamp01(point.y + tangent.y * push),
      });
    });
  }
  return current;
}

/**
 * Pair each source with its nearest unclaimed target, in a shuffled order.
 * Without this a grain would be handed an arbitrary node and would swim across
 * the whole plate; with it, every grain travels to somewhere near where it
 * already is, which is how powder actually moves.
 */
function matchNearest(
  source: readonly Point[],
  target: readonly Point[],
  seed: number,
): readonly number[] {
  const next = random(seed);
  const order = source.map((_, index) => index);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    const a = order[i];
    const b = order[j];
    if (a === undefined || b === undefined) continue;
    order[i] = b;
    order[j] = a;
  }
  const taken = new Array<boolean>(target.length).fill(false);
  const out = new Array<number>(source.length).fill(0);
  for (const index of order) {
    const from = source[index];
    if (from === undefined) continue;
    let best = -1;
    let bestDistance = Infinity;
    for (let j = 0; j < target.length; j += 1) {
      if (taken[j] === true) continue;
      const to = target[j];
      if (to === undefined) continue;
      const distance = (from.x - to.x) ** 2 + (from.y - to.y) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = j;
      }
    }
    if (best < 0) continue;
    taken[best] = true;
    out[index] = best;
  }
  return out;
}

/** The loose, even scatter the grains rest in between modes. */
function evenScatter(count: number, next: () => number): readonly Point[] {
  const columns = Math.ceil(Math.sqrt(count * 1.05));
  const rows = Math.ceil(count / columns);
  const out: Point[] = [];
  for (let row = 0; row < rows && out.length < count; row += 1) {
    for (let column = 0; column < columns && out.length < count; column += 1) {
      out.push({
        x: 0.03 + 0.94 * ((column + 0.5 + 0.95 * (next() - 0.5)) / columns),
        y: 0.03 + 0.94 * ((row + 0.5 + 0.95 * (next() - 0.5)) / rows),
      });
    }
  }
  return out;
}

function toPlate(point: Point): Point {
  return {
    x: ORIGIN.x + point.x * side,
    y: ORIGIN.y + point.y * side,
  };
}

const NEXT = random(HARMONIC_GEOMETRY.seed);
const SCATTER = evenScatter(GRAIN_COUNT, NEXT);
const NODES_A = relaxOnto(modeFunction(HARMONIC_GEOMETRY.modeA), SCATTER);
const NODES_B = relaxOnto(modeFunction(HARMONIC_GEOMETRY.modeB), SCATTER);
const A_TO_SCATTER = matchNearest(
  NODES_A,
  SCATTER,
  HARMONIC_GEOMETRY.matchSeeds[0] ?? 1,
);
const SCATTER_TO_B = matchNearest(
  SCATTER,
  NODES_B,
  HARMONIC_GEOMETRY.matchSeeds[1] ?? 2,
);

/**
 * Every grain, resolved. The authored position is its node on mode A, so the
 * composition with animation disabled is a finished figure rather than a
 * scatter waiting to be driven.
 */
const HARMONIC_GRAINS: readonly HarmonicGrain[] = Object.freeze(
  NODES_A.map((node, index): HarmonicGrain => {
    const scatterIndex = A_TO_SCATTER[index] ?? index;
    const scatter = SCATTER[scatterIndex] ?? node;
    const gathered = NODES_B[SCATTER_TO_B[scatterIndex] ?? index] ?? node;

    // A grain sits a little off its line, so a ridge has thickness.
    const field = modeFunction(HARMONIC_GEOMETRY.modeA);
    const g = gradient(field, node.x, node.y);
    const length = Math.hypot(g.x, g.y) || 1;
    const offset = (NEXT() - 0.5) * 2 * HARMONIC_GEOMETRY.ridge;

    const home = toPlate(node);
    const loose = toPlate(scatter);
    const away = toPlate(gathered);
    const x = home.x + (g.x / length) * offset;
    const y = home.y + (g.y / length) * offset;

    const journey = Math.hypot(loose.x - x, loose.y - y) +
      Math.hypot(away.x - loose.x, away.y - loose.y);
    const reach = side * 1.4;
    const lag = Math.min(1, journey / reach) * HARMONIC_GEOMETRY.arrivalSpread;

    return Object.freeze({
      x: round(x),
      y: round(y),
      radius: round(
        HARMONIC_GEOMETRY.grain.radius +
          (NEXT() - 0.5) * HARMONIC_GEOMETRY.grain.vary,
      ),
      scattered: Object.freeze({
        x: round(loose.x - x),
        y: round(loose.y - y),
      }),
      gathered: Object.freeze({
        x: round(away.x - x),
        y: round(away.y - y),
      }),
      delay: `${Math.round(lag * 1000) / 1000}s`,
      phase: index % HARMONIC_GEOMETRY.tremble.phases,
    });
  }),
);

/**
 * The tremble groups. Grains are handed out round-robin, so each group's
 * members are scattered across the whole plate and their shared phase is
 * invisible; what reads is a field of grains agitating out of step.
 */
const HARMONIC_TREMBLES: readonly HarmonicTremble[] = Object.freeze(
  Array.from(
    { length: HARMONIC_GEOMETRY.tremble.phases },
    (_, index): HarmonicTremble => {
      const angle = (index / HARMONIC_GEOMETRY.tremble.phases) * Math.PI * 2 +
        0.4;
      return Object.freeze({
        dx: round(Math.cos(angle) * HARMONIC_GEOMETRY.tremble.amplitude),
        dy: round(Math.sin(angle) * HARMONIC_GEOMETRY.tremble.amplitude),
        delay: `${
          -Math.round(
            (index / HARMONIC_GEOMETRY.tremble.phases) *
              HARMONIC_GEOMETRY.beatSeconds * 1000,
          ) / 1000
        }s`,
      });
    },
  ),
);

interface GrainStyle extends CSSProperties {
  readonly "--discern-harmonic-ground-sx": string;
  readonly "--discern-harmonic-ground-sy": string;
  readonly "--discern-harmonic-ground-bx": string;
  readonly "--discern-harmonic-ground-by": string;
}

interface TrembleStyle extends CSSProperties {
  readonly "--discern-harmonic-ground-tx": string;
  readonly "--discern-harmonic-ground-ty": string;
}

function grainStyle(grain: HarmonicGrain): GrainStyle {
  return {
    animationDelay: grain.delay,
    "--discern-harmonic-ground-sx": `${grain.scattered.x}px`,
    "--discern-harmonic-ground-sy": `${grain.scattered.y}px`,
    "--discern-harmonic-ground-bx": `${grain.gathered.x}px`,
    "--discern-harmonic-ground-by": `${grain.gathered.y}px`,
  };
}

function trembleStyle(tremble: HarmonicTremble): TrembleStyle {
  return {
    animationDelay: tremble.delay,
    "--discern-harmonic-ground-tx": `${tremble.dx}px`,
    "--discern-harmonic-ground-ty": `${tremble.dy}px`,
  };
}

/** Props for the {@linkcode HarmonicGround} component. */
export interface HarmonicGroundProps extends Omit<GroundProps, "children"> {}

/**
 * Grd. XI — harmonic. A square plate carrying four hundred and sixty fine
 * grains. Driven, the grains migrate off the antinodes and collect along the
 * nodal lines of one of the plate's modes, and a figure nobody drew becomes
 * visible; the plate then resounds on a second mode and a different figure
 * appears. Every position is derived from the mode function, so both figures
 * are physically true and correctly symmetric, and the composition exists only
 * as the grains — nothing is drawn between them.
 */
export const HarmonicGround: DiscernComponent<
  HTMLDivElement,
  HarmonicGroundProps
> = forwardRef<HTMLDivElement, HarmonicGroundProps>(function HarmonicGround(
  { className, ...props },
  ref,
) {
  return (
    <Ground
      ref={ref}
      className={classNames("discern-harmonic-ground", className)}
      {...props}
    >
      <svg
        className="discern-ground__plate"
        viewBox="0 0 760 540"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <g aria-hidden="true">
          <rect
            className="discern-harmonic-ground__plate"
            x={ORIGIN.x}
            y={ORIGIN.y}
            width={side}
            height={side}
            vectorEffect="non-scaling-stroke"
          />

          <g className="discern-harmonic-ground__field">
            {HARMONIC_TREMBLES.map((tremble, phase) => (
              <g
                key={phase}
                className="discern-harmonic-ground__tremble"
                style={trembleStyle(tremble)}
              >
                {HARMONIC_GRAINS.filter((grain) => grain.phase === phase).map((
                  grain,
                ) => (
                  <circle
                    key={`${grain.x},${grain.y}`}
                    className="discern-harmonic-ground__grain"
                    cx={grain.x}
                    cy={grain.y}
                    r={grain.radius}
                    style={grainStyle(grain)}
                  />
                ))}
              </g>
            ))}
          </g>

          <circle
            className="discern-harmonic-ground__driver"
            cx={plate.width / 2}
            cy={plate.height / 2}
            r={2.1}
          />
        </g>
      </svg>
    </Ground>
  );
});
