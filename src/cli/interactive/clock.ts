/**
 * Injectable time for owned screens.
 *
 * @module
 */

import type { InteractionDelayScheduler } from "./types.ts";

/**
 * Monotonic time plus a one-shot timer. An owned screen reads every interval
 * it measures and schedules every repaint it times through one clock, so a
 * test substitutes a manual clock and advances it without real delays.
 */
export interface TerminalClock extends InteractionDelayScheduler {
  /** Monotonic milliseconds; only differences are meaningful. */
  now(): number;
}

/** The process clock: `performance.now()` and `setTimeout`. */
export const systemTerminalClock: TerminalClock = Object.freeze({
  now: () => performance.now(),
  delay(callback: () => void, delayMs: number): () => void {
    const timer = setTimeout(callback, delayMs);
    return () => clearTimeout(timer);
  },
});
