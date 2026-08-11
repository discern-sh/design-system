import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import type { TerminalIO, TerminalSize } from "../../src/cli/interactive/io.ts";

/** Configuration for a queue-backed deterministic terminal. */
export interface FakeTerminalOptions {
  readonly interactive?: boolean;
  readonly colorDepth?: TerminalCapabilities["colorDepth"];
  readonly columns?: number;
  readonly rows?: number;
  readonly unicode?: boolean;
}

const encoder = new TextEncoder();

/** Queue-backed terminal used by interactive adapter and future CLI tests. */
export class FakeTerminal implements TerminalIO {
  readonly writes: string[] = [];
  readonly rawTransitions: boolean[] = [];
  readonly #chunks: Uint8Array[];
  readonly #interactive: boolean;
  readonly #colorDepth: TerminalCapabilities["colorDepth"];
  readonly #unicode: boolean;
  #columns: number;
  #rows: number;

  constructor(
    chunks: readonly (string | Uint8Array)[] = [],
    options: FakeTerminalOptions = {},
  ) {
    this.#chunks = chunks.map((chunk) =>
      typeof chunk === "string" ? encoder.encode(chunk) : chunk.slice()
    );
    this.#interactive = options.interactive ?? true;
    this.#colorDepth = options.colorDepth ?? "none";
    this.#columns = options.columns ?? 80;
    this.#rows = options.rows ?? 24;
    this.#unicode = options.unicode ?? true;
  }

  isInteractive(): boolean {
    return this.#interactive;
  }

  capabilities(): TerminalCapabilities {
    return {
      colorDepth: this.#colorDepth,
      columns: this.#columns,
      unicode: this.#unicode,
    };
  }

  size(): TerminalSize {
    return { columns: this.#columns, rows: this.#rows };
  }

  read(): Promise<Uint8Array | null> {
    return Promise.resolve(this.#chunks.shift() ?? null);
  }

  setRawMode(enabled: boolean): void {
    this.rawTransitions.push(enabled);
  }

  write(value: string): void {
    this.writes.push(value);
  }

  /** Complete terminal output, including control sequences. */
  output(): string {
    return this.writes.join("");
  }

  /** Queue another UTF-8 input chunk. */
  enqueue(value: string | Uint8Array): void {
    this.#chunks.push(
      typeof value === "string" ? encoder.encode(value) : value.slice(),
    );
  }

  /** Change the viewport returned by subsequent size and capability reads. */
  resize(columns: number, rows = this.#rows): void {
    this.#columns = columns;
    this.#rows = rows;
  }
}
