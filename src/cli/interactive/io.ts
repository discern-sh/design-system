/**
 * Injectable terminal input/output boundary and its Deno implementation.
 *
 * @module
 */

import process from "node:process";
import { InteractionCancelled } from "./errors.ts";

import {
  detectTerminalCapabilities,
  type TerminalCapabilities,
} from "../capabilities.ts";

// Serialize native stdin reads across adapter instances.
let terminalReadPending = false;

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
  /**
   * Stop native input polling and reject the pending read, returning true only
   * when a read was cancelled. Preserve already delivered bytes and keep stdin
   * open for a later interaction or foreground operation. The raw-terminal
   * lifecycle calls this before relinquishing ownership. Hosts without native
   * pending reads may omit it; forwarding wrappers must preserve this hook.
   */
  cancelRead?(): boolean;
  /** Enable or disable raw input mode. */
  setRawMode(enabled: boolean): void;
  /** Write terminal control or display bytes synchronously. */
  write(value: string): void;
  /**
   * Subscribe to terminal viewport changes for the duration of a live
   * complete-frame interaction. Implementations without a native resize
   * signal may omit this; request loops still re-check geometry before every
   * semantic key.
   */
  listenResize?(handler: () => void): () => void;
}

/** Construction options for {@linkcode DenoTerminalIO}. */
export interface DenoTerminalIOOptions {
  /** Environment facts used for deterministic capability detection. */
  readonly environment?: Readonly<Record<string, string | undefined>>;
  /** Maximum raw input bytes returned per read. */
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
  #buffered = new Uint8Array(0);
  #cancelPending: (() => void) | undefined;

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

  /** Read a bounded raw chunk, pausing native TTY polling between reads. */
  async read(): Promise<Uint8Array | null> {
    if (!Deno.stdin.isTerminal()) {
      const buffer = new Uint8Array(this.#readBufferSize);
      const count = await Deno.stdin.read(buffer);
      return count === null ? null : buffer.slice(0, count);
    }
    if (this.#buffered.length > 0) return this.#takeChunk(this.#buffered);
    if (terminalReadPending) {
      throw new Error("Terminal stdin already has an active reader.");
    }
    // process.stdin stops reads scheduled after pause, including cancellation
    // in the first turn. Its descriptor remains open for foreground input.
    const stream = process.stdin;
    if (stream.readableEnded || stream.destroyed) return null;
    return await new Promise<Uint8Array | null>((resolve, reject) => {
      const cleanup = (): void => {
        stream.pause();
        stream.unref();
        stream.off("data", onData);
        stream.off("end", onEnd);
        stream.off("error", onError);
        this.#cancelPending = undefined;
        terminalReadPending = false;
      };
      const onData = (chunk: Uint8Array): void => {
        cleanup();
        resolve(this.#takeChunk(chunk));
      };
      const onEnd = (): void => {
        cleanup();
        resolve(null);
      };
      const onError = (error: unknown): void => {
        cleanup();
        reject(error);
      };
      this.#cancelPending = () =>
        onError(new InteractionCancelled("Terminal input released."));
      terminalReadPending = true;
      stream.once("data", onData);
      stream.once("end", onEnd);
      stream.once("error", onError);
      try {
        stream.ref();
        stream.resume();
      } catch (error) {
        onError(error);
      }
    });
  }

  #takeChunk(chunk: Uint8Array): Uint8Array {
    const result = new Uint8Array(chunk.subarray(0, this.#readBufferSize));
    this.#buffered = new Uint8Array(chunk.subarray(this.#readBufferSize));
    return result;
  }

  /** Stop an outstanding native TTY read without closing process-owned stdin. */
  cancelRead(): boolean {
    const cancel = this.#cancelPending;
    if (cancel === undefined) return false;
    cancel();
    return true;
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

  /** Subscribe to SIGWINCH where the host platform exposes it. */
  listenResize(handler: () => void): () => void {
    try {
      Deno.addSignalListener("SIGWINCH", handler);
    } catch {
      // Platforms without SIGWINCH still re-check size on every input event.
      return () => {};
    }
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      Deno.removeSignalListener("SIGWINCH", handler);
    };
  }
}
