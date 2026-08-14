/**
 * Injectable terminal input/output boundary and its Deno implementation.
 *
 * @module
 */

import {
  detectTerminalCapabilities,
  type TerminalCapabilities,
} from "../capabilities.ts";

const DEFAULT_COLUMNS = 80;
const DEFAULT_ROWS = 24;
const ENVIRONMENT_KEYS = [
  "NO_COLOR",
  "TERM",
  "COLORTERM",
  "LC_ALL",
  "LC_CTYPE",
  "LANG",
] as const;

/** Current dimensions of a terminal viewport. */
export interface TerminalSize {
  readonly columns: number;
  readonly rows: number;
}

/** Injectable effect boundary used by interactions and deterministic test terminals. */
export interface TerminalIO {
  /** Whether both the input and output handles are interactive terminals. */
  isInteractive(): boolean;
  /** Current rendering capabilities, including the current output width. */
  capabilities(): TerminalCapabilities;
  /** Current terminal dimensions. */
  size(): TerminalSize;
  /** Read the next raw input chunk, or `null` after terminal end-of-input. */
  read(): Promise<Uint8Array | null>;
  /** Enable or disable raw input mode. */
  setRawMode(enabled: boolean): void;
  /** Write terminal control or display bytes synchronously. */
  write(value: string): void;
}

/** Construction options for {@linkcode DenoTerminalIO}. */
export interface DenoTerminalIOOptions {
  /** Environment facts used for deterministic capability detection. */
  readonly environment?: Readonly<Record<string, string | undefined>>;
  /** Maximum raw input bytes requested from stdin per read. */
  readonly readBufferSize?: number;
}

function environmentSnapshot(): Readonly<Record<string, string | undefined>> {
  const snapshot: Record<string, string> = {};
  for (const name of ENVIRONMENT_KEYS) {
    try {
      const value = Deno.env.get(name);
      if (value !== undefined) snapshot[name] = value;
    } catch {
      // An unreadable variable stays absent so detection treats it as unset.
    }
  }
  return snapshot;
}

function validDimension(value: number | undefined, fallback: number): number {
  return Number.isSafeInteger(value) && (value ?? 0) > 0
    ? value as number
    : fallback;
}

/** Deno stdin/stdout implementation of the interactive terminal boundary. */
export class DenoTerminalIO implements TerminalIO {
  readonly #environment: Readonly<Record<string, string | undefined>>;
  readonly #readBufferSize: number;

  constructor(options: DenoTerminalIOOptions = {}) {
    const readBufferSize = options.readBufferSize ?? 1024;
    if (!Number.isSafeInteger(readBufferSize) || readBufferSize < 1) {
      throw new TypeError(
        `terminal read buffer size must be a positive safe integer; received ${readBufferSize}`,
      );
    }
    this.#environment = options.environment ?? environmentSnapshot();
    this.#readBufferSize = readBufferSize;
  }

  /** Whether Deno stdin and stdout are both terminal handles. */
  isInteractive(): boolean {
    return Deno.stdin.isTerminal() && Deno.stdout.isTerminal();
  }

  /** Detect Token-rendering capabilities from Deno and the current viewport. */
  capabilities(): TerminalCapabilities {
    return detectTerminalCapabilities({
      env: this.#environment,
      isTty: this.isInteractive(),
      columns: this.size().columns,
    });
  }

  /** Read the current Deno console size with stable non-TTY fallbacks. */
  size(): TerminalSize {
    if (!Deno.stdout.isTerminal()) {
      return { columns: DEFAULT_COLUMNS, rows: DEFAULT_ROWS };
    }
    try {
      const size = Deno.consoleSize();
      return {
        columns: validDimension(size.columns, DEFAULT_COLUMNS),
        rows: validDimension(size.rows, DEFAULT_ROWS),
      };
    } catch {
      return { columns: DEFAULT_COLUMNS, rows: DEFAULT_ROWS };
    }
  }

  /** Read one raw byte chunk from Deno stdin. */
  async read(): Promise<Uint8Array | null> {
    const buffer = new Uint8Array(this.#readBufferSize);
    const count = await Deno.stdin.read(buffer);
    return count === null ? null : buffer.slice(0, count);
  }

  /** Switch Deno stdin raw mode. */
  setRawMode(enabled: boolean): void {
    Deno.stdin.setRaw(enabled);
  }

  /** Write a complete UTF-8 string to Deno stdout. */
  write(value: string): void {
    const bytes = new TextEncoder().encode(value);
    let offset = 0;
    while (offset < bytes.length) {
      const written = Deno.stdout.writeSync(bytes.subarray(offset));
      if (written < 1) {
        throw new Error("Terminal stdout accepted no bytes.");
      }
      offset += written;
    }
  }
}
