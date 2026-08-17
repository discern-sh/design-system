/**
 * The plain-triangle glyph authority.
 *
 * Every common Unicode triangle the package draws with lives here, paired
 * with its ASCII fallback, so component renderers select geometry from one
 * table instead of scattering literals. These are fixed design glyphs —
 * consumer identity stays in the terminal motif; a renderer reaches for
 * this table when a triangle's fill, size, or direction is part of the
 * component's own design, the way rules and box borders are.
 *
 * @module
 */

/** One plain triangle glyph with its single-character ASCII fallback. */
export interface TerminalTriangle {
  /** The Unicode glyph, one scalar occupying one terminal cell. */
  readonly unicode: string;
  /** The printable ASCII stand-in used when Unicode output is unavailable. */
  readonly ascii: string;
}

/** The four compass directions of one triangle family. */
export interface TerminalTriangleDirections {
  readonly up: TerminalTriangle;
  readonly right: TerminalTriangle;
  readonly down: TerminalTriangle;
  readonly left: TerminalTriangle;
}

function triangleFamily(
  up: string,
  right: string,
  down: string,
  left: string,
): TerminalTriangleDirections {
  return Object.freeze({
    up: Object.freeze({ unicode: up, ascii: "^" }),
    right: Object.freeze({ unicode: right, ascii: ">" }),
    down: Object.freeze({ unicode: down, ascii: "v" }),
    left: Object.freeze({ unicode: left, ascii: "<" }),
  });
}

/**
 * The complete plain-triangle repertoire: filled and unfilled fills in the
 * regular and small sizes, each pointing in the four compass directions.
 *
 * The `unfilledSmall` family is included for completeness, but many
 * monospace fonts lack the white small variants and substitute a
 * proportional fallback face at full size; avoid that family as a default.
 */
export const TRIANGLES: {
  /** Solid triangles: `▲ ▶ ▼ ◀`. */
  readonly filled: TerminalTriangleDirections;
  /** Outline triangles: `△ ▷ ▽ ◁`. */
  readonly unfilled: TerminalTriangleDirections;
  /** Solid small triangles: `▴ ▸ ▾ ◂`. */
  readonly filledSmall: TerminalTriangleDirections;
  /** Outline small triangles: `▵ ▹ ▿ ◃`. */
  readonly unfilledSmall: TerminalTriangleDirections;
} = Object.freeze({
  filled: triangleFamily("▲", "▶", "▼", "◀"),
  unfilled: triangleFamily("△", "▷", "▽", "◁"),
  filledSmall: triangleFamily("▴", "▸", "▾", "◂"),
  unfilledSmall: triangleFamily("▵", "▹", "▿", "◃"),
});

/**
 * Resolve one triangle to the glyph a terminal can display: the Unicode
 * form when `unicode` is true, otherwise its ASCII fallback.
 */
export function triangleGlyph(
  triangle: TerminalTriangle,
  unicode: boolean,
): string {
  return unicode ? triangle.unicode : triangle.ascii;
}
