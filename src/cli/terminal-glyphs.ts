/**
 * The terminal glyph table: every mark an interactive terminal surface
 * draws, its one-cell Unicode form, its printable ASCII fallback, and the
 * column it occupies. Meaning never depends on the Unicode form alone; each
 * ASCII fallback is unique among the glyphs a reader must tell apart in the
 * same column. Triangles come from the triangle authority; the fallbacks
 * here are the ones a state column needs, which can differ from a
 * triangle's directional ASCII.
 *
 * @module
 */

import type { TerminalCapabilities } from "./capabilities.ts";
import { TRIANGLES } from "./triangles.ts";

/**
 * Where a glyph sits. `state` marks a row's condition and `fold` a
 * collapsible row or disclosure — the two share one column, so they share
 * one identity group. `mark` prefixes a consequence line, `flag` annotates a
 * row, `menu` marks a menu row, `button` brackets a focused button, `chrome`
 * draws positional furniture (selection bar, cursor, meters, separators),
 * and `key` names a key in a hint.
 */
export type TerminalGlyphColumn =
  | "state"
  | "fold"
  | "mark"
  | "flag"
  | "menu"
  | "button"
  | "chrome"
  | "key";

/** One glyph with its fallback and column. */
export interface TerminalGlyph {
  /** One-cell Unicode form under the package's narrow-A width policy. */
  readonly unicode: string;
  /** Printable ASCII form; one cell in every column but `chrome` and `key`. */
  readonly ascii: string;
  readonly column: TerminalGlyphColumn;
  /** A glyph that animates through the bound motif's spinner cycle. */
  readonly animation?: "spinner";
}

const glyph = (
  unicode: string,
  ascii: string,
  column: TerminalGlyphColumn,
): TerminalGlyph => Object.freeze({ unicode, ascii, column });

/** Name of one terminal glyph, by meaning. */
export type TerminalGlyphName =
  | "done"
  | "failed"
  | "attention"
  | "running"
  | "active"
  | "queued"
  | "pending"
  | "idle"
  | "paused"
  | "folded"
  | "unfolded"
  | "changes"
  | "removes"
  | "keeps"
  | "restorable"
  | "overlap"
  | "unavailable"
  | "focusStart"
  | "focusEnd"
  | "selection"
  | "crumb"
  | "cursor"
  | "meterFill"
  | "meterTrack"
  | "ellipsis"
  | "separator"
  | "times"
  | "enter"
  | "up"
  | "down"
  | "left"
  | "right"
  | "shift";

/** Every terminal glyph by meaning. */
export const TERMINAL_GLYPHS: Readonly<
  Record<TerminalGlyphName, TerminalGlyph>
> = Object.freeze(
  {
    /** Finished well. */
    done: glyph("✓", "v", "state"),
    /** Finished badly. */
    failed: glyph("✕", "x", "state"),
    /** Needs a person's attention. */
    attention: glyph("!", "!", "state"),
    /** Work in progress; animates through the motif spinner. */
    running: Object.freeze(
      {
        unicode: "◐",
        ascii: "@",
        column: "state",
        animation: "spinner",
      } as const,
    ),
    /** Being changed right now. */
    active: glyph("●", "*", "state"),
    /** Cleared to proceed and waiting its turn. */
    queued: glyph(TRIANGLES.filled.up.unicode, "^", "state"),
    /** Something must happen before it can proceed. */
    pending: glyph(TRIANGLES.unfilled.up.unicode, ".", "state"),
    /** Nothing is happening. */
    idle: glyph("○", "o", "state"),
    /** Set aside on purpose. */
    paused: glyph("◇", "~", "state"),
    /** A collapsed row or disclosure. */
    folded: glyph(TRIANGLES.filledSmall.right.unicode, "+", "fold"),
    /** An expanded row or disclosure. */
    unfolded: glyph(TRIANGLES.filledSmall.down.unicode, "-", "fold"),
    /** A consequence that changes something. */
    changes: glyph("→", ">", "mark"),
    /** A consequence that removes or discards something. */
    removes: glyph("−", "-", "mark"),
    /** A consequence that keeps something. */
    keeps: glyph("=", "=", "mark"),
    /** A consequence that can be undone later. */
    restorable: glyph("↺", "~", "mark"),
    /** The row overlaps another. */
    overlap: glyph("⇄", "&", "flag"),
    /** A menu row that cannot run now. */
    unavailable: glyph("×", "x", "menu"),
    /** Opens a focused button's brackets. */
    focusStart: glyph("›", ">", "button"),
    /** Closes a focused button's brackets. */
    focusEnd: glyph("‹", "<", "button"),
    /** The selected row's leading bar. */
    selection: glyph("▌", ">", "chrome"),
    /** Separates breadcrumb steps and leads an input line. */
    crumb: glyph("›", ">", "chrome"),
    /** A text cursor. */
    cursor: glyph("▏", "|", "chrome"),
    /** A meter's filled track. */
    meterFill: glyph("━", "=", "chrome"),
    /** A meter's remaining track. */
    meterTrack: glyph("─", "-", "chrome"),
    /** Truncated text. */
    ellipsis: glyph("…", "...", "chrome"),
    /** Separates phrases in a line. */
    separator: glyph("·", "-", "chrome"),
    /** Multiplies dimensions, as in a size. */
    times: glyph("×", "x", "chrome"),
    /** The Enter key. */
    enter: glyph("↵", "Enter", "key"),
    /** The Up arrow key. */
    up: glyph("↑", "Up", "key"),
    /** The Down arrow key. */
    down: glyph("↓", "Down", "key"),
    /** The Left arrow key. */
    left: glyph("←", "Left", "key"),
    /** The Right arrow key. */
    right: glyph("→", "Right", "key"),
    /** The Shift modifier, prefixed to a key. */
    shift: glyph("⇧", "Shift+", "key"),
  },
);

/**
 * The group within which a column's ASCII forms must be unique, or
 * `undefined` for positional columns. Fold markers share the state column;
 * chrome glyphs are identified by where they sit, not by their shape.
 */
export function terminalGlyphIdentityGroup(
  column: TerminalGlyphColumn,
): TerminalGlyphColumn | undefined {
  if (column === "chrome") return undefined;
  return column === "fold" ? "state" : column;
}

/** Resolve a terminal glyph's text for the supplied capabilities. */
export function terminalGlyph(
  name: TerminalGlyphName,
  capabilities: Pick<TerminalCapabilities, "unicode">,
): string {
  const entry: TerminalGlyph = TERMINAL_GLYPHS[name];
  return capabilities.unicode ? entry.unicode : entry.ascii;
}
