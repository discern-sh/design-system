/**
 * Buffered terminal escape-sequence and UTF-8 key decoding.
 *
 * @module
 */

import type { TerminalIO } from "./io.ts";
import { adoptTerminalRead } from "./read-broker.ts";

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

/** Largest one-based terminal-cell coordinate accepted from mouse input. */
export const TERMINAL_MOUSE_MAX_COORDINATE = 1_000_000;

/** Modifier bits carried by one SGR mouse report. */
export interface TerminalMouseModifiers {
  readonly shift: boolean;
  readonly alt: boolean;
  readonly control: boolean;
}

/** Addressable buttons reported by the selected SGR mouse protocol. */
export type TerminalMouseButton = "left" | "middle" | "right";

/** One SGR mouse button press at a one-based terminal cell. */
export interface TerminalMousePressEvent {
  readonly kind: "mouse";
  readonly action: "press";
  readonly button: TerminalMouseButton;
  readonly column: number;
  readonly row: number;
  readonly modifiers: TerminalMouseModifiers;
}

/** One SGR mouse button release at a one-based terminal cell. */
export interface TerminalMouseReleaseEvent {
  readonly kind: "mouse";
  readonly action: "release";
  readonly button: TerminalMouseButton;
  readonly column: number;
  readonly row: number;
  readonly modifiers: TerminalMouseModifiers;
}

/** One vertical SGR mouse wheel event at a one-based terminal cell. */
export interface TerminalMouseWheelEvent {
  readonly kind: "mouse";
  readonly action: "wheel";
  readonly direction: "up" | "down";
  readonly column: number;
  readonly row: number;
  readonly modifiers: TerminalMouseModifiers;
}

/** Semantic mouse input admitted by the package decoder. */
export type TerminalMouseEvent =
  | TerminalMousePressEvent
  | TerminalMouseReleaseEvent
  | TerminalMouseWheelEvent;

/** A complete control report that is not actionable package input. */
export interface TerminalUnknownInputEvent {
  readonly kind: "unknown";
  readonly sequence: string;
  readonly category: "mouse" | "control";
  readonly reason: "malformed" | "unsupported" | "unknown-control";
}

/**
 * Additive semantic terminal input. Existing key-only callers continue to use
 * {@linkcode TerminalKeyReader}; event-aware callers use the sibling event
 * reader so mouse and unknown control reports can never become text.
 */
export type TerminalInputEvent =
  | { readonly kind: "key"; readonly key: TerminalKey }
  | TerminalMouseEvent
  | TerminalUnknownInputEvent;

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
 * A lone Escape is emitted only at a flush or through
 * {@linkcode BufferedTerminalKeyDecoder.flushLoneEscape}; Escape followed by
 * an unrecognised character is an Alt/meta chord and stays a non-printable
 * unknown sequence rather than leaking an `escape` key and literal text.
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
      if (rest.startsWith("\x1b[") || rest.startsWith("\x1bO")) {
        keys.push({ kind: "unknown", sequence: rest });
        rest = "";
        continue;
      }
      const following = firstGrapheme(rest.slice(1));
      if (following === undefined || following === "\x1b") {
        keys.push(namedKey("escape"));
        rest = rest.slice(1);
        continue;
      }
      keys.push({ kind: "unknown", sequence: `\x1b${following}` });
      rest = rest.slice(1 + following.length);
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

  /**
   * Deliver a retained lone Escape once its continuation window has elapsed.
   * Any longer escape-sequence fragment stays buffered untouched, so split
   * sequences keep decoding incrementally no matter how late their remaining
   * bytes arrive.
   */
  flushLoneEscape(): readonly TerminalKey[] {
    if (this.#rest !== "\x1b") return [];
    const parsed = tokenizeTerminalKeys(this.#rest, true);
    this.#rest = parsed.rest;
    return parsed.keys;
  }
}

/** Default milliseconds a lone Escape waits for sequence continuation bytes. */
const LONE_ESCAPE_DELAY_MS = 100;

const LONE_ESCAPE_ELAPSED = Symbol("lone-escape-elapsed");

async function raceLoneEscapeDelay(
  read: Promise<Uint8Array | null>,
  delayMs: number,
): Promise<Uint8Array | null | typeof LONE_ESCAPE_ELAPSED> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      read,
      new Promise<typeof LONE_ESCAPE_ELAPSED>((resolve) => {
        timer = setTimeout(() => resolve(LONE_ESCAPE_ELAPSED), delayMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** Tuning accepted by {@linkcode TerminalKeyReader}. */
export interface TerminalKeyReaderOptions {
  /**
   * Milliseconds a lone Escape byte waits for escape-sequence continuation
   * bytes before it is delivered as the `escape` key. Defaults to 100.
   * Continuation bytes arriving later than this window decode on their own,
   * so an escape sequence split across a slower link than the window reads
   * as Escape followed by the remainder.
   */
  readonly escapeDelayMs?: number;
}

/** Buffered one-key-at-a-time reader over a {@linkcode TerminalIO}. */
export class TerminalKeyReader {
  readonly #decoder = new BufferedTerminalKeyDecoder();
  readonly #pending: TerminalKey[] = [];
  readonly #escapeDelayMs: number;
  #ended = false;

  constructor(
    readonly io: TerminalIO,
    options: TerminalKeyReaderOptions = {},
  ) {
    const delay = options.escapeDelayMs ?? LONE_ESCAPE_DELAY_MS;
    if (!Number.isSafeInteger(delay) || delay < 1) {
      throw new TypeError(
        `escape delay must be a positive safe integer of milliseconds; received ${delay}`,
      );
    }
    this.#escapeDelayMs = delay;
  }

  /**
   * Read one decoded key, or `null` after all EOF-buffered keys are consumed.
   * While a lone Escape sits in the buffer, the next read races a short
   * continuation window: bytes arriving inside it complete the sequence,
   * and an elapsed window delivers the Escape itself.
   */
  async readKey(): Promise<TerminalKey | null> {
    while (this.#pending.length === 0 && !this.#ended) {
      const read = adoptTerminalRead(this.io);
      let chunk: Uint8Array | null | typeof LONE_ESCAPE_ELAPSED;
      try {
        chunk = this.#decoder.bufferedText === "\x1b"
          ? await raceLoneEscapeDelay(read.result, this.#escapeDelayMs)
          : await read.result;
      } catch (error) {
        read.release();
        throw error;
      }
      if (chunk === LONE_ESCAPE_ELAPSED) {
        read.defer();
        this.#pending.push(...this.#decoder.flushLoneEscape());
        continue;
      }
      read.release();
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

const SGR_MOUSE_REPORT = /^\x1b\[<([0-9]+);([0-9]+);([0-9]+)([Mm])$/u;

function decimalInteger(value: string): number | undefined {
  if (value.length > 16) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function unknownInput(
  sequence: string,
  category: TerminalUnknownInputEvent["category"],
  reason: TerminalUnknownInputEvent["reason"],
): TerminalUnknownInputEvent {
  return { kind: "unknown", sequence, category, reason };
}

/**
 * Classify one key-decoder token as semantic key, SGR mouse, or unknown
 * control input. Mouse-shaped controls fail closed: malformed coordinates,
 * unsupported buttons, and motion reports remain typed non-text events.
 */
export function decodeTerminalInputEvent(key: TerminalKey): TerminalInputEvent {
  if (key.kind !== "unknown") return { kind: "key", key };
  if (!key.sequence.startsWith("\x1b[<")) {
    return unknownInput(key.sequence, "control", "unknown-control");
  }
  const match = SGR_MOUSE_REPORT.exec(key.sequence);
  if (match === null) return unknownInput(key.sequence, "mouse", "malformed");
  const code = decimalInteger(match[1] ?? "");
  const column = decimalInteger(match[2] ?? "");
  const row = decimalInteger(match[3] ?? "");
  const terminator = match[4];
  if (
    code === undefined || code < 0 || code > 255 || column === undefined ||
    column < 1 || column > TERMINAL_MOUSE_MAX_COORDINATE ||
    row === undefined || row < 1 || row > TERMINAL_MOUSE_MAX_COORDINATE
  ) {
    return unknownInput(key.sequence, "mouse", "malformed");
  }

  const modifiers: TerminalMouseModifiers = {
    shift: (code & 4) !== 0,
    alt: (code & 8) !== 0,
    control: (code & 16) !== 0,
  };
  const buttonCode = code & 3;
  if ((code & 32) !== 0 || (code & 128) !== 0) {
    return unknownInput(key.sequence, "mouse", "unsupported");
  }
  if ((code & 64) !== 0) {
    if (terminator !== "M" || buttonCode > 1) {
      return unknownInput(key.sequence, "mouse", "unsupported");
    }
    return {
      kind: "mouse",
      action: "wheel",
      direction: buttonCode === 0 ? "up" : "down",
      column,
      row,
      modifiers,
    };
  }
  const button: TerminalMouseButton | undefined = buttonCode === 0
    ? "left"
    : buttonCode === 1
    ? "middle"
    : buttonCode === 2
    ? "right"
    : undefined;
  if (button === undefined) {
    return unknownInput(key.sequence, "mouse", "unsupported");
  }
  return {
    kind: "mouse",
    action: terminator === "m" ? "release" : "press",
    button,
    column,
    row,
    modifiers,
  };
}

/**
 * Event-aware reader sharing the key reader's incremental UTF-8, split-CSI,
 * and lone-Escape timing model. Key-only callers keep using
 * {@linkcode TerminalKeyReader} unchanged.
 */
export class TerminalInputReader {
  readonly #keys: TerminalKeyReader;

  constructor(
    io: TerminalIO,
    options: TerminalKeyReaderOptions = {},
  ) {
    this.#keys = new TerminalKeyReader(io, options);
  }

  /** Read one semantic terminal event, or `null` after end-of-input. */
  async readEvent(): Promise<TerminalInputEvent | null> {
    const key = await this.#keys.readKey();
    return key === null ? null : decodeTerminalInputEvent(key);
  }
}

/** Test whether a decoded key has one particular named-key meaning. */
export function isNamedKey(
  key: TerminalKey,
  name: TerminalKeyName,
): boolean {
  return key.kind === "named" && key.name === name;
}
