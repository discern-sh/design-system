/** Shared internal coordination for owned terminal viewports. */
import type { TerminalCapabilities } from "../capabilities.ts";
import type { TerminalIO, TerminalSize } from "./io.ts";

export interface TerminalFacts {
  readonly capabilities: TerminalCapabilities;
  readonly size: TerminalSize;
}

export function terminalFacts(io: TerminalIO): TerminalFacts {
  let last: TerminalFacts | undefined;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const size = io.size();
    const capabilities = io.capabilities();
    const confirmed = io.size();
    last = { size: confirmed, capabilities };
    if (
      size.columns !== confirmed.columns || size.rows !== confirmed.rows ||
      capabilities.columns !== confirmed.columns
    ) {
      continue;
    }
    if (capabilities.ansiControl === false) {
      throw new TypeError("terminal ANSI cursor control is unavailable");
    }
    return { size: confirmed, capabilities };
  }
  throw new TypeError(
    `Terminal geometry did not stabilise while sampling its viewport and capabilities${
      last === undefined
        ? "."
        : ` (last saw ${last.size.columns} columns and capability width ${last.capabilities.columns}).`
    }`,
  );
}

export class ResizeMailbox {
  #pending = false;
  #waiter: (() => void) | undefined;

  notify = (): void => {
    const waiter = this.#waiter;
    if (waiter === undefined) {
      this.#pending = true;
      return;
    }
    this.#waiter = undefined;
    waiter();
  };

  next(): Promise<void> {
    if (this.#pending) {
      this.#pending = false;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.#waiter = resolve;
    });
  }
}

export class AbortMailbox {
  readonly event: Promise<{ readonly kind: "abort" }>;
  readonly #signal: AbortSignal | undefined;
  readonly #notify: (() => void) | undefined;

  constructor(signal: AbortSignal | undefined) {
    this.#signal = signal;
    if (signal === undefined) {
      this.#notify = undefined;
      this.event = new Promise(() => {});
      return;
    }
    let notify: () => void = () => {};
    this.event = new Promise((resolve) => {
      notify = () => resolve({ kind: "abort" });
    });
    this.#notify = notify;
    if (signal.aborted) notify();
    else signal.addEventListener("abort", notify, { once: true });
  }

  stop(): void {
    if (this.#signal !== undefined && this.#notify !== undefined) {
      this.#signal.removeEventListener("abort", this.#notify);
    }
  }
}
