/**
 * Typed failures emitted by the interactive terminal adapter.
 *
 * @module
 */

/** Raised when an interactive operation is attempted without an input/output TTY. */
export class NonInteractiveTerminalError extends Error {
  override readonly name = "NonInteractiveTerminalError";

  constructor(
    message =
      "Interactive terminal input requires both stdin and stdout to be TTYs.",
  ) {
    super(message);
  }
}

/** Cancellation signal raised for Ctrl+C and terminal end-of-input. */
export class PromptCancelled extends Error {
  override readonly name = "PromptCancelled";

  /** Human-readable cancellation reason rendered in the terminal frame. */
  readonly reason: string;

  constructor(reason = "Cancelled.") {
    super(reason);
    this.reason = reason;
  }
}
