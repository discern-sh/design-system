/**
 * Exception- and signal-safe raw-mode and cursor lifecycle helpers.
 *
 * @module
 */

import { NonInteractiveTerminalError } from "./errors.ts";
import type { TerminalIO } from "./io.ts";
import {
  denoTerminalSignals,
  type TerminalSignalOptions,
} from "./signals.ts";

/** ANSI sequence that hides the terminal cursor. */
export const HIDE_TERMINAL_CURSOR = "\x1b[?25l";

/** ANSI sequence that restores the terminal cursor. */
export const SHOW_TERMINAL_CURSOR = "\x1b[?25h";

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
  features: { readonly raw: boolean; readonly hideCursor: boolean },
): Promise<T> {
  const cleanupErrors: unknown[] = [];
  let rawAttempted = false;
  let rawRestored = false;
  let cursorAttempted = false;
  let cursorRestored = false;
  const restoreTerminal = (): void => {
    if (rawAttempted && !rawRestored) {
      rawRestored = true;
      try {
        io.setRawMode(false);
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (cursorAttempted && !cursorRestored) {
      cursorRestored = true;
      try {
        io.write(SHOW_TERMINAL_CURSOR);
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
  };
  const signals = options.signals ?? denoTerminalSignals;
  let unlisten: () => void = () => {};
  const interrupted = (): void => {
    if (options.onInterrupt !== undefined) {
      options.onInterrupt();
      return;
    }
    unlisten();
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
      rawAttempted = true;
      io.setRawMode(true);
    }
    if (features.hideCursor && io.capabilities().ansiControl !== false) {
      cursorAttempted = true;
      io.write(HIDE_TERMINAL_CURSOR);
    }
    outcome = { ok: true, value: await operation() };
  } catch (error) {
    outcome = { ok: false, error };
  }
  unlisten();
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
  });
}
