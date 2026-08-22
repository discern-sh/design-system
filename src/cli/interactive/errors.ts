/**
 * Typed failures emitted by the interactive terminal adapter.
 *
 * @module
 */

import type { InlineFrameRefusalReason } from "./painter.ts";

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
export class InteractionCancelled extends Error {
  override readonly name = "InteractionCancelled";

  /** Human-readable cancellation reason rendered in the terminal frame. */
  readonly reason: string;

  constructor(reason = "Cancelled.") {
    super(reason);
    this.reason = reason;
  }
}

/** Why driver-owned successful-frame cleanup could not be performed safely. */
export type InteractionFrameCleanupRefusalReason = InlineFrameRefusalReason;

/**
 * Raised when `completion: "clear-frame"` cannot erase the active frame
 * without guessing cursor geometry. Terminal restoration still runs.
 */
export class InteractionFrameCleanupError extends Error {
  override readonly name = "InteractionFrameCleanupError";

  /** Painter refusal that prevented safe completion cleanup. */
  readonly reason: InteractionFrameCleanupRefusalReason;

  constructor(reason: InteractionFrameCleanupRefusalReason) {
    super(`Interaction frame cleanup was refused: ${reason}.`);
    this.reason = reason;
  }
}
