/**
 * Timed triangle spinner and truthful determinate progress loops.
 *
 * @module
 */

import type {
  DeterminateProgressFrameState,
  SpinnerFrameState,
} from "../interactive-states.ts";
import type { TerminalCapabilities } from "../capabilities.ts";
import { measureText, truncateText } from "../text.ts";
import { terminalThemes, type TerminalThemeVariant } from "../theme.ts";
import {
  DISCERN_TRIANGLE_SPINNER_ORDER,
  renderTriangleSpinnerFrame,
} from "../triangles.ts";
import renderMeterCli from "../../components/feedback/meter/meter.cli.ts";
import { defaultTerminalFrameWidth } from "../frame-measure.ts";
import { DenoTerminalIO, type TerminalIO } from "./io.ts";
import {
  assertInteractiveTerminal,
  withHiddenTerminalCursor,
} from "./lifecycle.ts";
import { InlineFramePainter } from "./painter.ts";
import { signalPassthrough, type TerminalSignalOptions } from "./signals.ts";

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
export interface SpinnerOptions extends TerminalSignalOptions {
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

/**
 * Reject labels that would break single-line activity frame geometry: a
 * control character (including a newline) or an invisible format character
 * inside a live repainted frame corrupts its row accounting.
 */
function assertActivityLabel(label: string): void {
  if (/[\p{Cc}\p{Cf}]/u.test(label)) {
    throw new TypeError(
      "activity labels must be free of control and format characters",
    );
  }
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

function renderSpinner(
  state: SpinnerFrameState,
  capabilities: TerminalCapabilities,
  theme: TerminalThemeVariant | undefined,
): string {
  const selectedTheme = terminalThemes[theme ?? "dark"];
  const gap = " ".repeat(
    selectedTheme.spacing["--discern-space-2"] ?? 1,
  );
  const spinner = renderTriangleSpinnerFrame(
    state.phase,
    capabilities,
    theme === undefined ? {} : { theme },
  );
  const label = truncateText(
    state.label,
    Math.max(
      0,
      capabilities.columns - measureText(spinner) - measureText(gap),
    ),
    capabilities.unicode ? "…" : ".",
  );
  const frame = `${spinner}${gap}${label}`;
  return state.hint === undefined || state.hint === ""
    ? frame
    : `${frame}\n${state.hint}`;
}

/**
 * Run a callback while repainting the canonical triangle spinner cycle.
 * A SIGINT during the run stops the animation, clears the live frame, and
 * restores the cursor before the signal re-raises — or reaches the caller's
 * `onInterrupt` cancellation path instead.
 */
export async function withSpinner<T>(
  options: SpinnerOptions,
  operation: () => T | Promise<T>,
): Promise<T> {
  assertActivityLabel(options.label);
  const io = options.io ?? new DenoTerminalIO();
  assertInteractiveTerminal(io);
  const interval = spinnerInterval(options.intervalMs);
  const scheduler = options.scheduler ?? systemSpinnerScheduler;
  const painter = new InlineFramePainter(io);
  let stop = (): void => {};
  return await withHiddenTerminalCursor(io, async () => {
    let phase = 0;
    let staticMode = false;
    const paint = (): void => {
      if (staticMode) return;
      const frame = renderSpinner(
        spinnerFrame(options, phase),
        io.capabilities(),
        options.theme,
      );
      const result = painter.replace(frame);
      if (result.status === "refused") {
        painter.finish();
        io.write(`${frame}\n`);
        staticMode = true;
        stop();
        return;
      }
      phase = (phase + 1) % DISCERN_TRIANGLE_SPINNER_ORDER.length;
    };
    paint();
    if (!staticMode) {
      stop = scheduler.repeat(paint, interval);
      if (staticMode) stop();
    }
    try {
      return await operation();
    } finally {
      try {
        stop();
      } finally {
        painter.clear();
      }
    }
  }, {
    ...signalPassthrough(options),
    onSignalRestore: () => {
      stop();
      painter.clear();
    },
  });
}

/** Options for a determinate progress operation. */
export interface DeterminateProgressOptions extends TerminalSignalOptions {
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
  /** Label the progress frame currently presents. */
  readonly label: string;
  /**
   * Set an absolute completed-unit value — optionally naming the unit of
   * work now underway — and repaint.
   */
  set(completed: number, label?: string): void;
  /**
   * Advance by a non-negative number of units — optionally naming the unit
   * of work now underway — and repaint.
   */
  advance(units?: number, label?: string): void;
  /** Present a new label without changing completed units, and repaint. */
  relabel(label: string): void;
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
  #label: string;
  #staticMode = false;

  constructor(
    readonly options: DeterminateProgressOptions,
    readonly io: TerminalIO,
    readonly painter: InlineFramePainter,
  ) {
    this.#completed = options.completed ?? 0;
    this.#label = options.label;
  }

  get completed(): number {
    return this.#completed;
  }

  get total(): number {
    return this.options.total;
  }

  get label(): string {
    return this.#label;
  }

  set(completed: number, label?: string): void {
    assertCompleted(completed, this.total);
    if (label !== undefined) assertActivityLabel(label);
    this.#completed = completed;
    if (label !== undefined) this.#label = label;
    this.paint();
  }

  advance(units = 1, label?: string): void {
    if (!Number.isFinite(units) || units < 0) {
      throw new TypeError(
        `determinate progress advance must be non-negative and finite; received ${units}`,
      );
    }
    this.set(Math.min(this.total, this.#completed + units), label);
  }

  relabel(label: string): void {
    assertActivityLabel(label);
    this.#label = label;
    this.paint();
  }

  paint(): void {
    const state: DeterminateProgressFrameState = {
      kind: "determinate-progress",
      label: this.#label,
      lifecycle: this.#completed === this.total
        ? { status: "submitted" }
        : { status: "active" },
      completed: this.#completed,
      total: this.total,
      ...(this.options.hint === undefined ? {} : { hint: this.options.hint }),
    };
    const frame = renderMeterCli({
      ...state,
      ...(this.options.theme === undefined
        ? {}
        : { theme: this.options.theme }),
      width: defaultTerminalFrameWidth(this.io.capabilities()),
    }, this.io.capabilities());
    if (this.#staticMode) {
      this.io.write(`${frame}\n`);
      return;
    }
    const result = this.painter.replace(frame);
    if (result.status === "refused") {
      this.painter.finish();
      this.io.write(`${frame}\n`);
      this.#staticMode = true;
    }
  }
}

/**
 * Run a callback with a determinate progress handle. Successful completion
 * truthfully advances to `total`; exceptions clear the frame and restore the
 * cursor, and a SIGINT clears the incomplete frame and restores the cursor
 * before re-raising — or reaches the caller's `onInterrupt` path instead.
 */
export async function withDeterminateProgress<T>(
  options: DeterminateProgressOptions,
  operation: (progress: DeterminateProgressController) => T | Promise<T>,
): Promise<T> {
  assertActivityLabel(options.label);
  assertTotal(options.total);
  assertCompleted(options.completed ?? 0, options.total);
  const io = options.io ?? new DenoTerminalIO();
  assertInteractiveTerminal(io);
  const painter = new InlineFramePainter(io);
  return await withHiddenTerminalCursor(io, async () => {
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
  }, {
    ...signalPassthrough(options),
    onSignalRestore: () => painter.clear(),
  });
}
