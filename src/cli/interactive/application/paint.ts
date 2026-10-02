/**
 * Styling shared by every application region: runs and glyphs coloured for
 * the surface beneath them, and lines fitted to exact widths with that
 * surface painted inside.
 *
 * @module
 */

import { styleText, terminalPaintsSurfaces } from "../../ansi.ts";
import { asciiSpelling } from "../../ascii-text.ts";
import type { TerminalCapabilities } from "../../capabilities.ts";
import type { CliPresentationOptions } from "../../contracts.ts";
import {
  terminalGlyphAnimates,
  terminalGlyphFrame,
} from "../../glyph-motion.ts";
import { terminalGlyph } from "../../terminal-glyphs.ts";
import {
  fillStyledLine,
  measureText,
  type TerminalTruncateOptions,
  truncateStyledText,
  truncateText,
} from "../../text.ts";
import {
  resolveTerminalTheme,
  type TerminalSurfaceRole,
  type TerminalTextTone,
  terminalTextToneColor,
  type TerminalTheme,
} from "../../theme.ts";
import { formatKeyChord } from "../../key-hints.ts";
import {
  DEFAULT_TERMINAL_APPLICATION_COPY,
  type TerminalApplicationCopy,
} from "./copy.ts";
import type {
  ApplicationGlyph,
  ApplicationRun,
  ApplicationRunClock,
} from "./view.ts";

/** Where the application's animation and clock stand when a frame renders. */
export interface TerminalApplicationMotion {
  /** The shared phase every moving glyph renders at; the tick advances it. */
  readonly phase: number;
  /** Hold every animated glyph on its resting form. */
  readonly reducedMotion?: boolean;
  /** The time the frame renders at, for liveness that appears after a delay. */
  readonly now?: number;
}

/** Everything a region needs to style one frame. */
export interface PaintContext {
  readonly capabilities: TerminalCapabilities;
  readonly theme: TerminalTheme;
  /** Whether surface fills reach the terminal. */
  readonly painted: boolean;
  readonly presentation: CliPresentationOptions;
  readonly motion: TerminalApplicationMotion;
  /**
   * Under an open layer the base recedes once: every tone becomes faint and
   * weight drops, while the selection keeps its muted fill.
   */
  readonly recede?: boolean;
  /** The surface text sits on when a call names none, such as a layer's raised fill. */
  readonly ground?: TerminalSurfaceRole;
  /** Set when a visible glyph moves, so the tick keeps running. */
  animated: boolean;
  /** Set when a visible clock, such as an elapsed time, should tick. */
  clock: boolean;
  /** The words the package writes, from the view's copy. */
  readonly copy: TerminalApplicationCopy;
}

/** Build the styling context for one frame. */
export function paintContext(
  capabilities: TerminalCapabilities,
  presentation: CliPresentationOptions,
  motion: TerminalApplicationMotion,
  copy: TerminalApplicationCopy = DEFAULT_TERMINAL_APPLICATION_COPY,
): PaintContext {
  return {
    capabilities,
    theme: resolveTerminalTheme(presentation),
    painted: terminalPaintsSurfaces(capabilities),
    presentation,
    motion,
    animated: false,
    clock: false,
    copy,
  };
}

/** Text styling: a tone and optional weight. */
export interface Ink {
  readonly tone: TerminalTextTone;
  readonly bold?: boolean;
}

/**
 * Style text in a tone on a surface (the context's ground when none is
 * named); fills that do not paint fall back to the canvas colour. A
 * receded context draws every tone faint and without weight.
 */
export function ink(
  context: PaintContext,
  text: string,
  style: Ink,
  surface?: TerminalSurfaceRole,
): string {
  const on = surface ?? context.ground;
  const receded = context.recede === true;
  const shown = context.capabilities.unicode ? text : asciiSpelling(text);
  return styleText(shown, {
    color: terminalTextToneColor(
      context.theme,
      receded ? "faint" : style.tone,
      context.painted ? on : undefined,
    ),
    ...(style.bold === true && !receded ? { bold: true } : {}),
  }, context.capabilities);
}

/**
 * A run's text for the repertoire: without Unicode its `ascii` form, or its
 * text with typographic marks spelled in ASCII; an empty ASCII form drops
 * the run.
 */
export function runText(context: PaintContext, run: ApplicationRun): string {
  if (run.clock !== undefined && context.motion.now !== undefined) {
    context.clock = true;
    return elapsedText(run.clock, context.motion.now);
  }
  return context.capabilities.unicode
    ? run.text
    : run.ascii ?? asciiSpelling(run.text);
}

/** Minutes and seconds, as a clock: `0:41`, `12:05`. */
export function clockText(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** A duration: seconds under a minute, else a clock. */
export function durationText(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return seconds < 60 ? `${seconds}s` : clockText(ms);
}

/** The time a clock run shows at `now`. */
export function elapsedText(clock: ApplicationRunClock, now: number): string {
  const elapsed = now - clock.since;
  return clock.format === "duration"
    ? durationText(elapsed)
    : clockText(elapsed);
}

/** The tone and weight a run's role and tone give it. */
export function runInk(run: ApplicationRun, fallback: TerminalTextTone): Ink {
  switch (run.role) {
    case "title":
    case "key":
    case "code":
      return { tone: run.tone ?? "ink", bold: true };
    case "label":
      return { tone: run.tone ?? "faint" };
    default:
      return { tone: run.tone ?? fallback };
  }
}

/** Style a sequence of runs. */
export function styleRuns(
  context: PaintContext,
  runs: readonly ApplicationRun[] | undefined,
  surface: TerminalSurfaceRole | undefined,
  fallback: TerminalTextTone = "ink",
  bold = false,
): string {
  return (runs ?? []).map((run) => {
    const style = runInk(run, fallback);
    return ink(
      context,
      runText(context, run),
      bold ? { ...style, bold: true } : style,
      surface,
    );
  }).join("");
}

/** The plain width of a sequence of runs. */
export function runsWidth(
  context: PaintContext,
  runs: readonly ApplicationRun[] | undefined,
): number {
  return measureText((runs ?? []).map((run) => runText(context, run)).join(""));
}

/** A glyph's cell for this frame, moving through its spinner when it animates. */
export function glyphText(
  context: PaintContext,
  glyph: ApplicationGlyph,
): string {
  if (
    glyph.animation === "spinner" &&
    terminalGlyphAnimates(glyph, context.capabilities, context.motion)
  ) {
    context.animated = true;
    return terminalGlyphFrame(
      glyph,
      context.motion.phase,
      context.capabilities,
      {
        ...(context.presentation.motif === undefined
          ? {}
          : { motif: context.presentation.motif }),
        ...(context.motion.reducedMotion === true
          ? { reducedMotion: true }
          : {}),
      },
    );
  }
  return context.capabilities.unicode ? glyph.unicode : glyph.ascii;
}

/** Style a glyph in its tone. */
export function styleGlyph(
  context: PaintContext,
  glyph: ApplicationGlyph,
  surface: TerminalSurfaceRole | undefined,
  fallback: TerminalTextTone = "ink",
): string {
  return ink(
    context,
    glyphText(context, glyph),
    { tone: glyph.tone ?? fallback },
    surface,
  );
}

/** Fit one styled line to exactly `width` cells with a surface painted inside. */
export function fitLine(
  context: PaintContext,
  content: string,
  width: number,
  surface?: TerminalSurfaceRole,
): string {
  if (width <= 0) return "";
  return fillStyledLine(
    content,
    width,
    surface !== undefined && context.painted
      ? { background: context.theme.surfaces[surface] }
      : {},
    context.capabilities,
  );
}

/**
 * Where a line the package fits to its room is cut: a name — a title, a
 * label, a cell, an identifier — where the room runs out, and prose — a
 * message, a description, a footnote, a reason — after its last whole word.
 */
export type ApplicationCut = NonNullable<TerminalTruncateOptions["at"]>;

/** Truncate plain text with the repertoire's ellipsis, spelled for the repertoire. */
export function clip(
  context: PaintContext,
  text: string,
  width: number,
  at: ApplicationCut = "grapheme",
): string {
  if (width <= 0) return "";
  const ellipsis = terminalGlyph("ellipsis", context.capabilities);
  const clipped = truncateText(
    context.capabilities.unicode ? text : asciiSpelling(text),
    width,
    ellipsis,
    { at },
  );
  // A cut at a word boundary reads `archive…`, never `archive …`.
  return clipped.endsWith(` ${ellipsis}`)
    ? `${clipped.slice(0, -ellipsis.length - 1).trimEnd()}${ellipsis}`
    : clipped;
}

/**
 * Fit a styled name to `width` cells, cut where the room runs out but never
 * just after a space or a separator, which would read `Studio ·…`.
 */
export function fitName(
  context: PaintContext,
  styled: string,
  width: number,
): string {
  if (measureText(styled) <= width) return styled;
  const ellipsis = terminalGlyph("ellipsis", context.capabilities);
  const marker = measureText(ellipsis);
  const kept = truncateText(styled, Math.max(0, width - marker), "")
    .replace(/[\s·•—–-]+$/u, "");
  return truncateStyledText(
    styled,
    kept === "" ? Math.max(0, width) : measureText(kept) + marker,
    ellipsis,
  );
}

/** Fit styled prose to `width` cells, cut after its last whole word that fits. */
export function fitProse(
  context: PaintContext,
  styled: string,
  width: number,
): string {
  return truncateStyledText(
    styled,
    Math.max(0, width),
    terminalGlyph("ellipsis", context.capabilities),
    { at: "word" },
  );
}

/**
 * Place `right` against the end of a `width`-cell line after `left`, keeping
 * at least `gap` cells between them. When both cannot fit, `right` is
 * dropped and `left` truncates with the repertoire's ellipsis, cut `at` a
 * grapheme or after a whole word, so the line never runs past `width`.
 */
export function spread(
  context: PaintContext,
  left: string,
  right: string,
  width: number,
  gap = 2,
  at: ApplicationCut = "grapheme",
): string {
  const used = measureText(left);
  const extra = measureText(right);
  if (right === "" || used + gap + extra > width) {
    return used <= width ? left : truncateStyledText(
      left,
      Math.max(0, width),
      terminalGlyph("ellipsis", context.capabilities),
      { at },
    );
  }
  return `${left}${" ".repeat(width - used - extra)}${right}`;
}

/**
 * An overflow marker such as `↓ 6 more · PgDn`, or its ASCII words, with
 * the key that pages toward what is hidden when one does — unless the
 * region has receded beneath a layer, whose keys those are now.
 */
export function overflowMarker(
  context: PaintContext,
  direction: "up" | "down",
  count: number,
  key?: "page-up" | "page-down",
): string {
  const unicode = context.capabilities.unicode;
  const copy = context.copy;
  const base = unicode
    ? `${terminalGlyph(direction, context.capabilities)} ${copy.more(count)}`
    : direction === "up"
    ? copy.moreAbove(count)
    : copy.moreBelow(count);
  // A receded region's keys belong to the layer above it now.
  return key === undefined || context.recede === true
    ? base
    : `${base} ${terminalGlyph("separator", context.capabilities)} ${
      formatKeyChord(key, context.capabilities)
    }`;
}

/** An empty body's explanation as its lines: one paragraph, or each line given. */
export function emptyBodyLines(
  body: readonly ApplicationRun[] | readonly (readonly ApplicationRun[])[],
): readonly (readonly ApplicationRun[])[] {
  const lines: (readonly ApplicationRun[])[] = [];
  const paragraph: ApplicationRun[] = [];
  for (const entry of body) {
    if (isRunLine(entry)) lines.push(entry);
    else paragraph.push(entry);
  }
  return paragraph.length > 0 ? [paragraph, ...lines] : lines;
}

function isRunLine(
  entry: ApplicationRun | readonly ApplicationRun[],
): entry is readonly ApplicationRun[] {
  return Array.isArray(entry);
}
