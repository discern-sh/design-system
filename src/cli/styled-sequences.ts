/**
 * Internal authority for the escape-sequence byte shapes behind styled
 * terminal text: SGR styling and OSC 8 hyperlink envelopes. Every package
 * module that writes, strips, or re-attributes those bytes derives from the
 * definitions here, so no second byte grammar can drift. The module is not
 * part of the public `./cli` surface.
 *
 * @module
 */

import type { TerminalTextStyle } from "./ansi.ts";
import type { TerminalCapabilities } from "./capabilities.ts";
import { inspectSafeAsciiUrlReference } from "../url-reference.ts";

const ESCAPE = String.fromCharCode(27);
const BELL = String.fromCharCode(7);

function ansi16Foreground(index: number): number {
  return index < 8 ? 30 + index : 90 + index - 8;
}

function ansi16Background(index: number): number {
  return index < 8 ? 40 + index : 100 + index - 8;
}

/**
 * Canonical SGR codes for one style at the supplied capabilities, in the
 * package's fixed attribute order. A background without a 16-colour index —
 * a surface fill — is omitted at that depth rather than approximated.
 * Without colour nothing is emitted, except bold and underline where the
 * capabilities keep emphasis without colour.
 */
export function styleCodes(
  style: TerminalTextStyle,
  capabilities: TerminalCapabilities,
): readonly number[] {
  if (capabilities.colorDepth === "none") {
    if (capabilities.emphasisWithoutColor !== true) return [];
    return [
      ...(style.bold === true ? [1] : []),
      ...(style.underline === true ? [4] : []),
    ];
  }
  const codes: number[] = [];
  if (style.bold === true) codes.push(1);
  if (style.dim === true) codes.push(2);
  if (style.italic === true) codes.push(3);
  if (style.underline === true) codes.push(4);
  if (style.strikethrough === true) codes.push(9);
  if (style.color !== undefined) {
    if (capabilities.colorDepth === "truecolor") {
      codes.push(38, 2, style.color.red, style.color.green, style.color.blue);
    } else if (capabilities.colorDepth === "ansi256") {
      codes.push(38, 5, style.color.ansi256);
    } else codes.push(ansi16Foreground(style.color.ansi16));
  }
  const background = style.background;
  if (background !== undefined) {
    if (capabilities.colorDepth === "truecolor") {
      codes.push(48, 2, background.red, background.green, background.blue);
    } else if (capabilities.colorDepth === "ansi256") {
      codes.push(48, 5, background.ansi256);
    } else if (background.ansi16 !== undefined) {
      codes.push(ansi16Background(background.ansi16));
    }
  }
  return codes;
}

/** Regex source matching one complete ANSI CSI sequence. */
export const CSI_PATTERN = `${ESCAPE}\\[[0-?]*[ -/]*[@-~]`;

/** Regex source matching one complete OSC sequence with BEL or ST ending. */
export const OSC_PATTERN =
  `${ESCAPE}\\][^${BELL}${ESCAPE}]*(?:${BELL}|${ESCAPE}\\\\)`;

/** Compose one SGR sequence from already-canonical numeric codes. */
export function sgrSequence(codes: readonly number[]): string {
  return `${ESCAPE}[${codes.join(";")}m`;
}

/**
 * Compose one OSC 8 hyperlink boundary with the ST ending. A non-empty
 * target opens a hyperlink; the empty string closes the open hyperlink.
 */
export function hyperlinkSequence(target: string): string {
  return `${ESCAPE}]8;;${target}${ESCAPE}\\`;
}

/** Whether an OSC 8 target satisfies the package URL-reference policy. */
export function validHyperlinkTarget(target: string): boolean {
  return inspectSafeAsciiUrlReference(target).ok;
}

/** One uniformly styled run of text inside parsed package-styled source. */
export interface StyledSegment {
  readonly text: string;
  /** Canonical SGR codes active across this run; empty for plain text. */
  readonly codes: readonly number[];
  /** Open OSC 8 hyperlink target across this run, when one is active. */
  readonly link: string | undefined;
}

const ATTRIBUTE_CODES = [1, 2, 3, 4, 9] as const;

const SGR_AT = new RegExp(`${ESCAPE}\\[([0-9;]*)m`, "yu");
const LINK_AT = new RegExp(
  `${ESCAPE}\\]8;;([^${BELL}${ESCAPE}]*)${ESCAPE}\\\\`,
  "yu",
);

function rejectSequence(value: string, index: number): never {
  throw new TypeError(
    `styled text contains an unsupported or unterminated sequence at ${
      JSON.stringify(value.slice(index, index + 12))
    }; compose styling through styleText, renderStyledSpans, and styleHyperlink`,
  );
}

function channel(codes: readonly number[], index: number): number | undefined {
  const value = codes[index];
  return value !== undefined && Number.isInteger(value) && value >= 0 &&
      value <= 255
    ? value
    : undefined;
}

interface SgrState {
  readonly attributes: Set<number>;
  foreground: readonly number[] | undefined;
  background: readonly number[] | undefined;
}

function applySgr(
  parameters: string,
  state: SgrState,
  reject: () => never,
): void {
  const items = parameters.split(";");
  if (items.some((item) => item === "")) reject();
  const codes = items.map(Number);
  let index = 0;
  while (index < codes.length) {
    const code = codes[index];
    if (code === undefined) break;
    if (code === 0) {
      state.attributes.clear();
      state.foreground = undefined;
      state.background = undefined;
    } else if (ATTRIBUTE_CODES.some((attribute) => attribute === code)) {
      state.attributes.add(code);
    } else if ((code >= 30 && code <= 37) || (code >= 90 && code <= 97)) {
      state.foreground = [code];
    } else if ((code >= 40 && code <= 47) || (code >= 100 && code <= 107)) {
      state.background = [code];
    } else if (code === 38 && codes[index + 1] === 5) {
      const value = channel(codes, index + 2);
      if (value === undefined) reject();
      state.foreground = [38, 5, value];
      index += 2;
    } else if (code === 38 && codes[index + 1] === 2) {
      const red = channel(codes, index + 2);
      const green = channel(codes, index + 3);
      const blue = channel(codes, index + 4);
      if (red === undefined || green === undefined || blue === undefined) {
        reject();
      }
      state.foreground = [38, 2, red, green, blue];
      index += 4;
    } else if (code === 48 && codes[index + 1] === 5) {
      const value = channel(codes, index + 2);
      if (value === undefined) reject();
      state.background = [48, 5, value];
      index += 2;
    } else if (code === 48 && codes[index + 1] === 2) {
      const red = channel(codes, index + 2);
      const green = channel(codes, index + 3);
      const blue = channel(codes, index + 4);
      if (red === undefined || green === undefined || blue === undefined) {
        reject();
      }
      state.background = [48, 2, red, green, blue];
      index += 4;
    } else {
      reject();
    }
    index += 1;
  }
}

function canonicalCodes(state: SgrState): readonly number[] {
  return [
    ...ATTRIBUTE_CODES.filter((code) => state.attributes.has(code)),
    ...(state.foreground ?? []),
    ...(state.background ?? []),
  ];
}

/**
 * Layer canonical base codes beneath every run, as inherited style: the
 * base attributes join each run's own, and the base colours apply wherever
 * a run sets none of its own.
 */
export function underlayStyledSegments(
  segments: readonly StyledSegment[],
  base: readonly number[],
): readonly StyledSegment[] {
  if (base.length === 0) return segments;
  const reject = (): never => {
    throw new TypeError("underlay codes must be canonical SGR codes");
  };
  return segments.map((segment) => {
    const state: SgrState = {
      attributes: new Set(),
      foreground: undefined,
      background: undefined,
    };
    applySgr(base.join(";"), state, reject);
    if (segment.codes.length > 0) {
      applySgr(segment.codes.join(";"), state, reject);
    }
    return { ...segment, codes: canonicalCodes(state) };
  });
}

function sameRun(
  segment: StyledSegment,
  codes: readonly number[],
  link: string | undefined,
): boolean {
  return segment.link === link &&
    segment.codes.length === codes.length &&
    segment.codes.every((code, index) => code === codes[index]);
}

/** Merge adjacent same-state runs and drop empty ones. */
export function mergeStyledSegments(
  segments: readonly StyledSegment[],
): readonly StyledSegment[] {
  const merged: StyledSegment[] = [];
  for (const segment of segments) {
    if (segment.text === "") continue;
    const previous = merged[merged.length - 1];
    if (
      previous !== undefined && sameRun(previous, segment.codes, segment.link)
    ) {
      merged[merged.length - 1] = {
        text: previous.text + segment.text,
        codes: previous.codes,
        link: previous.link,
      };
    } else merged.push(segment);
  }
  return merged;
}

/**
 * Parse package-emitted styled text into uniformly styled runs, tracking SGR
 * attributes, colour, and open hyperlink envelopes exactly as a terminal
 * would. Only sequences the package composes are accepted: SGR resets,
 * attribute, foreground- and background-colour codes, and complete ST-ended
 * OSC 8 envelopes whose targets satisfy the shared safe ASCII URL-reference
 * policy. Anything else — foreign controls, unterminated sequences, BEL-ended
 * envelopes — throws a `TypeError` naming the offending bytes. Styling left
 * open at the end of input simply ends with the final run.
 */
export function parseStyledSource(value: string): readonly StyledSegment[] {
  const segments: StyledSegment[] = [];
  const state: SgrState = {
    attributes: new Set(),
    foreground: undefined,
    background: undefined,
  };
  let link: string | undefined;
  let text = "";
  let index = 0;

  const flush = () => {
    if (text === "") return;
    segments.push({ text, codes: canonicalCodes(state), link });
    text = "";
  };

  while (index < value.length) {
    const escapeIndex = value.indexOf(ESCAPE, index);
    if (escapeIndex === -1) {
      text += value.slice(index);
      break;
    }
    text += value.slice(index, escapeIndex);
    const reject = () => rejectSequence(value, escapeIndex);
    SGR_AT.lastIndex = escapeIndex;
    const sgr = SGR_AT.exec(value);
    if (sgr !== null) {
      flush();
      applySgr(sgr[1] ?? "", state, reject);
      index = SGR_AT.lastIndex;
      continue;
    }
    LINK_AT.lastIndex = escapeIndex;
    const boundary = LINK_AT.exec(value);
    if (boundary === null) rejectSequence(value, escapeIndex);
    const target = boundary[1] ?? "";
    if (target !== "" && !validHyperlinkTarget(target)) reject();
    flush();
    link = target === "" ? undefined : target;
    index = LINK_AT.lastIndex;
  }
  flush();
  return mergeStyledSegments(segments);
}

/** Slice runs to a code-unit range of their concatenated plain text. */
export function sliceStyledSegments(
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

/**
 * Emit runs as one independently valid styled line: every hyperlink opened
 * on the line closes on it, and every styled run carries its own SGR open
 * and reset, so the line is safe to prefix, indent, or excerpt on its own.
 */
export function emitStyledLine(segments: readonly StyledSegment[]): string {
  let output = "";
  let link: string | undefined;
  for (const segment of mergeStyledSegments(segments)) {
    if (segment.link !== link) {
      if (link !== undefined) output += hyperlinkSequence("");
      if (segment.link !== undefined) {
        output += hyperlinkSequence(segment.link);
      }
      link = segment.link;
    }
    output += segment.codes.length === 0
      ? segment.text
      : `${sgrSequence(segment.codes)}${segment.text}${sgrSequence([0])}`;
  }
  if (link !== undefined) output += hyperlinkSequence("");
  return output;
}

/**
 * Rewrite hyperlink targets in package-styled text without changing visible
 * text or SGR styling. Rows are re-emitted independently, so every style and
 * hyperlink remains closed at each newline. Returning `undefined` removes an
 * envelope while preserving its label.
 */
export function mapStyledHyperlinks(
  value: string,
  mapper: (target: string) => string | undefined,
): string {
  const rows: StyledSegment[][] = [[]];
  for (const segment of parseStyledSource(value)) {
    const parts = segment.text.split("\n");
    for (const [index, text] of parts.entries()) {
      if (text !== "") {
        const link = segment.link === undefined
          ? undefined
          : mapper(segment.link);
        if (link !== undefined && !validHyperlinkTarget(link)) {
          throw new TypeError(
            `mapped hyperlink target must be a safe non-empty ASCII URL reference; received ${
              JSON.stringify(link)
            }`,
          );
        }
        rows.at(-1)?.push({ text, codes: segment.codes, link });
      }
      if (index < parts.length - 1) rows.push([]);
    }
  }
  return rows.map(emitStyledLine).join("\n");
}
