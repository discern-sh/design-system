/**
 * Deterministic terminal for testing interactive requests against the
 * package's real machinery. Scripted input flows through the real key and
 * mouse decoder, interaction state machines, and Component renderers, while writes
 * and raw-mode transitions stay captured for assertion — so a test exercises
 * the production path rather than a simulation of it.
 *
 * @module
 */

import { stripAnsi } from "../ansi.ts";
import type { TerminalCapabilities } from "../capabilities.ts";
import { measureText } from "../text.ts";
import type { TerminalIO, TerminalSize } from "./io.ts";
import {
  TERMINAL_MOUSE_MAX_COORDINATE,
  type TerminalKeyName,
  type TerminalMouseButton,
  type TerminalMouseEvent,
} from "./keys.ts";
import type { TerminalSignalSource } from "./signals.ts";

const ESCAPE = "\u001b";

/** Configuration for a queue-backed deterministic terminal. */
export interface FakeTerminalIOOptions {
  readonly ansiControl?: boolean;
  readonly interactive?: boolean;
  readonly colorDepth?: TerminalCapabilities["colorDepth"];
  readonly columns?: number;
  readonly hyperlinks?: boolean;
  readonly mouseTracking?: boolean;
  readonly rows?: number;
  readonly unicode?: boolean;
  /**
   * Keep reads pending while the queue is empty instead of returning
   * end-of-input, until {@linkcode FakeTerminalIO.close} delivers EOF.
   * Models a live terminal whose user has not typed yet.
   */
  readonly holdOpen?: boolean;
}

/** One deterministic text, key, mouse, resize, or EOF event. */
export type TerminalTestEvent =
  | { readonly kind: "text"; readonly value: string }
  | { readonly kind: "keys"; readonly keys: readonly TerminalKeyName[] }
  | {
    readonly kind: "resize";
    readonly columns: number;
    readonly rows?: number;
  }
  | TerminalMouseEvent
  | { readonly kind: "end-of-input" };

/**
 * Canonical byte sequence for every named key the package decodes. Adding a
 * name to {@linkcode TerminalKeyName} does not compile until it is enrolled
 * here, and the package tests decode every sequence back to its name.
 */
export const TERMINAL_KEY_SEQUENCES: Readonly<
  Record<TerminalKeyName, string>
> = {
  up: `${ESCAPE}[A`,
  down: `${ESCAPE}[B`,
  right: `${ESCAPE}[C`,
  left: `${ESCAPE}[D`,
  "shift-up": `${ESCAPE}[1;2A`,
  "shift-down": `${ESCAPE}[1;2B`,
  "shift-tab": `${ESCAPE}[Z`,
  "page-up": `${ESCAPE}[5~`,
  "page-down": `${ESCAPE}[6~`,
  delete: `${ESCAPE}[3~`,
  backspace: "\u007f",
  enter: "\r",
  tab: "\t",
  "ctrl-a": "\u0001",
  "ctrl-b": "\u0002",
  "ctrl-c": "\u0003",
  "ctrl-d": "\u0004",
  "ctrl-e": "\u0005",
  "ctrl-f": "\u0006",
  "ctrl-h": "\u0008",
  "ctrl-n": "\u000e",
  "ctrl-p": "\u0010",
  "ctrl-u": "\u0015",
  "option-backspace": `${ESCAPE}\u007f`,
  home: `${ESCAPE}[H`,
  end: `${ESCAPE}[F`,
  escape: ESCAPE,
};

/** Encode named keys as one raw input chunk for the real key decoder. */
export function encodeTerminalKeys(
  ...names: readonly TerminalKeyName[]
): string {
  return names.map((name) => TERMINAL_KEY_SEQUENCES[name]).join("");
}

function mouseButtonCode(button: TerminalMouseButton): number {
  return button === "left" ? 0 : button === "middle" ? 1 : 2;
}

function assertMouseCoordinate(value: number, name: string): void {
  if (
    !Number.isSafeInteger(value) || value < 1 ||
    value > TERMINAL_MOUSE_MAX_COORDINATE
  ) {
    throw new TypeError(
      `${name} must be a positive safe integer no greater than ${TERMINAL_MOUSE_MAX_COORDINATE}; received ${value}`,
    );
  }
}

/** Encode one semantic mouse event as the selected SGR 1006 report. */
export function encodeTerminalMouseEvent(event: TerminalMouseEvent): string {
  assertMouseCoordinate(event.column, "mouse column");
  assertMouseCoordinate(event.row, "mouse row");
  const modifiers = (event.modifiers.shift ? 4 : 0) |
    (event.modifiers.alt ? 8 : 0) |
    (event.modifiers.control ? 16 : 0);
  const code = event.action === "wheel"
    ? 64 + (event.direction === "down" ? 1 : 0) + modifiers
    : mouseButtonCode(event.button) + modifiers;
  return `${ESCAPE}[<${code};${event.column};${event.row}${
    event.action === "release" ? "m" : "M"
  }`;
}

interface QueuedResize {
  readonly columns: number;
  readonly rows: number | undefined;
}

const encoder = new TextEncoder();

/**
 * Queue-backed {@linkcode TerminalIO} driving the real interactive machinery
 * deterministically. Reads drain the scripted input queue, writes and
 * raw-mode transitions are captured in order, and the viewport is scriptable
 * — immediately through {@linkcode FakeTerminalIO.resize} or between queued
 * chunks through {@linkcode FakeTerminalIO.enqueueResize} — so
 * mid-interaction resizes are reproducible.
 */
export class FakeTerminalIO implements TerminalIO {
  /** Complete write log in order, including control sequences. */
  readonly writes: string[] = [];
  /** Raw-mode transitions in the order interactions requested them. */
  readonly rawTransitions: boolean[] = [];
  readonly #ansiControl: boolean;
  readonly #queue: (Uint8Array | QueuedResize)[];
  readonly #interactive: boolean;
  readonly #colorDepth: TerminalCapabilities["colorDepth"];
  readonly #hyperlinks: boolean | undefined;
  readonly #mouseTracking: boolean | undefined;
  readonly #unicode: boolean;
  readonly #waiters: ((chunk: Uint8Array | null) => void)[] = [];
  readonly #resizeHandlers = new Set<() => void>();
  #holdOpen: boolean;
  #columns: number;
  #rows: number;

  /** Create a terminal with scripted input chunks and viewport facts. */
  constructor(
    chunks: readonly (string | Uint8Array)[] = [],
    options: FakeTerminalIOOptions = {},
  ) {
    this.#queue = chunks.map((chunk) =>
      typeof chunk === "string" ? encoder.encode(chunk) : chunk.slice()
    );
    this.#ansiControl = options.ansiControl ?? true;
    this.#interactive = options.interactive ?? true;
    this.#colorDepth = options.colorDepth ?? "none";
    this.#hyperlinks = options.hyperlinks;
    this.#mouseTracking = options.mouseTracking;
    this.#columns = options.columns ?? 80;
    this.#rows = options.rows ?? 24;
    this.#unicode = options.unicode ?? true;
    this.#holdOpen = options.holdOpen ?? false;
  }

  /** Whether the terminal presents itself as an interactive TTY pair. */
  isInteractive(): boolean {
    return this.#interactive;
  }

  /** Current rendering capabilities, tracking the scripted viewport width. */
  capabilities(): TerminalCapabilities {
    return {
      ansiControl: this.#ansiControl,
      colorDepth: this.#colorDepth,
      columns: this.#columns,
      ...(this.#hyperlinks === undefined
        ? {}
        : { hyperlinks: this.#hyperlinks }),
      ...(this.#mouseTracking === undefined
        ? {}
        : { mouseTracking: this.#mouseTracking }),
      unicode: this.#unicode,
    };
  }

  /** Current scripted viewport dimensions. */
  size(): TerminalSize {
    return { columns: this.#columns, rows: this.#rows };
  }

  /**
   * Read the next scripted chunk, or `null` after the queue drains. A queued
   * resize applies its new viewport and yields one empty chunk, which the
   * package's key reader skips, so the resize lands between keystrokes. A
   * held-open terminal keeps the read pending until input arrives or
   * {@linkcode FakeTerminalIO.close} delivers end-of-input.
   */
  read(): Promise<Uint8Array | null> {
    const next = this.#queue.shift();
    if (next !== undefined) {
      if (next instanceof Uint8Array) return Promise.resolve(next);
      this.#applyResize(next);
      return Promise.resolve(new Uint8Array(0));
    }
    if (!this.#holdOpen) return Promise.resolve(null);
    return new Promise((resolve) => this.#waiters.push(resolve));
  }

  /** Record a raw-mode transition. */
  setRawMode(enabled: boolean): void {
    this.rawTransitions.push(enabled);
  }

  /** Capture one terminal write. */
  write(value: string): void {
    this.writes.push(value);
  }

  /** Subscribe to scripted viewport changes. */
  listenResize(handler: () => void): () => void {
    this.#resizeHandlers.add(handler);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      this.#resizeHandlers.delete(handler);
    };
  }

  /** Number of active scripted resize subscriptions. */
  get resizeListenerCount(): number {
    return this.#resizeHandlers.size;
  }

  /** Complete terminal output, including control sequences. */
  output(): string {
    return this.writes.join("");
  }

  /** Queue another UTF-8 input chunk, waking a held-open pending read. */
  enqueue(value: string | Uint8Array): void {
    const bytes = typeof value === "string"
      ? encoder.encode(value)
      : value.slice();
    const waiter = this.#waiters.shift();
    if (waiter !== undefined) waiter(bytes);
    else this.#queue.push(bytes);
  }

  /** Queue named keys as one input chunk through the real key decoder. */
  enqueueKeys(...names: readonly TerminalKeyName[]): void {
    this.enqueue(encodeTerminalKeys(...names));
  }

  /** Queue one semantic SGR mouse event through the real input decoder. */
  enqueueMouse(event: TerminalMouseEvent): void {
    this.enqueue(encodeTerminalMouseEvent(event));
  }

  /**
   * Queue a viewport change that applies when the input queue reaches it,
   * so a resize lands between earlier and later scripted keystrokes. On a
   * held-open terminal with a pending read, the resize applies immediately
   * and the read receives the empty marker chunk. Omitted rows keep the
   * height current at that point in the script.
   */
  enqueueResize(columns: number, rows?: number): void {
    const waiter = this.#waiters.shift();
    if (waiter !== undefined) {
      this.#applyResize({ columns, rows });
      waiter(new Uint8Array(0));
    } else this.#queue.push({ columns, rows });
  }

  /** Deliver end-of-input to pending and future reads of a held-open terminal. */
  close(): void {
    this.#holdOpen = false;
    for (const waiter of this.#waiters.splice(0)) waiter(null);
  }

  /** Change the viewport returned by subsequent size and capability reads. */
  resize(columns: number, rows: number = this.#rows): void {
    this.#applyResize({ columns, rows });
  }

  #applyResize(entry: QueuedResize): void {
    this.#columns = entry.columns;
    this.#rows = entry.rows ?? this.#rows;
    for (const handler of [...this.#resizeHandlers]) handler();
  }
}

/** Queue semantic terminal events in exact order through the real decoder. */
export function enqueueTerminalEvents(
  io: FakeTerminalIO,
  events: readonly TerminalTestEvent[],
): void {
  for (const event of events) {
    switch (event.kind) {
      case "text":
        io.enqueue(event.value);
        break;
      case "keys":
        io.enqueueKeys(...event.keys);
        break;
      case "resize":
        io.enqueueResize(event.columns, event.rows);
        break;
      case "mouse":
        io.enqueueMouse(event);
        break;
      case "end-of-input":
        io.close();
        break;
    }
  }
}

/**
 * Deterministic SIGINT source for driving the package's interrupt paths.
 * {@linkcode FakeSignalSource.deliver} invokes every installed listener like
 * an arriving SIGINT, and {@linkcode FakeSignalSource.raised} counts
 * default-disposition re-raises — the moments a real process would have
 * terminated as an interrupt.
 */
export class FakeSignalSource implements TerminalSignalSource {
  readonly #handlers: (() => void)[] = [];
  #raised = 0;

  /** Number of default-disposition re-raises brackets have requested. */
  get raised(): number {
    return this.#raised;
  }

  /** Number of currently installed listeners. */
  get listenerCount(): number {
    return this.#handlers.length;
  }

  /** Install one SIGINT handler; the returned unsubscribe is idempotent. */
  listen(handler: () => void): () => void {
    this.#handlers.push(handler);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      const index = this.#handlers.indexOf(handler);
      if (index >= 0) this.#handlers.splice(index, 1);
    };
  }

  /** Record a re-raise; a real process would now terminate by SIGINT. */
  raise(): void {
    this.#raised += 1;
  }

  /** Deliver one SIGINT to every listener installed at this moment. */
  deliver(): void {
    for (const handler of [...this.#handlers]) handler();
  }
}

/** Deterministic capabilities for exact terminal-frame tests. */
export function testTerminalCapabilities(
  overrides: Partial<TerminalCapabilities> = {},
): TerminalCapabilities {
  return {
    ansiControl: true,
    colorDepth: "none",
    columns: 80,
    unicode: true,
    ...overrides,
  };
}

function describeFrameLine(line: string | undefined): string {
  return line === undefined ? "absent" : JSON.stringify(line);
}

function frameDifference(actual: string, expected: string): string {
  const actualLines = actual.split("\n");
  const expectedLines = expected.split("\n");
  const length = Math.max(actualLines.length, expectedLines.length);
  for (let index = 0; index < length; index += 1) {
    if (actualLines[index] !== expectedLines[index]) {
      return [
        `Frame differs from the expected frame at line ${index + 1}.`,
        `expected line: ${describeFrameLine(expectedLines[index])}`,
        `received line: ${describeFrameLine(actualLines[index])}`,
      ].join("\n");
    }
  }
  return "Frame differs from the expected frame.";
}

/**
 * Assert exact frame bytes and that every visible line fits the terminal.
 * Failure names the first differing line rather than dumping both frames.
 */
export function assertExactFrame(
  actual: string,
  expected: string,
  capabilities: TerminalCapabilities,
): void {
  if (actual !== expected) {
    throw new Error(frameDifference(actual, expected));
  }
  for (const line of stripAnsi(actual).split("\n")) {
    if (measureText(line) > capabilities.columns) {
      throw new Error(
        `${JSON.stringify(line)} is wider than ${capabilities.columns} columns`,
      );
    }
  }
}

/**
 * Assert a styled frame's ANSI-stripped plaintext contract: styling must be
 * present, and what a person sees must match the expected plaintext exactly
 * while fitting the terminal width.
 */
export function assertStyledFrame(
  actual: string,
  expectedPlaintext: string,
  capabilities: TerminalCapabilities,
): void {
  if (!actual.includes(ESCAPE)) {
    throw new Error("frame emitted no ANSI styling");
  }
  assertExactFrame(stripAnsi(actual), expectedPlaintext, capabilities);
}
