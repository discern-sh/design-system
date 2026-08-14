/**
 * Exception-safe raw-mode and cursor lifecycle helpers.
 *
 * @module
 */

import { NonInteractiveTerminalError } from "./errors.ts";
import type { TerminalIO } from "./io.ts";

/** ANSI sequence that hides the terminal cursor. */
export const HIDE_TERMINAL_CURSOR = "\x1b[?25l";

/** ANSI sequence that restores the terminal cursor. */
export const SHOW_TERMINAL_CURSOR = "\x1b[?25h";

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
 * Run one operation with a hidden cursor and always attempt cursor restoration.
 * The original operation failure wins if both the operation and cleanup fail.
 */
export async function withHiddenTerminalCursor<T>(
  io: TerminalIO,
  operation: () => T | Promise<T>,
): Promise<T> {
  let cursorAttempted = false;
  let outcome: Outcome<T>;
  try {
    if (io.capabilities().ansiControl !== false) {
      cursorAttempted = true;
      io.write(HIDE_TERMINAL_CURSOR);
    }
    outcome = { ok: true, value: await operation() };
  } catch (error) {
    outcome = { ok: false, error };
  }

  const cleanupErrors: unknown[] = [];
  if (cursorAttempted) {
    try {
      io.write(SHOW_TERMINAL_CURSOR);
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (!outcome.ok) throw outcome.error;
  if (cleanupErrors.length > 0) throw cleanupFailure(cleanupErrors);
  return outcome.value;
}

/**
 * Run one interactive operation in raw mode with a hidden cursor. Raw mode and
 * cursor visibility are restored on success, cancellation, EOF, and exceptions.
 */
export async function withRawTerminal<T>(
  io: TerminalIO,
  operation: () => T | Promise<T>,
): Promise<T> {
  assertInteractiveTerminal(io);
  let rawAttempted = false;
  let cursorAttempted = false;
  let outcome: Outcome<T>;
  try {
    rawAttempted = true;
    io.setRawMode(true);
    if (io.capabilities().ansiControl !== false) {
      cursorAttempted = true;
      io.write(HIDE_TERMINAL_CURSOR);
    }
    outcome = { ok: true, value: await operation() };
  } catch (error) {
    outcome = { ok: false, error };
  }

  const cleanupErrors: unknown[] = [];
  if (rawAttempted) {
    try {
      io.setRawMode(false);
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (cursorAttempted) {
    try {
      io.write(SHOW_TERMINAL_CURSOR);
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (!outcome.ok) throw outcome.error;
  if (cleanupErrors.length > 0) throw cleanupFailure(cleanupErrors);
  return outcome.value;
}
