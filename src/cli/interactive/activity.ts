/**
 * Timed triangle spinner and truthful determinate progress loops.
 *
 * @module
 */

import type {
  DeterminateProgressFrameState,
  SpinnerFrameState,
} from "../interactive-states.ts";
import type { TerminalThemeVariant } from "../theme.ts";
import { DISCERN_TRIANGLE_SPINNER_ORDER } from "../triangles.ts";
import { renderInteractiveFrame } from "./frame-renderers.ts";
import { DenoTerminalIO, type TerminalIO } from "./io.ts";
import {
  assertInteractiveTerminal,
  withHiddenTerminalCursor,
} from "./lifecycle.ts";
import { InlineFramePainter } from "./painter.ts";

/** Injectable repeating scheduler used by deterministic spinner tests. */
export interface SpinnerScheduler {
  /** Repeatedly call `callback` and return an idempotent cancellation function. */
  repeat(callback: () => void, intervalMs: number): () => void;
}

const systemSpinnerScheduler: SpinnerScheduler = {
  repeat(callback, intervalMs) {
    const timer = setInterval(callback, intervalMs);
    return () => clearInterval(timer);
  },
};

/** Options for an indeterminate triangle spinner operation. */
export interface SpinnerOptions {
  readonly label: string;
  readonly hint?: string;
  readonly io?: TerminalIO;
  readonly theme?: TerminalThemeVariant;
  readonly intervalMs?: number;
  readonly scheduler?: SpinnerScheduler;
}

function spinnerInterval(value: number | undefined): number {
  const interval = value ?? 80;
  if (!Number.isSafeInteger(interval) || interval < 1) {
    throw new TypeError(
      `spinner interval must be a positive safe integer; received ${interval}`,
    );
  }
  return interval;
}

function spinnerFrame(
  options: SpinnerOptions,
  phase: number,
): SpinnerFrameState {
  return {
    kind: "spinner",
    label: options.label,
    lifecycle: { status: "active" },
    phase,
    ...(options.hint === undefined ? {} : { hint: options.hint }),
  };
}

/** Run a callback while repainting the canonical triangle spinner cycle. */
export async function withSpinner<T>(
  options: SpinnerOptions,
  operation: () => T | Promise<T>,
): Promise<T> {
  const io = options.io ?? new DenoTerminalIO();
  assertInteractiveTerminal(io);
  const interval = spinnerInterval(options.intervalMs);
  const scheduler = options.scheduler ?? systemSpinnerScheduler;
  return await withHiddenTerminalCursor(io, async () => {
    const painter = new InlineFramePainter(io);
    let phase = 0;
    const paint = (): void => {
      painter.replace(renderInteractiveFrame(
        spinnerFrame(options, phase),
        io.capabilities(),
        options.theme === undefined ? {} : { theme: options.theme },
      ));
      phase = (phase + 1) % DISCERN_TRIANGLE_SPINNER_ORDER.length;
    };
    paint();
    const stop = scheduler.repeat(paint, interval);
    try {
      return await operation();
    } finally {
      try {
        stop();
      } finally {
        painter.clear();
      }
    }
  });
}

/** Options for a determinate progress operation. */
export interface DeterminateProgressOptions {
  readonly label: string;
  readonly total: number;
  readonly completed?: number;
  readonly hint?: string;
  readonly io?: TerminalIO;
  readonly theme?: TerminalThemeVariant;
}

/** Mutable progress handle scoped to {@linkcode withDeterminateProgress}. */
export interface DeterminateProgressController {
  /** Current completed work units. */
  readonly completed: number;
  /** Total work units represented by the progress frame. */
  readonly total: number;
  /** Set an absolute completed-unit value and repaint. */
  set(completed: number): void;
  /** Advance by a non-negative number of units and repaint. */
  advance(units?: number): void;
}

function assertTotal(total: number): void {
  if (!Number.isFinite(total) || total <= 0) {
    throw new TypeError(
      `determinate progress total must be positive and finite; received ${total}`,
    );
  }
}

function assertCompleted(completed: number, total: number): void {
  if (!Number.isFinite(completed) || completed < 0 || completed > total) {
    throw new TypeError(
      `determinate progress completed must be between 0 and ${total}; received ${completed}`,
    );
  }
}

class ProgressController implements DeterminateProgressController {
  #completed: number;

  constructor(
    readonly options: DeterminateProgressOptions,
    readonly io: TerminalIO,
    readonly painter: InlineFramePainter,
  ) {
    this.#completed = options.completed ?? 0;
  }

  get completed(): number {
    return this.#completed;
  }

  get total(): number {
    return this.options.total;
  }

  set(completed: number): void {
    assertCompleted(completed, this.total);
    this.#completed = completed;
    this.paint();
  }

  advance(units = 1): void {
    if (!Number.isFinite(units) || units < 0) {
      throw new TypeError(
        `determinate progress advance must be non-negative and finite; received ${units}`,
      );
    }
    this.set(Math.min(this.total, this.#completed + units));
  }

  paint(): void {
    const state: DeterminateProgressFrameState = {
      kind: "determinate-progress",
      label: this.options.label,
      lifecycle: this.#completed === this.total
        ? { status: "submitted" }
        : { status: "active" },
      completed: this.#completed,
      total: this.total,
      ...(this.options.hint === undefined ? {} : { hint: this.options.hint }),
    };
    this.painter.replace(renderInteractiveFrame(
      state,
      this.io.capabilities(),
      this.options.theme === undefined ? {} : { theme: this.options.theme },
    ));
  }
}

/**
 * Run a callback with a determinate progress handle. Successful completion
 * truthfully advances to `total`; exceptions clear the frame and restore cursor.
 */
export async function withDeterminateProgress<T>(
  options: DeterminateProgressOptions,
  operation: (progress: DeterminateProgressController) => T | Promise<T>,
): Promise<T> {
  assertTotal(options.total);
  assertCompleted(options.completed ?? 0, options.total);
  const io = options.io ?? new DenoTerminalIO();
  assertInteractiveTerminal(io);
  return await withHiddenTerminalCursor(io, async () => {
    const painter = new InlineFramePainter(io);
    const progress = new ProgressController(options, io, painter);
    progress.paint();
    try {
      const value = await operation(progress);
      progress.set(progress.total);
      painter.finish();
      return value;
    } catch (error) {
      painter.clear();
      throw error;
    }
  });
}
