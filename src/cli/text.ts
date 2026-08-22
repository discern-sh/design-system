/**
 * Grapheme-aware terminal measurement, wrapping, truncation, and padding.
 *
 * @module
 */

import { stripAnsi } from "./ansi.ts";
import { eastAsianWidthKind } from "./east-asian-width.ts";
import {
  emitStyledLine,
  parseStyledSource,
  sliceStyledSegments,
  type StyledSegment,
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

/** Truncate plain text to a visible width without splitting a grapheme. */
export function truncateText(
  value: string,
  columns: number,
  ellipsis = "…",
): string {
  assertColumns("truncate", columns, 0);
  const plain = stripAnsi(value).replaceAll("\n", " ");
  if (lineWidth(plain) <= columns) return plain;
  const marker = sliceToWidth(ellipsis, columns);
  const markerWidth = lineWidth(marker);
  return `${sliceToWidth(plain, columns - markerWidth)}${marker}`;
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
 * {@linkcode wrapStyledText}.
 */
export function truncateStyledText(
  value: string,
  columns: number,
  ellipsis = "…",
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
  const kept = sliceToWidth(plain, columns - lineWidth(marker));
  return `${
    emitStyledLine(sliceStyledSegments(segments, 0, kept.length))
  }${marker}`;
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
