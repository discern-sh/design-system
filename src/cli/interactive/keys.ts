/**
 * Buffered terminal escape-sequence and UTF-8 key decoding.
 *
 * @module
 */

import type { TerminalIO } from "./io.ts";

/** Named non-text keys understood by the terminal interaction state machines. */
export type TerminalKeyName =
  | "up"
  | "down"
  | "right"
  | "left"
  | "shift-up"
  | "shift-down"
  | "shift-tab"
  | "page-up"
  | "page-down"
  | "delete"
  | "backspace"
  | "enter"
  | "tab"
  | "ctrl-a"
  | "ctrl-b"
  | "ctrl-c"
  | "ctrl-d"
  | "ctrl-e"
  | "ctrl-f"
  | "ctrl-h"
  | "ctrl-n"
  | "ctrl-p"
  | "ctrl-u"
  | "option-backspace"
  | "home"
  | "end"
  | "escape";

/** One decoded key: printable text, a named control key, or an unknown sequence. */
export type TerminalKey =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "named"; readonly name: TerminalKeyName }
  | { readonly kind: "unknown"; readonly sequence: string };

/** Result of tokenizing one decoded terminal text buffer. */
export interface TerminalKeyTokenization {
  readonly keys: readonly TerminalKey[];
  /** Incomplete escape sequence retained for the next input chunk. */
  readonly rest: string;
}

const NAMED_SEQUENCES = new Map<string, TerminalKeyName>([
  ["\x1b[1;2A", "shift-up"],
  ["\x1b[1;2B", "shift-down"],
  ["\x1b[A", "up"],
  ["\x1bOA", "up"],
  ["\x1b[B", "down"],
  ["\x1bOB", "down"],
  ["\x1b[C", "right"],
  ["\x1bOC", "right"],
  ["\x1b[D", "left"],
  ["\x1bOD", "left"],
  ["\x1b[Z", "shift-tab"],
  ["\x1b[5~", "page-up"],
  ["\x1b[6~", "page-down"],
  ["\x1b[3~", "delete"],
  ["\x1b[H", "home"],
  ["\x1bOH", "home"],
  ["\x1b[1~", "home"],
  ["\x1b[7~", "home"],
  ["\x1b[F", "end"],
  ["\x1bOF", "end"],
  ["\x1b[4~", "end"],
  ["\x1b[8~", "end"],
  ["\x1b\x7f", "option-backspace"],
  ["\x7f", "backspace"],
  ["\r", "enter"],
  ["\n", "enter"],
  ["\t", "tab"],
  ["\x01", "ctrl-a"],
  ["\x02", "ctrl-b"],
  ["\x03", "ctrl-c"],
  ["\x04", "ctrl-d"],
  ["\x05", "ctrl-e"],
  ["\x06", "ctrl-f"],
  ["\x08", "ctrl-h"],
  ["\x0e", "ctrl-n"],
  ["\x10", "ctrl-p"],
  ["\x15", "ctrl-u"],
  ["\x1b", "escape"],
]);

const ESCAPE_SEQUENCES = [...NAMED_SEQUENCES.keys()]
  .filter((sequence) => sequence.startsWith("\x1b") && sequence !== "\x1b")
  .sort((left, right) => right.length - left.length);
const CONTROL_SEQUENCES = [...NAMED_SEQUENCES.keys()]
  .filter((sequence) => !sequence.startsWith("\x1b"));
const ESCAPE = String.fromCharCode(27);
const COMPLETE_CSI = new RegExp(
  `^${ESCAPE}\\[[0-?]*[ -/]*[@-~]`,
  "u",
);
const COMPLETE_SS3 = new RegExp(`^${ESCAPE}O.`, "u");
const POSSIBLE_ESCAPE = new RegExp(
  `^${ESCAPE}(?:\\[[0-?]*[ -/]*|O?)$`,
  "u",
);
const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

function firstGrapheme(value: string): string | undefined {
  return segmenter.segment(value)[Symbol.iterator]().next().value?.segment;
}

function namedKey(name: TerminalKeyName): TerminalKey {
  return { kind: "named", name };
}

function possibleEscapePrefix(value: string): boolean {
  return ESCAPE_SEQUENCES.some((sequence) => sequence.startsWith(value)) ||
    POSSIBLE_ESCAPE.test(value);
}

/**
 * Split decoded terminal text into normalized keys. Incomplete escape sequences
 * stay in `rest` until more bytes arrive or `flush` declares end-of-input.
 */
export function tokenizeTerminalKeys(
  input: string,
  flush = false,
): TerminalKeyTokenization {
  const keys: TerminalKey[] = [];
  let rest = input;

  while (rest !== "") {
    if (rest.startsWith("\x1b")) {
      const complete = ESCAPE_SEQUENCES.find((sequence) =>
        rest.startsWith(sequence)
      );
      if (complete !== undefined) {
        keys.push(namedKey(NAMED_SEQUENCES.get(complete) ?? "escape"));
        rest = rest.slice(complete.length);
        continue;
      }
      if (!flush && possibleEscapePrefix(rest)) break;
      const unknown = rest.match(COMPLETE_CSI)?.[0] ??
        rest.match(COMPLETE_SS3)?.[0];
      if (unknown !== undefined) {
        keys.push({ kind: "unknown", sequence: unknown });
        rest = rest.slice(unknown.length);
        continue;
      }
      keys.push(namedKey("escape"));
      rest = rest.slice(1);
      continue;
    }

    const control = CONTROL_SEQUENCES.find((sequence) =>
      rest.startsWith(sequence)
    );
    if (control !== undefined) {
      keys.push(namedKey(NAMED_SEQUENCES.get(control) ?? "escape"));
      rest = rest.slice(control.length);
      continue;
    }

    const grapheme = firstGrapheme(rest);
    if (grapheme === undefined) break;
    keys.push({ kind: "text", text: grapheme });
    rest = rest.slice(grapheme.length);
  }

  return { keys, rest };
}

/** Stateful UTF-8 and escape decoder for arbitrarily split terminal chunks. */
export class BufferedTerminalKeyDecoder {
  readonly #decoder = new TextDecoder();
  #rest = "";
  #finished = false;

  /** Incomplete decoded escape text currently retained between chunks. */
  get bufferedText(): string {
    return this.#rest;
  }

  /** Decode one raw byte chunk into every complete key it contains. */
  push(chunk: Uint8Array): readonly TerminalKey[] {
    if (this.#finished) {
      throw new TypeError("Cannot push terminal input after decoder finish.");
    }
    const parsed = tokenizeTerminalKeys(
      this.#rest + this.#decoder.decode(chunk, { stream: true }),
    );
    this.#rest = parsed.rest;
    return parsed.keys;
  }

  /** Flush UTF-8 and any incomplete escape as terminal end-of-input. */
  finish(): readonly TerminalKey[] {
    if (this.#finished) return [];
    this.#finished = true;
    const parsed = tokenizeTerminalKeys(
      this.#rest + this.#decoder.decode(),
      true,
    );
    this.#rest = parsed.rest;
    return parsed.keys;
  }
}

/** Buffered one-key-at-a-time reader over a {@linkcode TerminalIO}. */
export class TerminalKeyReader {
  readonly #decoder = new BufferedTerminalKeyDecoder();
  readonly #pending: TerminalKey[] = [];
  #ended = false;

  constructor(readonly io: TerminalIO) {}

  /** Read one decoded key, or `null` after all EOF-buffered keys are consumed. */
  async readKey(): Promise<TerminalKey | null> {
    while (this.#pending.length === 0 && !this.#ended) {
      const chunk = await this.io.read();
      if (chunk === null) {
        this.#ended = true;
        this.#pending.push(...this.#decoder.finish());
      } else if (chunk.length > 0) {
        this.#pending.push(...this.#decoder.push(chunk));
      }
    }
    return this.#pending.shift() ?? null;
  }
}

/** Test whether a decoded key has one particular named-key meaning. */
export function isNamedKey(
  key: TerminalKey,
  name: TerminalKeyName,
): boolean {
  return key.kind === "named" && key.name === name;
}
