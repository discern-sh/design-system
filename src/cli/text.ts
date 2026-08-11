/**
 * Grapheme-aware terminal measurement, wrapping, truncation, and padding.
 *
 * @module
 */

import { stripAnsi } from "./ansi.ts";

/** Horizontal alignment used by terminal padding and column layout. */
export type TerminalAlignment = "start" | "center" | "end";

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

function graphemes(value: string): readonly string[] {
  return [...segmenter.segment(value)].map((part) => part.segment);
}

function fullWidthCodePoint(codePoint: number): boolean {
  return codePoint >= 0x1100 &&
    (codePoint <= 0x115f ||
      codePoint === 0x2329 || codePoint === 0x232a ||
      (codePoint >= 0x2e80 && codePoint <= 0x303e) ||
      (codePoint >= 0x3040 && codePoint <= 0xa4cf) ||
      (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
      (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
      (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
      (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
      (codePoint >= 0xff00 && codePoint <= 0xff60) ||
      (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
      (codePoint >= 0x1b000 && codePoint <= 0x1b2ff) ||
      (codePoint >= 0x1f200 && codePoint <= 0x1f251) ||
      (codePoint >= 0x20000 && codePoint <= 0x3fffd));
}

/** Measure one Unicode grapheme in terminal character cells. */
export function graphemeWidth(grapheme: string): number {
  if (grapheme === "" || grapheme === "\n" || grapheme === "\r") return 0;
  if (/^[\p{Cc}\p{Cf}\p{Mn}\p{Me}]+$/u.test(grapheme)) return 0;
  if (/\p{Extended_Pictographic}/u.test(grapheme)) return 2;
  const base = [...grapheme].find((character) =>
    !/[\p{Mn}\p{Me}\p{Cf}]/u.test(character)
  );
  const codePoint = base?.codePointAt(0);
  return codePoint !== undefined && fullWidthCodePoint(codePoint) ? 2 : 1;
}

function lineWidth(value: string): number {
  return graphemes(value).reduce(
    (width, grapheme) => width + graphemeWidth(grapheme),
    0,
  );
}

/** Measure the widest visible line after ignoring ANSI control sequences. */
export function measureText(value: string): number {
  return Math.max(0, ...stripAnsi(value).split("\n").map(lineWidth));
}

function sliceToWidth(value: string, columns: number): string {
  let result = "";
  let width = 0;
  for (const grapheme of graphemes(value)) {
    const next = graphemeWidth(grapheme);
    if (width + next > columns) break;
    result += grapheme;
    width += next;
  }
  return result;
}

/** Truncate plain text to a visible width without splitting a grapheme. */
export function truncateText(
  value: string,
  columns: number,
  ellipsis = "…",
): string {
  if (!Number.isSafeInteger(columns) || columns < 0) {
    throw new TypeError(
      `truncate columns must be a non-negative safe integer; received ${columns}`,
    );
  }
  const plain = stripAnsi(value).replaceAll("\n", " ");
  if (lineWidth(plain) <= columns) return plain;
  const marker = sliceToWidth(ellipsis, columns);
  const markerWidth = lineWidth(marker);
  return `${sliceToWidth(plain, columns - markerWidth)}${marker}`;
}

function splitLongWord(word: string, columns: number): readonly string[] {
  const chunks: string[] = [];
  let remaining = word;
  while (remaining !== "") {
    const chunk = sliceToWidth(remaining, columns);
    if (chunk === "") {
      const first = graphemes(remaining)[0] ?? "";
      chunks.push(first);
      remaining = remaining.slice(first.length);
    } else {
      chunks.push(chunk);
      remaining = remaining.slice(chunk.length);
    }
  }
  return chunks;
}

function wrapParagraph(paragraph: string, columns: number): readonly string[] {
  if (paragraph === "") return [""];
  const words = paragraph.trim().split(/\s+/u).filter((word) => word !== "");
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidates = lineWidth(word) > columns
      ? splitLongWord(word, columns)
      : [word];
    for (const candidate of candidates) {
      const joined = current === "" ? candidate : `${current} ${candidate}`;
      if (lineWidth(joined) <= columns) current = joined;
      else {
        if (current !== "") lines.push(current);
        current = candidate;
      }
    }
  }
  if (current !== "") lines.push(current);
  return lines;
}

/** Wrap plain text into visible-width-bounded lines at word boundaries. */
export function wrapText(value: string, columns: number): readonly string[] {
  if (!Number.isSafeInteger(columns) || columns < 1) {
    throw new TypeError(
      `wrap columns must be a positive safe integer; received ${columns}`,
    );
  }
  return stripAnsi(value).split("\n").flatMap((paragraph) =>
    wrapParagraph(paragraph, columns)
  );
}

/** Pad one line to a visible width without truncating over-wide content. */
export function padText(
  value: string,
  columns: number,
  alignment: TerminalAlignment = "start",
): string {
  if (!Number.isSafeInteger(columns) || columns < 0) {
    throw new TypeError(
      `pad columns must be a non-negative safe integer; received ${columns}`,
    );
  }
  const missing = Math.max(0, columns - measureText(value));
  if (alignment === "end") return `${" ".repeat(missing)}${value}`;
  if (alignment === "center") {
    const before = Math.floor(missing / 2);
    return `${" ".repeat(before)}${value}${" ".repeat(missing - before)}`;
  }
  return `${value}${" ".repeat(missing)}`;
}
