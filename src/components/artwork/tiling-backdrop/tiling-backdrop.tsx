/** Reusable tiling artwork: a Truchet field whose traced route re-routes. */

import { forwardRef } from "react";
import { classNames } from "../../class-names.ts";
import type { DiscernComponent } from "../../component-type.ts";
import { Backdrop } from "../backdrop/backdrop.tsx";
import type { BackdropProps } from "../backdrop/backdrop.tsx";

interface Point {
  readonly x: number;
  readonly y: number;
}

/** One edge midpoint of the lattice: the only place arcs ever meet. */
interface Edge {
  readonly axis: "v" | "h";
  readonly i: number;
  readonly j: number;
}

interface Tile {
  readonly column: number;
  readonly row: number;
}

/** One tile that turns, with its authored arcs and its place in the schedule. */
interface TilingTurner {
  readonly column: number;
  readonly row: number;
  readonly arcs: readonly string[];
  readonly turnDelay: string;
  readonly washDelay: string;
  /**
   * The rotation the tile stands at during the rest stage, declared statically
   * so the stilled figure matches the frame its rest-stage arcs were authored
   * in. A running animation outranks it; killing the animation reveals it.
   */
  readonly restTransform: string;
  /** The route's own arcs through this tile, carried inside it so they turn
   * with it rather than doubling up against it mid-turn. */
  readonly traced: readonly TilingTracedArc[];
}

/** One arc of the route that falls inside a turning tile, in that tile's
 * authored frame: the group's rotation carries it to where it belongs. */
interface TilingTracedArc {
  readonly arc: string;
  readonly delay: string;
  readonly rest: boolean;
}

/** The traced route for one stage of the phrase. */
interface TilingStage {
  readonly route: string;
  readonly delay: string;
  /** Whether this stage's tiling is the authored one, shown when still. */
  readonly rest: boolean;
}

/** The single proportion authority for the whole plate. */
const TILING_GEOMETRY = Object.freeze({
  plate: Object.freeze({ width: 760, height: 540 }),
  columns: 14,
  rows: 10,
  tile: 54,
  /** Centres the 756-wide lattice on the 760-wide plate. */
  origin: Object.freeze({ x: 2, y: 0 }),
  /**
   * The field is drawn from this seed, not composed. Changing it changes the
   * pattern and every route with it; the turning tiles below were chosen to
   * sit on this seed's route, well separated.
   */
  seed: 435545,
  /** The route is always traced from here, so it re-routes rather than jumps. */
  anchor: Object.freeze({ column: 13, row: 4 }),
  /** The tiles that turn, in the order they take their delays. */
  turning: Object.freeze([
    Object.freeze({ column: 11, row: 3 }),
    Object.freeze({ column: 7, row: 2 }),
    Object.freeze({ column: 3, row: 2 }),
    Object.freeze({ column: 4, row: 7 }),
  ]),
  /**
   * Quarter-turns per tile per phrase. Two is enough to close the loop: a
   * Truchet tile has two-fold symmetry, so 180 degrees is the identity.
   */
  turnsPerTile: 2,
  /** Where in its own animation each of those turns lands. */
  turnOffsets: Object.freeze([0.125, 0.625]),
  /** The phrase, in seconds. Every delay below is a fraction of it. */
  phraseSeconds: 48,
});

const { columns, rows, tile, origin } = TILING_GEOMETRY;
const RADIUS = tile / 2;

/** Turns in the phrase, and so stages of the route between them. */
const TILING_STAGE_COUNT = TILING_GEOMETRY.turning.length *
  TILING_GEOMETRY.turnsPerTile;

const STAGE_SECONDS = TILING_GEOMETRY.phraseSeconds / TILING_STAGE_COUNT;

/** Trim a derived coordinate to one decimal so the markup stays readable. */
function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/** The authored tiling: one of two orientations per tile, from the seed. */
const BASE_TYPES: readonly number[] = Object.freeze((() => {
  let state = TILING_GEOMETRY.seed >>> 0;
  const out: number[] = [];
  for (let index = 0; index < columns * rows; index += 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    out.push(state / 4294967296 < 0.5 ? 0 : 1);
  }
  return out;
})());

function typeAt(types: readonly number[], tileAt: Tile): number {
  const value = types[tileAt.row * columns + tileAt.column];
  return value === undefined ? 0 : value;
}

function edgeKey(edge: Edge): string {
  return `${edge.axis}:${edge.i}:${edge.j}`;
}

function edgePoint(edge: Edge): Point {
  return edge.axis === "v"
    ? { x: origin.x + edge.i * tile, y: origin.y + edge.j * tile + RADIUS }
    : { x: origin.x + edge.i * tile + RADIUS, y: origin.y + edge.j * tile };
}

function north(at: Tile): Edge {
  return { axis: "h", i: at.column, j: at.row };
}

function south(at: Tile): Edge {
  return { axis: "h", i: at.column, j: at.row + 1 };
}

function west(at: Tile): Edge {
  return { axis: "v", i: at.column, j: at.row };
}

function east(at: Tile): Edge {
  return { axis: "v", i: at.column + 1, j: at.row };
}

/**
 * The rule, stated once: two quarter-arcs joining the midpoints of adjacent
 * edges. Orientation 0 turns about the top-left and bottom-right corners,
 * orientation 1 about the other two. Because every arc meets every edge at
 * that edge's midpoint, arcs join across every tile boundary whatever the
 * orientations are — which is why turning a tile can never break a route.
 */
function pairs(at: Tile, type: number): readonly (readonly [Edge, Edge])[] {
  return type === 0
    ? [[north(at), west(at)], [south(at), east(at)]]
    : [[north(at), east(at)], [south(at), west(at)]];
}

function partner(at: Tile, type: number, edge: Edge): Edge | null {
  const key = edgeKey(edge);
  for (const [a, b] of pairs(at, type)) {
    if (edgeKey(a) === key) return b;
    if (edgeKey(b) === key) return a;
  }
  return null;
}

/** The tile on the far side of an edge, or null at the plate's boundary. */
function across(at: Tile, edge: Edge): Tile | null {
  const key = edgeKey(edge);
  if (key === edgeKey(west(at))) {
    return at.column === 0 ? null : { column: at.column - 1, row: at.row };
  }
  if (key === edgeKey(east(at))) {
    return at.column === columns - 1
      ? null
      : { column: at.column + 1, row: at.row };
  }
  if (key === edgeKey(north(at))) {
    return at.row === 0 ? null : { column: at.column, row: at.row - 1 };
  }
  if (key === edgeKey(south(at))) {
    return at.row === rows - 1 ? null : { column: at.column, row: at.row + 1 };
  }
  return null;
}

/** The corner one arc turns about: every pairing joins one h edge to one v. */
function corner(at: Tile, a: Edge, b: Edge): Point {
  const horizontal = a.axis === "h" ? a : b;
  const vertical = a.axis === "v" ? a : b;
  return {
    x: origin.x + (vertical.i === at.column ? at.column : at.column + 1) * tile,
    y: origin.y + (horizontal.j === at.row ? at.row : at.row + 1) * tile,
  };
}

/** A quarter turn is clockwise on the plate when the cross product is positive. */
function arcTo(from: Point, to: Point, centre: Point): string {
  const cross = (from.x - centre.x) * (to.y - centre.y) -
    (from.y - centre.y) * (to.x - centre.x);
  return `A ${RADIUS} ${RADIUS} 0 0 ${cross > 0 ? 1 : 0} ${round(to.x)} ${
    round(to.y)
  }`;
}

function arcPath(at: Tile, a: Edge, b: Edge): string {
  const from = edgePoint(a);
  const to = edgePoint(b);
  return `M ${round(from.x)} ${round(from.y)} ${
    arcTo(from, to, corner(at, a, b))
  }`;
}

interface Step {
  readonly at: Tile;
  readonly from: Edge;
  readonly to: Edge;
}

/**
 * Follow one route from the anchor until it leaves the plate. The route is not
 * chosen for its length: it is whatever the rule gives from a fixed entry, so
 * when a tile on its course turns it finds a different way across rather than
 * appearing somewhere else.
 */
function traceRoute(types: readonly number[]): readonly Step[] {
  const steps: Step[] = [];
  const seen = new Set<string>();
  let at: Tile = {
    column: TILING_GEOMETRY.anchor.column,
    row: TILING_GEOMETRY.anchor.row,
  };
  let edge: Edge = east(at);
  for (let guard = 0; guard < columns * rows * 2 + 8; guard += 1) {
    const mark = `${at.column},${at.row},${edgeKey(edge)}`;
    if (seen.has(mark)) break;
    seen.add(mark);
    const out = partner(at, typeAt(types, at), edge);
    if (out === null) break;
    steps.push({ at, from: edge, to: out });
    const next = across(at, out);
    if (next === null) break;
    at = next;
    edge = out;
  }
  return steps;
}

/** When each of a tile's turns lands on its own clock, in seconds. */
const TURN_SECONDS: readonly number[] = Object.freeze(
  TILING_GEOMETRY.turnOffsets.map((offset) =>
    offset * TILING_GEOMETRY.phraseSeconds
  ),
);

/**
 * How many quarter-turns each tile stands from its authored orientation during
 * one stage, read straight off the schedule the stylesheet runs: a tile's own
 * clock is the phrase advanced by its delay, and it holds at none, one or two
 * quarter-turns. This has to be derived rather than accumulated from a
 * standing start — the tiles carrying the largest delays have already turned
 * once by the time the phrase begins, and a route traced against the authored
 * field would run on connections those tiles had turned away from.
 *
 * The count matters, not just its parity: two quarter-turns leave the tile's
 * connectivity unchanged but swap its two arcs between opposite quadrants, so
 * an accent arc handed back into the tile's frame has to be un-rotated by the
 * real count or it lands on the other arc.
 */
function quartersDuring(stage: number): readonly number[] {
  const sample = (stage + 0.5) * STAGE_SECONDS;
  const first = TURN_SECONDS[0] ?? 0;
  const second = TURN_SECONDS[1] ?? 0;
  return TILING_GEOMETRY.turning.map((_, index) => {
    const local = (sample + index * STAGE_SECONDS) %
      TILING_GEOMETRY.phraseSeconds;
    if (local < first) return 0;
    return local < second ? 1 : 2;
  });
}

/** The tiling in force during one stage: the authored field plus its turns. */
function stageTypes(stage: number): readonly number[] {
  const types = BASE_TYPES.slice();
  quartersDuring(stage).forEach((quarters, index) => {
    if (quarters % 2 === 0) return;
    const turner = TILING_GEOMETRY.turning[index];
    if (turner === undefined) return;
    const slot = turner.row * columns + turner.column;
    const current = types[slot];
    if (current === undefined) return;
    types[slot] = 1 - current;
  });
  return types;
}

/** The one stage in which no tile stands turned: the field as authored. */
const TILING_REST_STAGE = (() => {
  for (let stage = 0; stage < TILING_STAGE_COUNT; stage += 1) {
    if (quartersDuring(stage).every((quarters) => quarters % 2 === 0)) {
      return stage;
    }
  }
  return TILING_STAGE_COUNT - 1;
})();

/** How far each turning tile stands turned in the stage shown when still. */
const REST_QUARTERS: readonly number[] = quartersDuring(TILING_REST_STAGE);

/** Where a stage sits in the phrase. A negative delay advances the local
 * clock, so stage k must be pulled back by the whole phrase less its own
 * start — otherwise the stages hand over in reverse and the route runs on
 * connections the tiles have already turned away from. */
function stageDelay(stage: number): string {
  const back = (TILING_STAGE_COUNT - stage) % TILING_STAGE_COUNT;
  return `${-round(back * STAGE_SECONDS)}s`;
}

/** Where a column sits in the wash that crosses the field once per phrase. */
function washDelay(column: number): string {
  return `${-round((column / columns) * TILING_GEOMETRY.phraseSeconds)}s`;
}

const TURNING_KEYS = new Set(
  TILING_GEOMETRY.turning.map((at) => `${at.column},${at.row}`),
);

const TURNING_INDEX = new Map(
  TILING_GEOMETRY.turning.map((at, index): readonly [string, number] =>
    [`${at.column},${at.row}`, index] as const
  ),
);

function tileCentre(at: Tile): Point {
  return {
    x: origin.x + (at.column + 0.5) * tile,
    y: origin.y + (at.row + 0.5) * tile,
  };
}

/** Take a point back out of a turned tile's frame into its authored one. */
function unturn(at: Point, centre: Point, quarters: number): Point {
  let out = at;
  for (let turn = 0; turn < quarters; turn += 1) {
    out = {
      x: centre.x + (out.y - centre.y),
      y: centre.y - (out.x - centre.x),
    };
  }
  return out;
}

interface StageBuild {
  readonly route: string;
  readonly traced: readonly { readonly tile: number; readonly arc: string }[];
}

/**
 * One stage's route, split at the tiles that turn. The arcs crossing a still
 * tile go into the stage's own path; the arcs crossing a turning tile are
 * handed to that tile, in its authored frame, so its rotation carries them.
 * Without that split the route would sit on the connection the tile is leaving
 * while the tile itself rotates away, and the two would read as doubled lines
 * for the whole turn.
 */
function buildStage(stage: number): StageBuild {
  const quarters = quartersDuring(stage);
  const parts: string[] = [];
  const traced: { tile: number; arc: string }[] = [];
  let open = false;
  for (const step of traceRoute(stageTypes(stage))) {
    const index = TURNING_INDEX.get(`${step.at.column},${step.at.row}`);
    const from = edgePoint(step.from);
    const to = edgePoint(step.to);
    const centre = corner(step.at, step.from, step.to);
    if (index === undefined) {
      if (!open) {
        parts.push(`M ${round(from.x)} ${round(from.y)}`);
        open = true;
      }
      parts.push(arcTo(from, to, centre));
      continue;
    }
    open = false;
    const turns = quarters[index] ?? 0;
    const pivot = tileCentre(step.at);
    const a = unturn(from, pivot, turns);
    const b = unturn(to, pivot, turns);
    const k = unturn(centre, pivot, turns);
    traced.push({
      tile: index,
      arc: `M ${round(a.x)} ${round(a.y)} ${arcTo(a, b, k)}`,
    });
  }
  return Object.freeze({
    route: parts.join(" "),
    traced: Object.freeze(traced),
  });
}

const STAGE_BUILDS: readonly StageBuild[] = Object.freeze(
  Array.from({ length: TILING_STAGE_COUNT }, (_, stage) => buildStage(stage)),
);

/** The quiet field, one path per column so the wash can cross it. */
const TILING_COLUMNS: readonly string[] = Object.freeze(
  Array.from({ length: columns }, (_, column) => {
    const out: string[] = [];
    for (let row = 0; row < rows; row += 1) {
      if (TURNING_KEYS.has(`${column},${row}`)) continue;
      const at: Tile = { column, row };
      for (const [a, b] of pairs(at, typeAt(BASE_TYPES, at))) {
        out.push(arcPath(at, a, b));
      }
    }
    return out.join(" ");
  }),
);

/** The turning tiles, lifted out of the field so they can rotate alone. */
const TILING_TURNERS: readonly TilingTurner[] = Object.freeze(
  TILING_GEOMETRY.turning.map((at, index): TilingTurner =>
    Object.freeze({
      column: at.column,
      row: at.row,
      arcs: Object.freeze(
        pairs(at, typeAt(BASE_TYPES, at)).map(([a, b]) => arcPath(at, a, b)),
      ),
      turnDelay: `${-round(index * STAGE_SECONDS)}s`,
      washDelay: washDelay(at.column),
      restTransform: `rotate(${(REST_QUARTERS[index] ?? 0) * 90}deg)`,
      traced: Object.freeze(
        STAGE_BUILDS.flatMap((build, stage) =>
          build.traced
            .filter((entry) => entry.tile === index)
            .map((entry): TilingTracedArc =>
              Object.freeze({
                arc: entry.arc,
                delay: stageDelay(stage),
                rest: stage === TILING_REST_STAGE,
              })
            )
        ),
      ),
    })
  ),
);

/** The route as the plate holds it between one turn and the next. */
const TILING_STAGES: readonly TilingStage[] = Object.freeze(
  STAGE_BUILDS.map((build, stage): TilingStage =>
    Object.freeze({
      route: build.route,
      delay: stageDelay(stage),
      rest: stage === TILING_REST_STAGE,
    })
  ),
);

/** Props for the {@linkcode TilingBackdrop} component. */
export interface TilingBackdropProps extends Omit<BackdropProps, "children"> {}

/**
 * Grd. IX — the tiling. One hundred and forty square tiles, each carrying two
 * quarter-arcs that join the midpoints of adjacent edges, at one of two
 * orientations drawn from a seed. Because every arc meets every edge at the
 * same point, the arcs join across every boundary into long continuous routes.
 * Four tiles turn a quarter turn at unrelated moments; connectivity survives
 * every turn, and the one traced route finds a different way across the field.
 * The authored SVG is the resolved field with its route already traced.
 */
export const TilingBackdrop: DiscernComponent<
  HTMLDivElement,
  TilingBackdropProps
> = forwardRef<HTMLDivElement, TilingBackdropProps>(function TilingBackdrop(
  { className, ...props },
  ref,
) {
  return (
    <Backdrop
      ref={ref}
      className={classNames("discern-tiling-backdrop", className)}
      {...props}
    >
      <svg
        className="discern-backdrop__plate"
        viewBox="0 0 760 540"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <g aria-hidden="true">
          <g className="discern-tiling-backdrop__field">
            {TILING_COLUMNS.map((path, column) => (
              <path
                key={column}
                className="discern-tiling-backdrop__column"
                d={path}
                vectorEffect="non-scaling-stroke"
                style={{ animationDelay: washDelay(column) }}
              />
            ))}
          </g>

          {TILING_TURNERS.map((turner) => (
            <g
              key={`${turner.column},${turner.row}`}
              className="discern-tiling-backdrop__tile"
              style={{
                transform: turner.restTransform,
                animationDelay: turner.turnDelay,
              }}
            >
              <g
                className="discern-tiling-backdrop__tile-arcs"
                style={{ animationDelay: turner.washDelay }}
              >
                {turner.arcs.map((path) => (
                  <path
                    key={path}
                    d={path}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
              {turner.traced.map((entry, index) => (
                <path
                  key={index}
                  className={entry.rest
                    ? "discern-tiling-backdrop__route discern-tiling-backdrop__route--rest"
                    : "discern-tiling-backdrop__route"}
                  d={entry.arc}
                  vectorEffect="non-scaling-stroke"
                  style={{ animationDelay: entry.delay }}
                />
              ))}
            </g>
          ))}

          <g className="discern-tiling-backdrop__routes">
            {TILING_STAGES.map((stage, index) => (
              <path
                key={index}
                className={stage.rest
                  ? "discern-tiling-backdrop__route discern-tiling-backdrop__route--rest"
                  : "discern-tiling-backdrop__route"}
                d={stage.route}
                vectorEffect="non-scaling-stroke"
                style={{ animationDelay: stage.delay }}
              />
            ))}
          </g>
        </g>
      </svg>
    </Backdrop>
  );
});
