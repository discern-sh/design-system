/**
 * Exception- and signal-safe raw-mode and cursor lifecycle helpers.
 *
 * @module
 */

import { NonInteractiveTerminalError } from "./errors.ts";
import type { TerminalIO } from "./io.ts";
import { denoTerminalSignals, type TerminalSignalOptions } from "./signals.ts";

/** ANSI sequence that hides the terminal cursor. */
export const HIDE_TERMINAL_CURSOR = "\x1b[?25l";

/** ANSI sequence that restores the terminal cursor. */
export const SHOW_TERMINAL_CURSOR = "\x1b[?25h";

/** DECSET 1049: save the normal screen and enter a fresh alternate screen. */
export const ENTER_TERMINAL_ALTERNATE_SCREEN = "\x1b[?1049h";

/** DECRST 1049: leave the alternate screen and restore the normal screen. */
export const LEAVE_TERMINAL_ALTERNATE_SCREEN = "\x1b[?1049l";

/** Options accepted by the signal-aware lifecycle brackets. */
export interface TerminalLifecycleOptions extends TerminalSignalOptions {
  /**
   * The caller's share of restoration, run inside the default SIGINT path
   * before terminal state restores — the place to stop timers and end a
   * live frame truthfully. Ignored when `onInterrupt` takes the signal
   * instead, because the ordinary exception-safe restoration then runs.
   */
  readonly onSignalRestore?: () => void;
}

/** Options accepted by {@linkcode withRawTerminal}. */
export interface RawTerminalOptions extends TerminalLifecycleOptions {
  /** Hide and restore the terminal cursor around the operation (default true). */
  readonly hideCursor?: boolean;
  /** Enter and restore the terminal's alternate screen (default false). */
  readonly alternateScreen?: boolean;
}

type Outcome<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: unknown };

function cleanupFailure(errors: readonly unknown[]): unknown {
  if (errors.length === 1) return errors[0];
  return new AggregateError(errors, "Terminal restoration failed.");
}

/** Refuse an effectful interaction when stdin or stdout is not a TTY. */
export function assertInteractiveTerminal(io: TerminalIO): void {
  if (!io.isInteractive()) throw new NonInteractiveTerminalError();
}

/**
 * The one restoration engine behind both public brackets. Raw mode and the
 * cursor are restored exactly once whether the operation returns, throws, or
 * a SIGINT arrives: the bracketed SIGINT listener restores everything before
 * re-raising, while a caller-supplied `onInterrupt` takes the signal instead
 * and leaves restoration to the normal path.
 */
async function withTerminalRestoration<T>(
  io: TerminalIO,
  operation: () => T | Promise<T>,
  options: TerminalLifecycleOptions,
  features: {
    readonly raw: boolean;
    readonly hideCursor: boolean;
    readonly alternateScreen: boolean;
  },
): Promise<T> {
  const cleanupErrors: unknown[] = [];
  let rawEnabled = false;
  let cursorHidden = false;
  let alternateScreenEntered = false;
  const restoreTerminal = (): void => {
    if (cursorHidden) {
      cursorHidden = false;
      try {
        io.write(SHOW_TERMINAL_CURSOR);
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (alternateScreenEntered) {
      alternateScreenEntered = false;
      try {
        io.write(LEAVE_TERMINAL_ALTERNATE_SCREEN);
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (rawEnabled) {
      rawEnabled = false;
      try {
        io.setRawMode(false);
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
  };
  const signals = options.signals ?? denoTerminalSignals;
  let unlisten: () => void = () => {};
  let listening = true;
  const stopListening = (): void => {
    if (!listening) return;
    listening = false;
    try {
      unlisten();
    } catch (error) {
      cleanupErrors.push(error);
    }
  };
  const interrupted = (): void => {
    if (options.onInterrupt !== undefined) {
      options.onInterrupt();
      return;
    }
    stopListening();
    try {
      options.onSignalRestore?.();
    } catch {
      // The caller's share failed; terminal restoration still comes first.
    }
    restoreTerminal();
    signals.raise();
  };
  unlisten = signals.listen(interrupted);
  let outcome: Outcome<T>;
  try {
    if (features.raw) {
      io.setRawMode(true);
      rawEnabled = true;
    }
    if (features.alternateScreen) {
      io.write(ENTER_TERMINAL_ALTERNATE_SCREEN);
      alternateScreenEntered = true;
    }
    if (features.hideCursor && io.capabilities().ansiControl !== false) {
      io.write(HIDE_TERMINAL_CURSOR);
      cursorHidden = true;
    }
    outcome = { ok: true, value: await operation() };
  } catch (error) {
    outcome = { ok: false, error };
  }
  stopListening();
  restoreTerminal();
  if (!outcome.ok) throw outcome.error;
  if (cleanupErrors.length > 0) throw cleanupFailure(cleanupErrors);
  return outcome.value;
}

/**
 * Run one operation with a hidden cursor and always attempt cursor
 * restoration — on success, exceptions, and bracketed SIGINT alike. The
 * original operation failure wins if both the operation and cleanup fail.
 */
export async function withHiddenTerminalCursor<T>(
  io: TerminalIO,
  operation: () => T | Promise<T>,
  options: TerminalLifecycleOptions = {},
): Promise<T> {
  return await withTerminalRestoration(io, operation, options, {
    raw: false,
    hideCursor: true,
    alternateScreen: false,
  });
}

/**
 * Run one interactive operation in raw mode with a hidden cursor. Raw mode
 * and cursor visibility are restored on success, cancellation, EOF,
 * exceptions, and externally delivered SIGINT.
 */
export async function withRawTerminal<T>(
  io: TerminalIO,
  operation: () => T | Promise<T>,
  options: RawTerminalOptions = {},
): Promise<T> {
  assertInteractiveTerminal(io);
  return await withTerminalRestoration(io, operation, options, {
    raw: true,
    hideCursor: options.hideCursor ?? true,
    alternateScreen: options.alternateScreen ?? false,
  });
}
