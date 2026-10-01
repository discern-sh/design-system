/**
 * The lines an application prints on the normal screen after releasing it —
 * a foreground command's handoff and an exit's epilogue — wrapped to the
 * terminal at word boundaries with a hanging indent, so they read like the
 * package's other prose in the scrollback. A `code` run never breaks: a
 * command, path, or address stays whole on one line to copy, and one wider
 * than the terminal is left for the terminal to wrap, which keeps it one
 * line when selected.
 *
 * @module
 */

import { measureText } from "../../text.ts";
import type { ApplicationRun } from "./view.ts";

/** Cells a wrapped line's continuations hang beyond its own indentation. */
export const RELEASED_LINE_HANG = 2;

/**
 * One line an exit prints after the screen is released: plain text, or runs
 * whose `code` runs never break, so a command or path stays whole to copy.
 * Tones are not drawn there; `ascii` replaces a run's text without Unicode.
 */
export type ApplicationEpilogueLine = string | readonly ApplicationRun[];

interface Piece {
  readonly text: string;
  /** A piece that never breaks, though it holds spaces. */
  readonly whole: boolean;
}

function pieces(
  line: ApplicationEpilogueLine,
  unicode: boolean,
): readonly Piece[] {
  if (typeof line === "string") return [{ text: line, whole: false }];
  return line.flatMap((run) => {
    const text = unicode ? run.text : run.ascii ?? run.text;
    return text === "" ? [] : [{ text, whole: run.role === "code" }];
  });
}

/**
 * The words a line breaks between. Whitespace in prose separates words; a
 * whole piece joins whatever touches it without a space, so `(path)` stays
 * one word.
 */
function words(parts: readonly Piece[]): readonly string[] {
  const found: string[] = [];
  let current: string | undefined;
  for (const part of parts) {
    if (part.whole) {
      current = `${current ?? ""}${part.text}`;
      continue;
    }
    for (const token of part.text.split(/(\s+)/u)) {
      if (token === "") continue;
      if (/^\s+$/u.test(token)) {
        if (current !== undefined) found.push(current);
        current = undefined;
      } else current = `${current ?? ""}${token}`;
    }
  }
  if (current !== undefined) found.push(current);
  return found;
}

/**
 * Lay one released line out for a terminal `columns` wide. A line that
 * fits prints exactly as given. A longer one keeps its leading spaces, wraps
 * at word boundaries, and hangs its continuations
 * {@linkcode RELEASED_LINE_HANG} cells further in; a word wider than its
 * line takes a line of its own unbroken.
 */
export function releasedLines(
  line: ApplicationEpilogueLine,
  columns: number,
  unicode: boolean,
): readonly string[] {
  const parts = pieces(line, unicode);
  const text = parts.map((part) => part.text).join("");
  if (measureText(text) <= columns) return [text];
  const first = parts[0];
  const indent = first === undefined || first.whole
    ? ""
    : (/^ */u.exec(first.text)?.[0] ?? "");
  const hang = " ".repeat(
    Math.max(0, Math.min(indent.length + RELEASED_LINE_HANG, columns - 1)),
  );
  const lines: string[] = [];
  let current: string | undefined;
  for (const word of words(parts)) {
    if (current === undefined) current = `${indent}${word}`;
    else if (measureText(`${current} ${word}`) <= columns) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = `${hang}${word}`;
    }
  }
  if (current !== undefined) lines.push(current);
  return lines;
}
