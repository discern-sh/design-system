/**
 * Injectable time for owned screens and the animation tick that repaints
 * moving glyphs.
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

/** Interval between animation frames: four frames a second. */
export const TERMINAL_ANIMATION_INTERVAL_MS = 250;

/**
 * Advances one shared animation phase while, and only while, the latest
 * painted frame shows a moving glyph. Each tick schedules at most one
 * successor, after the repaint it caused, so a slow paint delays the next
 * frame instead of queueing ticks behind it.
 */
export class TerminalAnimationTicker {
  #phase = 0;
  #cancel: (() => void) | undefined;

  constructor(
    readonly clock: TerminalClock,
    readonly onTick: () => void,
  ) {}

  /** The phase every animated glyph renders at; it advances once per tick. */
  get phase(): number {
    return this.#phase;
  }

  /** Whether a tick is scheduled. */
  get running(): boolean {
    return this.#cancel !== undefined;
  }

  /** Follow the latest frame: schedule the next tick while it animates, stop otherwise. */
  sync(animating: boolean): void {
    if (!animating) {
      this.stop();
      return;
    }
    if (this.#cancel !== undefined) return;
    this.#cancel = this.clock.delay(() => {
      this.#cancel = undefined;
      this.#phase += 1;
      this.onTick();
    }, TERMINAL_ANIMATION_INTERVAL_MS);
  }

  /** Cancel a scheduled tick; the phase is kept for the next start. */
  stop(): void {
    const cancel = this.#cancel;
    this.#cancel = undefined;
    cancel?.();
  }
}
