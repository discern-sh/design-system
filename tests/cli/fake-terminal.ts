import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import type { TerminalIO, TerminalSize } from "../../src/cli/interactive/io.ts";

/** Configuration for a queue-backed deterministic terminal. */
export interface FakeTerminalOptions {
  readonly ansiControl?: boolean;
  readonly interactive?: boolean;
  readonly colorDepth?: TerminalCapabilities["colorDepth"];
  readonly columns?: number;
  readonly rows?: number;
  readonly unicode?: boolean;
  /**
   * Keep reads pending while the queue is empty instead of returning
   * end-of-input, until `close()` delivers EOF. Models a live terminal whose
   * user has not typed yet.
   */
  readonly holdOpen?: boolean;
}

const encoder = new TextEncoder();

/** Queue-backed terminal used by interactive adapter and future CLI tests. */
export class FakeTerminal implements TerminalIO {
  readonly writes: string[] = [];
  readonly rawTransitions: boolean[] = [];
  readonly #ansiControl: boolean;
  readonly #chunks: Uint8Array[];
  readonly #interactive: boolean;
  readonly #colorDepth: TerminalCapabilities["colorDepth"];
  readonly #unicode: boolean;
  readonly #waiters: Array<(chunk: Uint8Array | null) => void> = [];
  #holdOpen: boolean;
  #columns: number;
  #rows: number;

  constructor(
    chunks: readonly (string | Uint8Array)[] = [],
    options: FakeTerminalOptions = {},
  ) {
    this.#chunks = chunks.map((chunk) =>
      typeof chunk === "string" ? encoder.encode(chunk) : chunk.slice()
    );
    this.#ansiControl = options.ansiControl ?? true;
    this.#interactive = options.interactive ?? true;
    this.#colorDepth = options.colorDepth ?? "none";
    this.#columns = options.columns ?? 80;
    this.#rows = options.rows ?? 24;
    this.#unicode = options.unicode ?? true;
    this.#holdOpen = options.holdOpen ?? false;
  }

  isInteractive(): boolean {
    return this.#interactive;
  }

  capabilities(): TerminalCapabilities {
    return {
      ansiControl: this.#ansiControl,
      colorDepth: this.#colorDepth,
      columns: this.#columns,
      unicode: this.#unicode,
    };
  }

  size(): TerminalSize {
    return { columns: this.#columns, rows: this.#rows };
  }

  read(): Promise<Uint8Array | null> {
    const chunk = this.#chunks.shift();
    if (chunk !== undefined) return Promise.resolve(chunk);
    if (!this.#holdOpen) return Promise.resolve(null);
    return new Promise((resolve) => this.#waiters.push(resolve));
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

  /** Queue another UTF-8 input chunk, waking a held-open pending read. */
  enqueue(value: string | Uint8Array): void {
    const bytes = typeof value === "string"
      ? encoder.encode(value)
      : value.slice();
    const waiter = this.#waiters.shift();
    if (waiter !== undefined) waiter(bytes);
    else this.#chunks.push(bytes);
  }

  /** Deliver end-of-input to pending and future reads of a held-open terminal. */
  close(): void {
    this.#holdOpen = false;
    for (const waiter of this.#waiters.splice(0)) waiter(null);
  }

  /** Change the viewport returned by subsequent size and capability reads. */
  resize(columns: number, rows = this.#rows): void {
    this.#columns = columns;
    this.#rows = rows;
  }
}
