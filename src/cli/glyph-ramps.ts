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
 * colour alone.
 */
export const SERIES_MARKERS: readonly TerminalRampGlyph[] = Object.freeze([
  glyph("●", "o"),
  glyph("■", "#"),
  glyph("▲", "^"),
  glyph("◆", "*"),
  glyph("▼", "v"),
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
  if (!Number.isSafeInteger(blocks) || blocks < 0) {
    throw new TypeError(
      `Block count must be a non-negative safe integer; received ${blocks}`,
    );
  }
  for (const [index, share] of shares.entries()) {
    if (!Number.isFinite(share) || share < 0) {
      throw new TypeError(
        `Share ${index} must be a finite non-negative number; received ${share}`,
      );
    }
  }
  const total = shares.reduce((sum, share) => sum + share, 0);
  if (total === 0) return shares.map(() => 0);
  const nonzero = shares.filter((share) => share > 0).length;
  if (blocks < nonzero) {
    throw new TypeError(
      `${blocks} blocks cannot show ${nonzero} nonzero shares without hiding one; allocate at least ${nonzero}`,
    );
  }
  const quotas = shares.map((share) => share / total * blocks);
  const counts = quotas.map((quota) => Math.floor(quota));
  let remaining = blocks - counts.reduce((sum, count) => sum + count, 0);
  const byRemainder = quotas
    .map((quota, index) => ({ remainder: quota - Math.floor(quota), index }))
    .toSorted((left, right) =>
      right.remainder - left.remainder || left.index - right.index
    );
  for (const { index } of byRemainder) {
    if (remaining === 0) break;
    const count = counts[index];
    if (count !== undefined) {
      counts[index] = count + 1;
      remaining -= 1;
    }
  }
  for (const [index, share] of shares.entries()) {
    if (share <= 0 || counts[index] !== 0) continue;
    let donor = -1;
    for (const [candidate, count] of counts.entries()) {
      if (count !== undefined && count >= 2) {
        if (donor === -1 || count > (counts[donor] ?? 0)) donor = candidate;
      }
    }
    if (donor === -1) {
      throw new TypeError(
        `Block allocation cannot honour nonzero share ${index} without a donor; this contradicts the block minimum`,
      );
    }
    counts[donor] = (counts[donor] ?? 0) - 1;
    counts[index] = 1;
  }
  return Object.freeze(counts);
}
