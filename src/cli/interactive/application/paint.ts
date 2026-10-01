/**
 * Styling shared by every application region: runs and glyphs coloured for
 * the surface beneath them, and lines fitted to exact widths with that
 * surface painted inside.
 *
 * @module
 */

import { styleText, terminalPaintsSurfaces } from "../../ansi.ts";
import type { TerminalCapabilities } from "../../capabilities.ts";
import type { CliPresentationOptions } from "../../contracts.ts";
import {
  terminalGlyphAnimates,
  terminalGlyphFrame,
} from "../../glyph-motion.ts";
import { terminalGlyph } from "../../terminal-glyphs.ts";
import { fillStyledLine, measureText, truncateText } from "../../text.ts";
import {
  resolveTerminalTheme,
  type TerminalSurfaceRole,
  type TerminalTextTone,
  terminalTextToneColor,
  type TerminalTheme,
} from "../../theme.ts";
import type { ApplicationGlyph, InlineRun } from "./view.ts";

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
  /** Set when a visible glyph moves, so the tick keeps running. */
  animated: boolean;
}

/** Build the styling context for one frame. */
export function paintContext(
  capabilities: TerminalCapabilities,
  presentation: CliPresentationOptions,
  motion: TerminalApplicationMotion,
): PaintContext {
  return {
    capabilities,
    theme: resolveTerminalTheme(presentation),
    painted: terminalPaintsSurfaces(capabilities),
    presentation,
    motion,
    animated: false,
  };
}

/** Text styling: a tone and optional weight. */
export interface Ink {
  readonly tone: TerminalTextTone;
  readonly bold?: boolean;
}

/** Style text in a tone on a surface; fills that do not paint fall back to the canvas colour. */
export function ink(
  context: PaintContext,
  text: string,
  style: Ink,
  surface?: TerminalSurfaceRole,
): string {
  return styleText(text, {
    color: terminalTextToneColor(
      context.theme,
      style.tone,
      context.painted ? surface : undefined,
    ),
    ...(style.bold === true ? { bold: true } : {}),
  }, context.capabilities);
}

/** A run's text for the repertoire; an empty ASCII form drops it. */
export function runText(context: PaintContext, run: InlineRun): string {
  return context.capabilities.unicode ? run.text : run.ascii ?? run.text;
}

/** The tone and weight a run's role and tone give it. */
export function runInk(run: InlineRun, fallback: TerminalTextTone): Ink {
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
  runs: readonly InlineRun[] | undefined,
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
  runs: readonly InlineRun[] | undefined,
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

/** Truncate plain text with the repertoire's ellipsis. */
export function clip(
  context: PaintContext,
  text: string,
  width: number,
): string {
  if (width <= 0) return "";
  return truncateText(
    text,
    width,
    terminalGlyph("ellipsis", context.capabilities),
  );
}

/**
 * Place `right` against the end of a `width`-cell line after `left`, keeping
 * at least `gap` cells between them; `right` is dropped when it cannot fit.
 */
export function spread(
  left: string,
  right: string,
  width: number,
  gap = 2,
): string {
  const used = measureText(left);
  const extra = measureText(right);
  if (right === "" || used + gap + extra > width) return left;
  return `${left}${" ".repeat(width - used - extra)}${right}`;
}

/** An overflow marker such as `↓ 6 more · PgDn`, or its ASCII words. */
export function overflowMarker(
  context: PaintContext,
  direction: "up" | "down",
  count: number,
  key?: string,
): string {
  const unicode = context.capabilities.unicode;
  const base = unicode
    ? `${terminalGlyph(direction, context.capabilities)} ${count} more`
    : `${count} more ${direction === "up" ? "above" : "below"}`;
  return key === undefined
    ? base
    : `${base} ${terminalGlyph("separator", context.capabilities)} ${key}`;
}
