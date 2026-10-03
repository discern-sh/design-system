/**
 * Grapheme-aware terminal measurement, wrapping, truncation, and padding.
 *
 * Every helper segments its input a bounded number of times and lays it out
 * from those measured graphemes — never segmenting again what remains after
 * each line or piece it cuts — so its cost grows in step with the input
 * however long a word or a line runs.
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
  styledSegmentReader,
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

/**
 * Visit each grapheme of `text` in order with its cells and code-unit
 * offset, stopping once `visit` returns `false`. This is the module's only
 * call into the segmenter: a helper visits its input a bounded number of
 * times and never segments again what remains after a line or piece it cuts.
 */
function visitGraphemes(
  text: string,
  visit: (grapheme: string, cells: number, offset: number) => boolean,
): void {
  for (const { segment, index } of segmenter.segment(text)) {
    if (!visit(segment, graphemeWidth(segment), index)) return;
  }
}

/** The cells `value` occupies on one line. */
function lineWidth(value: string): number {
  let width = 0;
  visitGraphemes(value, (_, cells) => {
    width += cells;
    return true;
  });
  return width;
}

/** Measure the widest visible line after ignoring ANSI control sequences. */
export function measureText(value: string): number {
  let widest = 0;
  for (const line of stripAnsi(value).split("\n")) {
    widest = Math.max(widest, lineWidth(line));
  }
  return widest;
}

/** Whether `value` fits `columns` on one line, measured only until it does not. */
function fitsLine(value: string, columns: number): boolean {
  let width = 0;
  visitGraphemes(value, (_, cells) => {
    width += cells;
    return width <= columns;
  });
  return width <= columns;
}

/**
 * The prefix of `value` that fits `columns`, stopping at the first grapheme
 * that does not fit, and its cells.
 */
function fitPrefix(
  value: string,
  columns: number,
): { readonly text: string; readonly width: number } {
  let width = 0;
  let end = 0;
  visitGraphemes(value, (grapheme, cells, offset) => {
    if (width + cells > columns) return false;
    width += cells;
    end = offset + grapheme.length;
    return true;
  });
  return { text: value.slice(0, end), width };
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
const TRAILING_SEPARATOR = /[\s,;:·•—–-]/u;

/**
 * The length of `plain`'s prefix a truncation keeps, given the `fits`
 * code units — `fitted` cells — that fit before the marker: all of them, or
 * with `word`, those up to the last word that ends inside them while that
 * keeps at least half of their cells.
 */
function truncationPoint(
  plain: string,
  fits: number,
  fitted: number,
  options: TerminalTruncateOptions,
): number {
  if (options.at !== "word") return fits;
  for (let index = fits; index > 0; index -= 1) {
    if (isWhitespace(plain[index]) && !isWhitespace(plain[index - 1])) {
      let kept = index;
      while (kept > 0 && TRAILING_SEPARATOR.test(plain[kept - 1] ?? "")) {
        kept -= 1;
      }
      return kept === 0 || lineWidth(plain.slice(0, kept)) * 2 < fitted
        ? fits
        : kept;
    }
  }
  return fits;
}

/**
 * Where truncating `plain` to `columns` ends it and the marker that follows,
 * or `undefined` when `plain` fits. One visit measures the prefix that fits
 * beside the marker and stops as soon as the line is known not to fit.
 */
function truncation(
  plain: string,
  columns: number,
  ellipsis: string,
  options: TerminalTruncateOptions,
): { readonly end: number; readonly marker: string } | undefined {
  const marker = fitPrefix(ellipsis, columns);
  const room = columns - marker.width;
  let width = 0;
  let fitting = true;
  let fitted = 0;
  let fits = 0;
  visitGraphemes(plain, (grapheme, cells, offset) => {
    width += cells;
    if (fitting && fitted + cells <= room) {
      fitted += cells;
      fits = offset + grapheme.length;
    } else fitting = false;
    return width <= columns;
  });
  if (width <= columns) return undefined;
  return {
    end: truncationPoint(plain, fits, fitted, options),
    marker: marker.text,
  };
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
  const cut = truncation(plain, columns, ellipsis, options);
  return cut === undefined ? plain : `${plain.slice(0, cut.end)}${cut.marker}`;
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
  const cut = truncation(plain, columns, ellipsis, options);
  if (cut === undefined) return emitStyledLine(segments);
  return `${
    emitStyledLine(sliceStyledSegments(segments, 0, cut.end))
  }${cut.marker}`;
}

/**
 * Graphemes after which a word wider than its line breaks before it is cut
 * mid-segment: identifiers, paths, and addresses hold no spaces but join
 * their parts with these.
 */
const WORD_JOINTS: ReadonlySet<string> = new Set(["-", "/"]);

/** A path's names are its units: `/` is the joint a path-like break prefers. */
const PATH_JOINTS: ReadonlySet<string> = new Set(["/"]);

/** One word segmented once: its graphemes, their cells, and their offsets. */
interface SegmentedWord {
  readonly text: string;
  readonly graphemes: readonly string[];
  readonly cells: readonly number[];
  /** Code-unit offset of each grapheme, then the word's length. */
  readonly offsets: readonly number[];
  /** Cells from each grapheme to the word's end, then zero. */
  readonly rest: readonly number[];
}

/** One piece a word places on a line: the whole word, or a line-wide part. */
interface Piece {
  readonly text: string;
  readonly width: number;
  /** The piece's first and last graphemes, which meet a joining space. */
  readonly first: string;
  readonly last: string;
}

/**
 * A word's pieces, breaking after the last joint that fits and, separately,
 * preferring a path's last `/`; one array when the two break alike.
 */
interface WordPieces {
  readonly joints: readonly Piece[];
  readonly paths: readonly Piece[];
}

/**
 * Where a line-wide chunk `[start, end)` of `word` breaks: after its last
 * joint that follows a grapheme other than a joint — so a break never
 * strands a lone `-` or `//` on its line — or with `paths`, after its last
 * such `/` when everything after that `/` fits the next line whole, so a
 * path keeps its last name together; at the chunk's end when it holds no
 * joint.
 */
function chunkBreak(
  word: SegmentedWord,
  start: number,
  end: number,
  columns: number,
  paths: boolean,
): number {
  let content = false;
  let joint = end;
  let slash = end;
  for (let index = start; index < end; index += 1) {
    const grapheme = word.graphemes[index] ?? "";
    if (!WORD_JOINTS.has(grapheme)) content = true;
    else if (content) {
      joint = index + 1;
      if (PATH_JOINTS.has(grapheme)) slash = index + 1;
    }
  }
  return paths && slash < joint && (word.rest[slash] ?? 0) <= columns
    ? slash
    : joint;
}

/**
 * Where a word wider than its line breaks into line-wide pieces, as the
 * grapheme index ending each: each breaks after the last `-` or `/` that
 * fits — with `paths`, after an earlier `/` when the rest then fits one
 * line — and mid-segment only where none does. One pass over the word's
 * graphemes: a chunk past its break holds no joint, so the next piece
 * takes it whole.
 */
function splitLongWord(
  word: SegmentedWord,
  columns: number,
  paths: boolean,
): readonly number[] {
  const ends: number[] = [];
  const count = word.graphemes.length;
  let start = 0;
  while (start < count) {
    if ((word.rest[start] ?? 0) <= columns) {
      ends.push(count);
      break;
    }
    let width = 0;
    let chunkEnd = start;
    for (
      let cells = word.cells[chunkEnd];
      cells !== undefined && width + cells <= columns;
      cells = word.cells[chunkEnd]
    ) {
      width += cells;
      chunkEnd += 1;
    }
    const end = chunkEnd === start
      ? start + 1
      : chunkBreak(word, start, chunkEnd, columns, paths);
    ends.push(end);
    start = end;
  }
  return ends;
}

/** The pieces `word` places, cut at the grapheme indices in `ends`. */
function cutPieces(
  word: SegmentedWord,
  ends: readonly number[],
): readonly Piece[] {
  let start = 0;
  return ends.map((end) => {
    const piece = {
      text: word.text.slice(word.offsets[start], word.offsets[end]),
      width: (word.rest[start] ?? 0) - (word.rest[end] ?? 0),
      first: word.graphemes[start] ?? "",
      last: word.graphemes[end - 1] ?? "",
    };
    start = end;
    return piece;
  });
}

/** The pieces one word places: itself, or a long word's line-wide pieces. */
function wordPieces(text: string, columns: number): WordPieces {
  const graphemes: string[] = [];
  const cells: number[] = [];
  const offsets: number[] = [];
  let width = 0;
  visitGraphemes(text, (grapheme, graphemeCells, offset) => {
    graphemes.push(grapheme);
    cells.push(graphemeCells);
    offsets.push(offset);
    width += graphemeCells;
    return true;
  });
  offsets.push(text.length);
  if (width <= columns) {
    const whole = [{
      text,
      width,
      first: graphemes[0] ?? "",
      last: graphemes.at(-1) ?? "",
    }];
    return { joints: whole, paths: whole };
  }
  const rest = [...cells, 0];
  for (let index = cells.length - 1; index >= 0; index -= 1) {
    rest[index] = (rest[index] ?? 0) + (rest[index + 1] ?? 0);
  }
  const word = { text, graphemes, cells, offsets, rest };
  const jointEnds = splitLongWord(word, columns, false);
  const pathEnds = splitLongWord(word, columns, true);
  const joints = cutPieces(word, jointEnds);
  const same = jointEnds.length === pathEnds.length &&
    jointEnds.every((end, index) => end === pathEnds[index]);
  return { joints, paths: same ? joints : cutPieces(word, pathEnds) };
}

/** Space-adjacent pairs already segmented; a paragraph repeats a handful. */
const spacePairs = new Map<string, boolean>();

/** Whether `pair` — one character and a space — segments as one grapheme. */
function joinsSpace(pair: string): boolean {
  const known = spacePairs.get(pair);
  if (known !== undefined) return known;
  let count = 0;
  visitGraphemes(pair, () => {
    count += 1;
    return true;
  });
  if (spacePairs.size >= 4096) spacePairs.clear();
  spacePairs.set(pair, count === 1);
  return count === 1;
}

/** The final code point of `value`, as a string. */
function finalCharacter(value: string): string {
  const low = value.charCodeAt(value.length - 1);
  const high = value.charCodeAt(value.length - 2);
  return low >= 0xdc00 && low <= 0xdfff && high >= 0xd800 && high <= 0xdbff
    ? value.slice(-2)
    : value.slice(-1);
}

/**
 * The cells the space joining two pieces adds to a line: one, unless the
 * space clusters with a neighbour — after a character that prepends itself
 * to what follows, or before a combining or spacing mark — when the joined
 * cluster is measured whole.
 */
function spaceCells(last: string, first: string): number {
  if (last.charCodeAt(last.length - 1) < 0x80 && first.charCodeAt(0) < 0x80) {
    return 1;
  }
  const firstCharacter = String.fromCodePoint(first.codePointAt(0) ?? 0x20);
  if (
    !joinsSpace(`${finalCharacter(last)} `) &&
    !joinsSpace(` ${firstCharacter}`)
  ) {
    return 1;
  }
  return lineWidth(`${last} ${first}`) - graphemeWidth(last) -
    graphemeWidth(first);
}

/** An unfinished line while a paragraph is laid out: its cells and last grapheme. */
interface OpenLine {
  readonly width: number;
  readonly last: string;
}

/** A line holding `piece` alone. */
function startLine(piece: Piece): OpenLine {
  return { width: piece.width, last: piece.last };
}

/**
 * `line` with `piece` joined after it by a space, or `undefined` when the
 * joined line would be wider than `columns` and the piece starts the next.
 */
function extendLine(
  line: OpenLine,
  piece: Piece,
  columns: number,
): OpenLine | undefined {
  const width = line.width + spaceCells(line.last, piece.first) + piece.width;
  return width <= columns ? { width, last: piece.last } : undefined;
}

/**
 * Count the lines a paragraph's words from some index take after a line
 * left open and one word's chosen pieces. Later words break at joints. A
 * line that starts on a fresh piece lays the rest out the same way however
 * it was reached, so its count is kept and shared, and choosing for every
 * path in a long paragraph lays each stretch out a bounded number of times.
 */
function followingLineCounter(
  words: readonly WordPieces[],
  columns: number,
): (
  open: OpenLine | undefined,
  pieces: readonly Piece[],
  from: number,
) => number {
  const sequence: Piece[] = [];
  const starts: number[] = [];
  for (const word of words) {
    starts.push(sequence.length);
    sequence.push(...word.joints);
  }
  starts.push(sequence.length);
  const counted = new Array<number>(sequence.length).fill(0);

  /** Where the line the piece at `start` begins ends. */
  const lineEnd = (start: number): number => {
    let end = start;
    let line: OpenLine | undefined;
    for (
      let piece = sequence[end];
      piece !== undefined;
      piece = sequence[end]
    ) {
      line = line === undefined
        ? startLine(piece)
        : extendLine(line, piece, columns);
      if (line === undefined) break;
      end += 1;
    }
    return end;
  };

  /** Lines from the piece at `start`, which begins one, to the paragraph's end. */
  const linesFrom = (start: number): number => {
    const chain: number[] = [];
    let at = start;
    while (at < sequence.length && counted[at] === 0) {
      chain.push(at);
      at = lineEnd(at);
    }
    let lines = counted[at] ?? 0;
    for (const link of chain.reverse()) {
      lines += 1;
      counted[link] = lines;
    }
    return lines;
  };

  return (open, pieces, from) => {
    let finished = 0;
    let line = open;
    for (const piece of pieces) {
      const joined = line === undefined
        ? undefined
        : extendLine(line, piece, columns);
      if (line !== undefined && joined === undefined) finished += 1;
      line = joined ?? startLine(piece);
    }
    let at = starts[from] ?? sequence.length;
    if (line === undefined) return finished + linesFrom(at);
    for (let piece = sequence[at]; piece !== undefined; piece = sequence[at]) {
      line = extendLine(line, piece, columns);
      if (line === undefined) return finished + 1 + linesFrom(at);
      at += 1;
    }
    return finished + 1;
  };
}

function wrapParagraph(paragraph: string, columns: number): readonly string[] {
  if (paragraph === "") return [""];
  const words = paragraph.trim().split(/\s+/u).filter((word) => word !== "")
    .map((word) => wordPieces(word, columns));
  if (words.length === 0) return [""];
  let countLines: ReturnType<typeof followingLineCounter> | undefined;
  const lines: string[] = [];
  let parts: string[] = [];
  let line: OpenLine | undefined;
  for (const [index, word] of words.entries()) {
    let pieces = word.joints;
    if (word.paths !== word.joints) {
      countLines ??= followingLineCounter(words, columns);
      // A path keeps its last name whole when that costs the paragraph no line.
      if (
        countLines(line, word.paths, index + 1) <=
          countLines(line, word.joints, index + 1)
      ) pieces = word.paths;
    }
    for (const piece of pieces) {
      const joined = line === undefined
        ? undefined
        : extendLine(line, piece, columns);
      if (joined !== undefined) parts.push(piece.text);
      else {
        if (line !== undefined) lines.push(parts.join(" "));
        parts = [piece.text];
      }
      line = joined ?? startLine(piece);
    }
  }
  if (line !== undefined) lines.push(parts.join(" "));
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
    if (fitsLine(line, columns)) return [line];
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
  read: (start: number, end: number) => readonly StyledSegment[],
  plain: string,
  cursor: { index: number },
): readonly StyledSegment[] {
  const attributed: StyledSegment[] = [];
  let index = 0;
  while (index < line.length) {
    if (line[index] === " ") {
      const source = read(cursor.index, cursor.index + 1)[0];
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
    attributed.push(...read(cursor.index, cursor.index + token.length));
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
    const read = styledSegmentReader(segments);
    const cursor = { index: 0 };
    const lines = wrapParagraph(plain, columns).map((line) =>
      emitStyledLine(attributeLine(line, read, plain, cursor))
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
    if (fitsLine(plain, columns)) return [emitStyledLine(segments)];
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
