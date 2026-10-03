/**
 * Reference implementation of the terminal text layout helpers: the direct
 * algorithm, which re-measures every slice and joined line it builds. It is
 * quadratic on a long word, which is why the package does not ship it, and
 * it is the plainest statement of the layout the package does ship — the
 * linear helpers in `src/cli/text.ts` must match it byte for byte, which
 * `text_layout_parity_test.ts` checks over randomized input.
 *
 * Grapheme width, ANSI stripping, and styled-sequence parsing and emission
 * are shared authorities imported as they are; run slicing is copied here,
 * because the linear wrap re-attributes styling through its own reader.
 *
 * @module
 */

import { stripAnsi, type TerminalTextStyle } from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import { terminalGlyph } from "../../src/cli/terminal-glyphs.ts";
import {
  emitStyledLine,
  parseStyledSource,
  styleCodes,
  type StyledSegment,
  underlayStyledSegments,
} from "../../src/cli/styled-sequences.ts";
import {
  graphemeWidth,
  type TerminalAlignment,
  type TerminalTruncateOptions,
} from "../../src/cli/text.ts";

function assertColumns(label: string, columns: number, minimum: number): void {
  if (!Number.isSafeInteger(columns) || columns < minimum) {
    throw new TypeError(
      `${label} columns must be a ${
        minimum === 0 ? "non-negative" : "positive"
      } safe integer; received ${columns}`,
    );
  }
}

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

function graphemes(value: string): readonly string[] {
  return [...segmenter.segment(value)].map((part) => part.segment);
}

function lineWidth(value: string): number {
  return graphemes(value).reduce(
    (width, grapheme) => width + graphemeWidth(grapheme),
    0,
  );
}

function sliceStyledSegments(
  segments: readonly StyledSegment[],
  start: number,
  end: number,
): readonly StyledSegment[] {
  const sliced: StyledSegment[] = [];
  let offset = 0;
  for (const segment of segments) {
    const segmentStart = offset;
    offset += segment.text.length;
    if (offset <= start) continue;
    if (segmentStart >= end) break;
    const text = segment.text.slice(
      Math.max(0, start - segmentStart),
      Math.min(segment.text.length, end - segmentStart),
    );
    if (text !== "") {
      sliced.push({ text, codes: segment.codes, link: segment.link });
    }
  }
  return sliced;
}

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

const TRAILING_SEPARATORS = /[\s,;:·•—–-]+$/u;

function truncationPoint(
  plain: string,
  fits: number,
  options: TerminalTruncateOptions,
): number {
  if (options.at !== "word") return fits;
  for (let index = fits; index > 0; index -= 1) {
    if (isWhitespace(plain[index]) && !isWhitespace(plain[index - 1])) {
      const kept = plain.slice(0, index).replace(TRAILING_SEPARATORS, "");
      return kept === "" ||
          lineWidth(kept) * 2 < lineWidth(plain.slice(0, fits))
        ? fits
        : kept.length;
    }
  }
  return fits;
}

export function truncateText(
  value: string,
  columns: number,
  ellipsis = "…",
  options: TerminalTruncateOptions = {},
): string {
  assertColumns("truncate", columns, 0);
  const plain = stripAnsi(value).replaceAll("\n", " ");
  if (lineWidth(plain) <= columns) return plain;
  const marker = sliceToWidth(ellipsis, columns);
  const markerWidth = lineWidth(marker);
  const fits = sliceToWidth(plain, columns - markerWidth).length;
  return `${plain.slice(0, truncationPoint(plain, fits, options))}${marker}`;
}

export function truncateStyledText(
  value: string,
  columns: number,
  ellipsis = "…",
  options: TerminalTruncateOptions = {},
): string {
  assertColumns("truncate", columns, 0);
  const segments = parseStyledSource(value).map((segment) =>
    segment.text.includes("\n")
      ? { ...segment, text: segment.text.replaceAll("\n", " ") }
      : segment
  );
  const plain = segments.map((segment) => segment.text).join("");
  if (lineWidth(plain) <= columns) return emitStyledLine(segments);
  const marker = sliceToWidth(ellipsis, columns);
  const fits = sliceToWidth(plain, columns - lineWidth(marker)).length;
  return `${
    emitStyledLine(
      sliceStyledSegments(
        segments,
        0,
        truncationPoint(plain, fits, options),
      ),
    )
  }${marker}`;
}

const WORD_JOINTS: ReadonlySet<string> = new Set(["-", "/"]);

function jointBreak(
  chunk: string,
  joints: ReadonlySet<string> = WORD_JOINTS,
): number {
  let at = 0;
  let joint = 0;
  let content = false;
  for (const grapheme of graphemes(chunk)) {
    at += grapheme.length;
    if (!WORD_JOINTS.has(grapheme)) content = true;
    else if (content && joints.has(grapheme)) joint = at;
  }
  return joint === 0 ? chunk.length : joint;
}

const PATH_JOINTS: ReadonlySet<string> = new Set(["/"]);

function pieceBreak(
  chunk: string,
  remaining: string,
  columns: number,
  paths: boolean,
): number {
  const last = jointBreak(chunk);
  if (!paths) return last;
  const slash = jointBreak(chunk, PATH_JOINTS);
  return slash < last && lineWidth(remaining.slice(slash)) <= columns
    ? slash
    : last;
}

function splitLongWord(
  word: string,
  columns: number,
  paths: boolean,
): readonly string[] {
  const chunks: string[] = [];
  let remaining = word;
  while (remaining !== "") {
    if (lineWidth(remaining) <= columns) {
      chunks.push(remaining);
      break;
    }
    const chunk = sliceToWidth(remaining, columns);
    const piece = chunk === ""
      ? graphemes(remaining)[0] ?? ""
      : chunk.slice(0, pieceBreak(chunk, remaining, columns, paths));
    chunks.push(piece);
    remaining = remaining.slice(piece.length);
  }
  return chunks;
}

function placePiece(
  lines: string[],
  current: string,
  piece: string,
  columns: number,
): string {
  const joined = current === "" ? piece : `${current} ${piece}`;
  if (lineWidth(joined) <= columns) return joined;
  if (current !== "") lines.push(current);
  return piece;
}

function wordPieces(
  word: string,
  columns: number,
  paths: boolean,
): readonly string[] {
  return lineWidth(word) > columns
    ? splitLongWord(word, columns, paths)
    : [word];
}

function linesAfter(
  current: string,
  pieces: readonly string[],
  words: readonly string[],
  from: number,
  columns: number,
): number {
  const lines: string[] = [];
  let line = current;
  for (const piece of pieces) line = placePiece(lines, line, piece, columns);
  for (const word of words.slice(from)) {
    for (const piece of wordPieces(word, columns, false)) {
      line = placePiece(lines, line, piece, columns);
    }
  }
  return lines.length + (line === "" ? 0 : 1);
}

function samePieces(
  first: readonly string[],
  second: readonly string[],
): boolean {
  return first.length === second.length &&
    first.every((piece, index) => piece === second[index]);
}

function wrapParagraph(paragraph: string, columns: number): readonly string[] {
  if (paragraph === "") return [""];
  const words = paragraph.trim().split(/\s+/u).filter((word) => word !== "");
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  for (const [index, word] of words.entries()) {
    const joints = wordPieces(word, columns, false);
    const paths = wordPieces(word, columns, true);
    const pieces = samePieces(joints, paths) ||
        linesAfter(current, paths, words, index + 1, columns) >
          linesAfter(current, joints, words, index + 1, columns)
      ? joints
      : paths;
    for (const piece of pieces) {
      current = placePiece(lines, current, piece, columns);
    }
  }
  if (current !== "") lines.push(current);
  return lines;
}

export function wrapText(value: string, columns: number): readonly string[] {
  assertColumns("wrap", columns, 1);
  return stripAnsi(value).split("\n").flatMap((paragraph) =>
    wrapParagraph(paragraph, columns)
  );
}

export function wrapTextPreservingIndent(
  value: string,
  columns: number,
): readonly string[] {
  assertColumns("wrap", columns, 1);
  return stripAnsi(value).split("\n").flatMap((line) => {
    if (lineWidth(line) <= columns) return [line];
    const leadingSpaces = line.match(/^ +/u)?.[0] ?? "";
    const indent = leadingSpaces.slice(0, Math.max(0, columns - 1));
    const content = line.slice(leadingSpaces.length);
    return wrapParagraph(content, columns - indent.length).map((wrapped) =>
      `${indent}${wrapped}`
    );
  });
}

function isWhitespace(character: string | undefined): boolean {
  return character !== undefined && /\s/u.test(character);
}

function projectionMisalignment(): Error {
  return new Error(
    "styled wrapping desynchronised from its plain projection; this is a package defect",
  );
}

function splitStyledParagraphs(
  segments: readonly StyledSegment[],
): readonly (readonly StyledSegment[])[] {
  const paragraphs: (readonly StyledSegment[])[] = [];
  let current: StyledSegment[] = [];
  for (const segment of segments) {
    const parts = segment.text.split("\n");
    for (let index = 0; index < parts.length; index += 1) {
      if (index > 0) {
        paragraphs.push(current);
        current = [];
      }
      const part = parts[index];
      if (part !== undefined && part !== "") {
        current.push({
          text: part,
          codes: segment.codes,
          link: segment.link,
        });
      }
    }
  }
  paragraphs.push(current);
  return paragraphs;
}

function attributeLine(
  line: string,
  segments: readonly StyledSegment[],
  plain: string,
  cursor: { index: number },
): readonly StyledSegment[] {
  const attributed: StyledSegment[] = [];
  let index = 0;
  while (index < line.length) {
    if (line[index] === " ") {
      const source =
        sliceStyledSegments(segments, cursor.index, cursor.index + 1)[0];
      if (source === undefined || !isWhitespace(plain[cursor.index])) {
        throw projectionMisalignment();
      }
      while (isWhitespace(plain[cursor.index])) cursor.index += 1;
      attributed.push({ text: " ", codes: source.codes, link: source.link });
      index += 1;
      continue;
    }
    const spaceIndex = line.indexOf(" ", index);
    const end = spaceIndex === -1 ? line.length : spaceIndex;
    const token = line.slice(index, end);
    while (isWhitespace(plain[cursor.index])) cursor.index += 1;
    if (!plain.startsWith(token, cursor.index)) throw projectionMisalignment();
    attributed.push(
      ...sliceStyledSegments(
        segments,
        cursor.index,
        cursor.index + token.length,
      ),
    );
    cursor.index += token.length;
    index = end;
  }
  return attributed;
}

export function wrapStyledText(
  value: string,
  columns: number,
): readonly string[] {
  assertColumns("wrap", columns, 1);
  return splitStyledParagraphs(parseStyledSource(value)).flatMap((segments) => {
    const plain = segments.map((segment) => segment.text).join("");
    const cursor = { index: 0 };
    const lines = wrapParagraph(plain, columns).map((line) =>
      emitStyledLine(attributeLine(line, segments, plain, cursor))
    );
    while (isWhitespace(plain[cursor.index])) cursor.index += 1;
    if (cursor.index !== plain.length) throw projectionMisalignment();
    return lines;
  });
}

export function wrapStyledTextPreservingIndent(
  value: string,
  columns: number,
): readonly string[] {
  assertColumns("wrap", columns, 1);
  return splitStyledParagraphs(parseStyledSource(value)).flatMap((segments) => {
    const plain = segments.map((segment) => segment.text).join("");
    if (lineWidth(plain) <= columns) return [emitStyledLine(segments)];
    const leadingSpaces = plain.match(/^ +/u)?.[0] ?? "";
    const indentLength = Math.min(leadingSpaces.length, columns - 1);
    const indent = emitStyledLine(
      sliceStyledSegments(segments, 0, indentLength),
    );
    const content = emitStyledLine(
      sliceStyledSegments(segments, leadingSpaces.length, plain.length),
    );
    return wrapStyledText(content, columns - indentLength).map((line) =>
      `${indent}${line}`
    );
  });
}

export function padText(
  value: string,
  columns: number,
  alignment: TerminalAlignment = "start",
): string {
  assertColumns("pad", columns, 0);
  const missing = Math.max(0, columns - measureText(value));
  if (alignment === "end") return `${" ".repeat(missing)}${value}`;
  if (alignment === "center") {
    const before = Math.floor(missing / 2);
    return `${" ".repeat(before)}${value}${" ".repeat(missing - before)}`;
  }
  return `${value}${" ".repeat(missing)}`;
}

export function fillStyledLine(
  content: string,
  columns: number,
  style: TerminalTextStyle,
  capabilities: TerminalCapabilities,
): string {
  assertColumns("fill", columns, 0);
  if (content.includes("\n")) {
    throw new TypeError("fillStyledLine fits exactly one line");
  }
  const fitted = truncateStyledText(
    content,
    columns,
    terminalGlyph("ellipsis", capabilities),
  );
  const missing = columns - measureText(fitted);
  const base = styleCodes(style, capabilities);
  return emitStyledLine([
    ...underlayStyledSegments(parseStyledSource(fitted), base),
    { text: " ".repeat(missing), codes: base, link: undefined },
  ]);
}
