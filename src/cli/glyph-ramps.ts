/**
 * The chart glyph-ramp authority for terminal frames.
 *
 * Every sub-cell block ramp, shade bin, and per-series glyph the chart
 * family draws with lives here, each Unicode glyph paired with a mandatory
 * one-cell printable ASCII fallback and selected through one resolver — the
 * same discipline as the triangle authority. The proportional block
 * allocator generalizes the Diffstat allocation contract to N categories;
 * Diffstat's two-share form predates it and keeps its own published edge
 * behaviour, so the two remain separate authorities on purpose.
 *
 * @module
 */

import { TRIANGLES } from "./triangles.ts";
import { allocateChartProportionalUnits } from "../chart/proportions.ts";

/** One ramp or series glyph with its single-cell ASCII fallback. */
export interface TerminalRampGlyph {
  /** The Unicode glyph, one scalar occupying one terminal cell. */
  readonly unicode: string;
  /** The printable ASCII stand-in used when Unicode output is unavailable. */
  readonly ascii: string;
}

function glyph(unicode: string, ascii: string): TerminalRampGlyph {
  return Object.freeze({ unicode, ascii });
}

/**
 * Horizontal eighth-block fill ramp, one-eighth through a full cell:
 * `▏▎▍▌▋▊▉█`. ASCII has no sub-cell resolution, so every partial fill pairs
 * with the full visible cell — a nonzero eighth never disappears — and exact
 * values stay the printed annotation's job.
 */
export const HORIZONTAL_EIGHTH_RAMP: readonly TerminalRampGlyph[] = Object
  .freeze([
    glyph("▏", "#"),
    glyph("▎", "#"),
    glyph("▍", "#"),
    glyph("▌", "#"),
    glyph("▋", "#"),
    glyph("▊", "#"),
    glyph("▉", "#"),
    glyph("█", "#"),
  ]);

/**
 * Vertical eighth-block fill ramp, one-eighth through a full cell:
 * `▁▂▃▄▅▆▇█`. The ASCII pairing degrades to three declared height levels —
 * low, middle, tall — and never to a blank cell.
 */
export const VERTICAL_EIGHTH_RAMP: readonly TerminalRampGlyph[] = Object
  .freeze([
    glyph("▁", "_"),
    glyph("▂", "_"),
    glyph("▃", "_"),
    glyph("▄", "="),
    glyph("▅", "="),
    glyph("▆", "="),
    glyph("▇", "#"),
    glyph("█", "#"),
  ]);

/**
 * Five-bin intensity ramp: an empty bin then `░▒▓█`. The ASCII pairing
 * prints the bin index digit, preserving exact bin identity where shading is
 * only perceptually approximate; the empty bin stays a space in both
 * repertoires.
 */
export const SHADE_RAMP: readonly TerminalRampGlyph[] = Object.freeze([
  glyph(" ", " "),
  glyph("░", "1"),
  glyph("▒", "2"),
  glyph("▓", "3"),
  glyph("█", "4"),
]);

/**
 * Series marker glyphs for the six categorical slots, in slot order. The
 * marker is each slot's paired non-colour cue, so two series never differ by
 * colour alone. Triangle-shaped markers come from the triangle authority
 * rather than a second glyph table.
 */
export const SERIES_MARKERS: readonly TerminalRampGlyph[] = Object.freeze([
  glyph("●", "o"),
  glyph("■", "#"),
  TRIANGLES.filled.up,
  glyph("◆", "*"),
  TRIANGLES.filled.down,
  glyph("★", "x"),
]);

/**
 * Series fill textures for the six categorical slots, in slot order, used
 * where a run of cells carries one series — stacked segments and area fills.
 */
export const SERIES_FILLS: readonly TerminalRampGlyph[] = Object.freeze([
  glyph("█", "#"),
  glyph("▓", "@"),
  glyph("▒", "="),
  glyph("░", ":"),
  glyph("▀", "^"),
  glyph("▄", "_"),
]);

/**
 * One cell's role along a terminal line path. `level`, `riseTo`, and
 * `fallTo` cells sit on an authored value row; `riseFrom`, `fallFrom`, and
 * `run` cells only connect neighbouring authored rows.
 */
export type LinePathSegment =
  | "level"
  | "riseFrom"
  | "riseTo"
  | "fallFrom"
  | "fallTo"
  | "run";

/**
 * Box-drawing vocabulary for terminal line paths, one column per authored
 * point. The ASCII pairing is the asterisk-with-dot idiom: a cell on an
 * authored value row pairs with `*`, and a cell that merely connects two
 * authored rows pairs with `.` — so even the plainest repertoire keeps
 * authored points distinguishable from interpolation.
 */
export const LINE_PATH_GLYPHS: Readonly<
  Record<LinePathSegment, TerminalRampGlyph>
> = Object.freeze({
  level: glyph("─", "*"),
  riseFrom: glyph("╯", "."),
  riseTo: glyph("╭", "*"),
  fallFrom: glyph("╮", "."),
  fallTo: glyph("╰", "*"),
  run: glyph("│", "."),
});

/** One cell's role along a terminal five-number box summary row. */
export type BoxSummarySegment =
  | "capStart"
  | "whisker"
  | "body"
  | "median"
  | "capEnd";

/**
 * Glyphs for the terminal box five-number summary: whisker caps at the
 * minimum and maximum, whisker runs, the interquartile body, and a median
 * cell dense enough to read against the body in both repertoires. The
 * drawing stays gestural on purpose — the five printed numbers beneath it
 * are the lossless layer.
 */
export const BOX_SUMMARY_GLYPHS: Readonly<
  Record<BoxSummarySegment, TerminalRampGlyph>
> = Object.freeze({
  capStart: glyph("├", "|"),
  whisker: glyph("─", "-"),
  body: glyph("▒", "="),
  median: glyph("█", "#"),
  capEnd: glyph("┤", "|"),
});

/**
 * The one declared-gap cell: an explicit null renders this glyph, never a
 * blank and never a zero-height mark, so a gap stays distinct from zero in
 * every repertoire.
 */
export const DECLARED_GAP_GLYPH: TerminalRampGlyph = glyph("·", ".");

/**
 * Resolve one glyph to the form a terminal can display: the Unicode form
 * when `unicode` is true, otherwise its ASCII fallback.
 */
export function rampGlyph(
  member: TerminalRampGlyph,
  unicode: boolean,
): string {
  return unicode ? member.unicode : member.ascii;
}

/**
 * Quantize a fraction of one cell onto a ramp: zero selects no glyph, and
 * any nonzero fraction selects at least the first step — a nonzero value
 * never renders empty. Returns the one-based step count, zero for none.
 */
export function rampStepForFraction(
  fraction: number,
  steps: number,
): number {
  if (!Number.isInteger(steps) || steps < 1) {
    throw new TypeError(
      `Ramp steps must be a positive integer; received ${steps}`,
    );
  }
  if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) {
    throw new TypeError(
      `Ramp fraction must lie within 0..1; received ${fraction}`,
    );
  }
  if (fraction === 0) return 0;
  return Math.max(1, Math.min(steps, Math.round(fraction * steps)));
}

/**
 * Allocate a fixed number of whole cells across N proportional shares
 * without hiding any nonzero share: quotas round by largest remainder with
 * ties resolved toward the earlier share, then any nonzero share left empty
 * takes one cell from the largest allocation. Requires at least as many
 * cells as nonzero shares, refusing rather than hiding when that fails.
 */
export function allocateProportionalBlocks(
  shares: readonly number[],
  blocks: number,
): readonly number[] {
  return allocateChartProportionalUnits(shares, blocks);
}
