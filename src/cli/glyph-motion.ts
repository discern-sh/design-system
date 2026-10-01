/**
 * How a terminal glyph moves: which glyphs the animation tick advances, and
 * the cell each shows at a phase. Kept apart from the glyph table, which the
 * text authority imports, because motion reads the bound motif.
 *
 * @module
 */

import type { TerminalCapabilities } from "./capabilities.ts";
import { type TerminalMotif, terminalMotifRepertoire } from "./motif.ts";
import type { TerminalGlyph } from "./terminal-glyphs.ts";

/** Motion facts for {@linkcode terminalGlyphFrame}. */
export interface TerminalGlyphMotionOptions {
  /** The motif whose spinner an animated glyph cycles through; the package default otherwise. */
  readonly motif?: TerminalMotif;
  /** Hold an animated glyph on its resting Unicode form. */
  readonly reducedMotion?: boolean;
}

/**
 * Whether a glyph moves on the animation tick: it names the spinner, the
 * output is Unicode, and motion is not reduced. The ASCII form is always
 * still, so it stays recognisable in its column.
 */
export function terminalGlyphAnimates(
  glyph: Pick<TerminalGlyph, "animation">,
  capabilities: Pick<TerminalCapabilities, "unicode">,
  options: Pick<TerminalGlyphMotionOptions, "reducedMotion"> = {},
): boolean {
  return glyph.animation === "spinner" && capabilities.unicode &&
    options.reducedMotion !== true;
}

/**
 * The cell a glyph shows at one animation phase. A moving glyph takes the
 * motif spinner's frame for the phase; every other glyph, and every glyph
 * under reduced motion, shows its resting Unicode or ASCII form.
 */
export function terminalGlyphFrame(
  glyph: Pick<TerminalGlyph, "unicode" | "ascii" | "animation">,
  phase: number,
  capabilities: Pick<TerminalCapabilities, "unicode">,
  options: TerminalGlyphMotionOptions = {},
): string {
  if (!Number.isSafeInteger(phase) || phase < 0) {
    throw new TypeError(
      `animation phase must be a non-negative safe integer; received ${phase}`,
    );
  }
  if (!terminalGlyphAnimates(glyph, capabilities, options)) {
    return capabilities.unicode ? glyph.unicode : glyph.ascii;
  }
  const spinner = terminalMotifRepertoire(options.motif, true).spinner;
  return spinner[phase % spinner.length] ?? glyph.unicode;
}
