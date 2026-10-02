/**
 * Grapheme-aware terminal measurement, wrapping, truncation, and padding.
 *
 * @module
 */

import { stripAnsi, type TerminalTextStyle } from "./ansi.ts";
import type { TerminalCapabilities } from "./capabilities.ts";
import { terminalGlyph } from "./terminal-glyphs.ts";
import { eastAsianWidthKind } from "../unicode/east-asian-width.ts";
import {
  emitStyledLine,
  parseStyledSource,
  sliceStyledSegments,
  styleCodes,
  type StyledSegment,
  underlayStyledSegments,
} from "./styled-sequences.ts";

/** Horizontal alignment used by terminal padding and column layout. */
export type TerminalAlignment = "start" | "center" | "end";

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
// RGI sequences request emoji presentation; pictographic membership alone
// still includes ordinary text symbols whose cell width comes from EAW.
const rgiEmoji = /^\p{RGI_Emoji}$/v;

function graphemes(value: string): readonly string[] {
  return [...segmenter.segment(value)].map((part) => part.segment);
}

/** Measure one Unicode grapheme in terminal character cells. */
export function graphemeWidth(grapheme: string): number {
  if (grapheme === "" || grapheme === "\n" || grapheme === "\r") return 0;
  if (/^[\p{Cc}\p{Cf}\p{Mn}\p{Me}]+$/u.test(grapheme)) return 0;
  if (rgiEmoji.test(grapheme)) return 2;
  const base = [...grapheme].find((character) =>
    !/[\p{Mn}\p{Me}\p{Cf}]/u.test(character)
  );
  const codePoint = base?.codePointAt(0);
  return codePoint !== undefined && eastAsianWidthKind(codePoint) === "wide"
    ? 2
    : 1;
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

/** Where truncation cuts a line that does not fit. */
export interface TerminalTruncateOptions {
  /**
   * `grapheme`, the default, keeps as much as fits, as a name or an
   * identifier wants. `word` cuts after the last whole word that fits and
   * drops a clause separator left before the marker, so a sentence reads as
   * abbreviated rather than broken; it cuts mid-word instead when the word
   * cut would keep less than half of what fits — a first word wider than
   * the room, or a short word before a long token — so the line keeps its
   * information.
   */
  readonly at?: "grapheme" | "word";
}

/** Separators a word cut leaves off before its marker: `see it,…` reads `see it…`. */
const TRAILING_SEPARATORS = /[\s,;:·•—–-]+$/u;

/**
 * The length of `plain`'s prefix a truncation keeps, given the `fits`
 * code units that fit before the marker: all of them, or with `word`, those
 * up to the last word that ends inside them while that keeps at least half
 * of their cells.
 */
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

/** Truncate plain text to a visible width without splitting a grapheme. */
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

/**
 * Truncate package-styled text to a visible width without splitting a
 * grapheme or leaving styling open.
 *
 * Semantics mirror {@linkcode truncateText}: newlines flatten to spaces and
 * a fitting value comes back whole — here with its styling preserved rather
 * than stripped. When truncation applies, the kept text retains its styling
 * and open hyperlink, everything closes before the marker, and the always
 * unstyled marker ends the line, so a truncated hyperlink can never leak an
 * open envelope. Accepted input and canonical re-emission follow
 * {@linkcode wrapStyledText}. `options.at` chooses the cut as for
 * {@linkcode truncateText}.
 */
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

/**
 * Graphemes after which a word wider than its line breaks before it is cut
 * mid-segment: identifiers, paths, and addresses hold no spaces but join
 * their parts with these.
 */
const WORD_JOINTS: ReadonlySet<string> = new Set(["-", "/"]);

/**
 * The length of `chunk` up to and including its last joint — the last of
 * `joints` when given — or the whole chunk when it holds none after a
 * grapheme that is not itself a joint, so a break never strands a lone `-`
 * or `//` on its line.
 */
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

/** A path's names are its units: `/` is the joint a path-like break prefers. */
const PATH_JOINTS: ReadonlySet<string> = new Set(["/"]);

/**
 * Where a line-wide `chunk` of `remaining` breaks: after its last joint,
 * or with `paths`, after its last `/` when everything after that `/` fits
 * the next line whole, so a path keeps its last name together.
 */
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

/**
 * A word wider than its line, cut into line-wide pieces: each breaks after
 * the last `-` or `/` that fits — with `paths`, after an earlier `/` when
 * the rest then fits one line — and mid-segment only where none does.
 */
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

/** Place one piece after `current`, pushing finished lines; returns the open line. */
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

/** The pieces one word places: itself, or a long word's line-wide pieces. */
function wordPieces(
  word: string,
  columns: number,
  paths: boolean,
): readonly string[] {
  return lineWidth(word) > columns
    ? splitLongWord(word, columns, paths)
    : [word];
}

/** Lines that `pieces` and then `words` from `from` take after `current`. */
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
    // A path keeps its last name whole when that costs the paragraph no line.
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

/**
 * Wrap plain text into visible-width-bounded lines at word boundaries. A word
 * wider than a whole line breaks after the last `-` or `/` that fits —
 * after an earlier `/` when everything after it then fits the next line and
 * the paragraph takes no more lines, so a path keeps its last name whole —
 * and mid-segment only where none does.
 */
export function wrapText(value: string, columns: number): readonly string[] {
  assertColumns("wrap", columns, 1);
  return stripAnsi(value).split("\n").flatMap((paragraph) =>
    wrapParagraph(paragraph, columns)
  );
}

/**
 * Wrap plain text into visible-width-bounded lines while preserving each
 * line's leading space indentation as a hanging indent on its wrapped
 * continuations, so indented structures — stack traces, nested build
 * output — keep their shape across wrapping. A line that already fits is
 * kept byte-intact, interior spacing included; only over-wide content
 * re-flows through the {@linkcode wrapText} word-boundary authority.
 * Indentation wider than the available columns is reduced to leave at
 * least one content cell.
 */
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

/**
 * Wrap package-styled text into independently valid styled lines.
 *
 * The plain projection wraps through the same word-boundary authority as
 * {@linkcode wrapText}, so the visible layout of the two families is
 * identical; the SGR styling and open hyperlinks active at each point then
 * re-attribute onto every produced line. Styling and hyperlink envelopes
 * close at each line end and reopen on the next line, so any single line is
 * safe to prefix, indent, or excerpt on its own. Blank lines emit as empty
 * strings, and styling that dresses no visible text is dropped rather than
 * re-emitted.
 *
 * The input must carry only package-emitted sequences — SGR styling from
 * {@linkcode styleText} or `renderStyledSpans` and hyperlink envelopes from
 * `styleHyperlink`; a foreign, malformed, or unterminated sequence throws a
 * `TypeError`. Styling left open at the end of the input is normalised:
 * every emitted line still closes what it opened. Output lines re-emit
 * styling canonically (attributes in the package's fixed order, one reset
 * per run), preserving the original colour depth byte-for-byte.
 */
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

/**
 * Wrap package-styled text while retaining each source line's leading-space
 * indentation on every continuation. This is the styled counterpart to
 * {@linkcode wrapTextPreservingIndent}: fitting lines keep their complete
 * styled projection, while over-wide content reflows through
 * {@linkcode wrapStyledText} so every emitted line owns a closed styling and
 * hyperlink envelope.
 */
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

/**
 * Pad one line to a visible width without truncating over-wide content.
 * Styled and hyperlinked content pads by its visible width alone — escape
 * sequences and OSC 8 envelopes measure zero cells — and the added spaces
 * stay outside every styled run.
 */
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

/**
 * Fit one styled line to exactly `columns` cells with a style painted
 * inside it, so a full-width bar or a tinted panel row keeps its fill under
 * every cell. {@linkcode padText} pads outside styled runs; here the style
 * underlays the whole line instead: its background shows wherever a run
 * sets none of its own, its foreground colours unstyled text, its
 * attributes join every run, and the padding carries it too. Over-wide
 * content truncates with an ellipsis before the fill is applied. Where the
 * capabilities cannot paint the style — a surface fill at 16 colours, or
 * any colour without colour — the line is simply padded.
 *
 * The content must be one line of package-styled text; a newline throws a
 * `TypeError`, as does any sequence {@linkcode wrapStyledText} rejects.
 */
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
