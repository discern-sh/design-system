/**
 * The time-advancing activity layer: the timed motif spinner, truthful
 * determinate progress, and the live activity log for long-running work
 * with streaming detail.
 *
 * @module
 */

import type {
  ActivityLogFrameState,
  ActivityLogLineTone,
  ActivityLogStableLineState,
  DeterminateProgressFrameState,
  InteractiveFrameLifecycle,
  SpinnerFrameState,
} from "../interactive-states.ts";
import { stripAnsi, styleText } from "../ansi.ts";
import type { TerminalCapabilities } from "../capabilities.ts";
import type { CliPresentationOptions } from "../contracts.ts";
import {
  type NarrationLineKind,
  narrationLineRenderers,
} from "../narration.ts";
import { graphemeWidth, measureText, truncateText } from "../text.ts";
import { motifPassthrough, terminalMotifRepertoire } from "../motif.ts";
import { terminalThemes } from "../theme.ts";
import { renderMotifSpinnerFrame } from "../motifs.ts";
import renderActivityLogCli from "../../components/workflow/activity-log/activity-log.cli.ts";
import renderMeterCli from "../../components/feedback/meter/meter.cli.ts";
import { defaultTerminalFrameWidth } from "../frame-measure.ts";
import { DenoTerminalIO, type TerminalIO } from "./io.ts";
import {
  assertInteractiveTerminal,
  withHiddenTerminalCursor,
} from "./lifecycle.ts";
import { InlineFramePainter } from "./painter.ts";
import { signalPassthrough, type TerminalSignalOptions } from "./signals.ts";
import { fitInteractionFrame } from "./viewport-budget.ts";

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

/** Options for an indeterminate motif spinner operation. */
export interface SpinnerOptions
  extends TerminalSignalOptions, CliPresentationOptions {
  readonly label: string;
  readonly hint?: string;
  readonly io?: TerminalIO;
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
  presentation: CliPresentationOptions,
): string {
  const selectedTheme = terminalThemes[presentation.theme ?? "dark"];
  const gap = " ".repeat(
    selectedTheme.spacing["--discern-space-2"] ?? 1,
  );
  const spinner = renderMotifSpinnerFrame(
    state.phase,
    capabilities,
    presentation,
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
 * Run a callback while repainting the effective motif spinner cycle.
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
        options,
      );
      const result = painter.replace(frame);
      if (result.status === "refused") {
        painter.finish();
        io.write(`${frame}\n`);
        staticMode = true;
        stop();
        return;
      }
      phase = (phase + 1) %
        terminalMotifRepertoire(
          options.motif,
          io.capabilities().unicode,
        ).spinner.length;
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
export interface DeterminateProgressOptions
  extends TerminalSignalOptions, CliPresentationOptions {
  readonly label: string;
  readonly total: number;
  readonly completed?: number;
  readonly hint?: string;
  readonly io?: TerminalIO;
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
      ...motifPassthrough(this.options),
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

/** Options for a live activity log operation. */
export interface ActivityLogOptions
  extends TerminalSignalOptions, CliPresentationOptions {
  readonly label: string;
  readonly hint?: string;
  /** Requested upper bound on streamed tail rows (default 6). */
  readonly tailRows?: number;
  readonly io?: TerminalIO;
  readonly intervalMs?: number;
  readonly scheduler?: SpinnerScheduler;
}

/** Declared presentation of a finished activity log. */
export type ActivityLogCompletion =
  | { readonly mode: "summary" }
  | {
    readonly mode: "result";
    readonly tone: ActivityLogLineTone;
    readonly text: string;
  };

/**
 * Mutable producer handle scoped to {@linkcode withActivityLog}. The
 * caller owns its subprocesses and hands the package only text; streamed
 * lines are sanitised display text, while pinned lines and labels stay
 * under the throwing caller-text validation.
 */
export interface ActivityLogController {
  /** Headline label the frame currently presents. */
  readonly label: string;
  /** Commit one streamed line, replacing any in-progress partial line. */
  append(line: string): void;
  /**
   * Replace the in-progress partial line shown on the tail's last row.
   * An empty string clears it. Degraded output never presents partial
   * churn; an uncommitted partial is flushed once at finish.
   */
  updatePartial(line: string): void;
  /** Pin a stable line above the tail (default tone `note`). */
  pin(text: string, tone?: ActivityLogLineTone): void;
  /** Present a new headline label. */
  relabel(label: string): void;
  /**
   * Finish the log with the declared completion: keep the pinned stable
   * summary (the default), or collapse to a single toned result line.
   * Later producer calls throw; an operation that returns without
   * finishing gets the summary completion applied for it.
   */
  finish(completion?: ActivityLogCompletion): void;
}

const ACTIVITY_LOG_TONES: readonly ActivityLogLineTone[] = [
  "success",
  "note",
  "warning",
  "failure",
];

function assertActivityLogTailRows(value: number | undefined): number {
  const rows = value ?? 6;
  if (!Number.isSafeInteger(rows) || rows < 1) {
    throw new TypeError(
      `activity log tail rows must be a positive safe integer; received ${rows}`,
    );
  }
  return rows;
}

function assertStableLineText(text: string): void {
  if (
    text === "" || text.trim() !== text || /[\p{Cc}\p{Cf}]/u.test(text)
  ) {
    throw new TypeError(
      "activity log stable lines must be non-empty, trimmed, and free of control and format characters",
    );
  }
}

function assertActivityLogTone(tone: ActivityLogLineTone): void {
  if (!ACTIVITY_LOG_TONES.includes(tone)) {
    throw new TypeError(`unknown activity log line tone ${tone}`);
  }
}

const ESCAPE_CHARACTER = String.fromCharCode(27);
const CHARSET_ESCAPE_PAIR = new RegExp(
  `${ESCAPE_CHARACTER}[()][ -~]`,
  "gu",
);
const SINGLE_CHARACTER_ESCAPE = new RegExp(
  `${ESCAPE_CHARACTER}[ -~]?`,
  "gu",
);

function expandTabStops(value: string): string {
  if (!value.includes("\t")) return value;
  let result = "";
  let width = 0;
  for (const character of value) {
    if (character === "\t") {
      const spaces = 8 - (width % 8);
      result += " ".repeat(spaces);
      width += spaces;
      continue;
    }
    result += character;
    width += graphemeWidth(character);
  }
  return result;
}

/**
 * Reduce untrusted streamed text to the package's display repertoire:
 * strip ANSI sequences, keep the final visible segment of carriage-return
 * overwrites, expand tabs to eight-column stops, and remove the remaining
 * control and format characters. The visible text survives; a foreign
 * escape's styling does not.
 */
function sanitizeStreamedText(value: string): string {
  let text = stripAnsi(value)
    .replace(CHARSET_ESCAPE_PAIR, "")
    .replace(SINGLE_CHARACTER_ESCAPE, "");
  if (text.endsWith("\r")) text = text.slice(0, -1);
  const lastReturn = text.lastIndexOf("\r");
  if (lastReturn !== -1) text = text.slice(lastReturn + 1);
  return expandTabStops(text).replace(/[\p{Cc}\p{Cf}]/gu, "");
}

function assertSingleStreamedLine(value: string, name: string): void {
  if (value.includes("\n")) {
    throw new TypeError(
      `${name} is appended one line at a time; received an embedded newline`,
    );
  }
}

class ActivityLogRun implements ActivityLogController {
  #label: string;
  #mode: "live" | "append";
  #finished = false;
  #phase = 0;
  #stable: ActivityLogStableLineState[] = [];
  #shownStable = 0;
  #tail: string[] = [];
  #partial: string | undefined;
  #headlineShown = false;
  #stopTicks = (): void => {};
  readonly #painter: InlineFramePainter;

  constructor(
    readonly options: ActivityLogOptions,
    readonly io: TerminalIO,
    readonly requestedTailRows: number,
  ) {
    this.#label = options.label;
    this.#painter = new InlineFramePainter(io);
    this.#mode = io.isInteractive() && io.capabilities().ansiControl !== false
      ? "live"
      : "append";
  }

  get label(): string {
    return this.#label;
  }

  get finished(): boolean {
    return this.#finished;
  }

  get mode(): "live" | "append" {
    return this.#mode;
  }

  /** Paint the first honest frame, or open the append-only feed. */
  begin(scheduler: SpinnerScheduler, intervalMs: number): void {
    if (!this.#isLive()) {
      this.#emitHeadline();
      return;
    }
    this.#paintActive();
    if (!this.#isLive() || this.#finished) return;
    this.#stopTicks = scheduler.repeat(() => this.#tick(), intervalMs);
    if (!this.#isLive()) this.#stopTicks();
  }

  #isLive(): boolean {
    return this.#mode === "live";
  }

  append(line: string): void {
    this.#assertUnfinished();
    assertSingleStreamedLine(line, "an activity log line");
    const clean = sanitizeStreamedText(line);
    this.#partial = undefined;
    if (this.#mode === "append") {
      this.#writeRailLine(clean);
      return;
    }
    this.#tail.push(clean);
    if (this.#tail.length > this.requestedTailRows) {
      this.#tail.splice(0, this.#tail.length - this.requestedTailRows);
    }
  }

  updatePartial(line: string): void {
    this.#assertUnfinished();
    assertSingleStreamedLine(line, "an activity log partial line");
    const clean = sanitizeStreamedText(line);
    this.#partial = clean === "" ? undefined : clean;
  }

  pin(text: string, tone: ActivityLogLineTone = "note"): void {
    this.#assertUnfinished();
    assertStableLineText(text);
    assertActivityLogTone(tone);
    this.#stable.push({ text, tone });
    if (this.#mode === "append") {
      this.#writeNarrationLine(text, tone);
      this.#shownStable = this.#stable.length;
    }
  }

  relabel(label: string): void {
    this.#assertUnfinished();
    assertActivityLabel(label);
    this.#label = label;
    if (this.#mode === "append") this.#emitHeadline();
  }

  finish(completion: ActivityLogCompletion = { mode: "summary" }): void {
    this.#assertUnfinished();
    if (completion.mode === "result") {
      assertStableLineText(completion.text);
      assertActivityLogTone(completion.tone);
    }
    this.#finished = true;
    this.#stopTicks();
    if (this.#mode === "append") {
      this.#flushPartial();
      if (completion.mode === "result") {
        this.#writeNarrationLine(completion.text, completion.tone);
      }
      return;
    }
    const frame = completion.mode === "summary"
      ? this.#renderCollapsed({ status: "submitted" })
      : this.#renderNarrationLine(completion.text, completion.tone);
    this.#replaceOrWrite(frame);
    this.#painter.finish();
  }

  /** Apply the default summary completion when the operation never finished. */
  settle(): void {
    if (!this.#finished) this.finish();
  }

  /** Stop the animation and clear an incomplete live frame after a fault. */
  abandon(): void {
    this.#stopTicks();
    if (!this.#finished && this.#mode === "live") this.#painter.clear();
    this.#finished = true;
  }

  /**
   * The bracket owner's SIGINT restoration share: end the animation and
   * leave coherent scrollback — the stable summary under the cancelled
   * headline — before the terminal restores and the signal re-raises.
   */
  interrupt(): void {
    this.#stopTicks();
    if (this.#mode !== "live") {
      this.#finished = true;
      return;
    }
    if (!this.#finished) {
      this.#replaceOrWrite(
        this.#renderCollapsed({ status: "cancelled", reason: "Cancelled." }),
      );
    }
    this.#painter.finish();
    this.#finished = true;
  }

  #assertUnfinished(): void {
    if (this.#finished) {
      throw new TypeError(
        "this activity log has finished; producer calls after finish are defects",
      );
    }
  }

  #tick(): void {
    if (this.#finished || this.#mode !== "live") return;
    this.#phase = (this.#phase + 1) %
      terminalMotifRepertoire(
        this.options.motif,
        this.io.capabilities().unicode,
      ).spinner.length;
    this.#paintActive();
  }

  #state(
    lifecycle: InteractiveFrameLifecycle,
    tailRows: number,
  ): ActivityLogFrameState {
    return {
      kind: "activity-log",
      label: this.#label,
      lifecycle,
      phase: this.#phase,
      stable: [...this.#stable],
      tail: [...this.#tail],
      ...(this.#partial === undefined ? {} : { partial: this.#partial }),
      tailRows,
      ...(this.options.hint === undefined ? {} : { hint: this.options.hint }),
    };
  }

  #render(state: ActivityLogFrameState): string {
    return renderActivityLogCli({
      ...state,
      ...(this.options.theme === undefined
        ? {}
        : { theme: this.options.theme }),
      ...motifPassthrough(this.options),
    }, this.io.capabilities());
  }

  #renderCollapsed(lifecycle: InteractiveFrameLifecycle): string {
    return this.#render({
      kind: "activity-log",
      label: this.#label,
      lifecycle,
      phase: this.#phase,
      stable: [...this.#stable],
      tail: [],
      tailRows: 0,
    });
  }

  #renderNarrationLine(text: string, kind: NarrationLineKind): string {
    const capabilities = this.io.capabilities();
    return narrationLineRenderers[kind]({
      text,
      maxWidth: defaultTerminalFrameWidth(capabilities),
      ...(this.options.theme === undefined
        ? {}
        : { theme: this.options.theme }),
      ...motifPassthrough(this.options),
    }, capabilities);
  }

  #paintActive(): void {
    let rendered: string;
    try {
      const fitted = fitInteractionFrame({
        viewportRows: this.io.size().rows,
        frame: (viewport) =>
          this.#state(
            { status: "active" },
            Math.min(this.requestedTailRows, viewport.maximumControlRows),
          ),
        render: (state) => this.#render(state),
      });
      rendered = fitted.rendered;
    } catch (error) {
      // A viewport too short for even the minimum coherent frame degrades
      // to the append-only feed instead of refusing the operation.
      if (error instanceof TypeError) {
        this.#painter.finish();
        this.#enterAppend();
        return;
      }
      throw error;
    }
    const result = this.#painter.replace(rendered);
    if (result.status !== "refused") {
      this.#markFrameShown();
      return;
    }
    this.#painter.finish();
    if (result.reason === "current-frame-exceeds-viewport") {
      const restarted = this.#painter.replace(rendered);
      if (restarted.status !== "refused") {
        this.#markFrameShown();
        return;
      }
    }
    this.io.write(`${rendered}\n`);
    this.#markFrameShown();
    this.#enterAppend();
  }

  #markFrameShown(): void {
    this.#headlineShown = true;
    this.#shownStable = this.#stable.length;
  }

  #replaceOrWrite(frame: string): void {
    const result = this.#painter.replace(frame);
    if (result.status === "refused") {
      this.#painter.finish();
      this.io.write(`${frame}\n`);
    }
  }

  #enterAppend(): void {
    this.#mode = "append";
    this.#stopTicks();
    if (!this.#headlineShown) this.#emitHeadline();
    for (const line of this.#stable.slice(this.#shownStable)) {
      this.#writeNarrationLine(line.text, line.tone);
    }
    this.#shownStable = this.#stable.length;
  }

  #emitHeadline(): void {
    this.io.write(`${this.#renderNarrationLine(this.#label, "lead")}\n`);
    this.#headlineShown = true;
  }

  #writeNarrationLine(text: string, kind: NarrationLineKind): void {
    this.io.write(`${this.#renderNarrationLine(text, kind)}\n`);
  }

  #writeRailLine(line: string): void {
    const capabilities = this.io.capabilities();
    const theme = terminalThemes[this.options.theme ?? "dark"];
    const rail = styleText(
      capabilities.unicode ? "│" : "|",
      theme.typography.muted,
      capabilities,
    );
    this.io.write(line === "" ? `${rail}\n` : `${rail} ${line}\n`);
  }

  #flushPartial(): void {
    if (this.#partial === undefined) return;
    this.#writeRailLine(this.#partial);
    this.#partial = undefined;
  }
}

/**
 * Run a callback with a live activity log: pinned stable lines above a
 * bounded streamed tail with in-place partial updates, repainted through
 * the activity scheduler and fitted to the live viewport. Unlike the
 * spinner and progress wrappers this never refuses a non-interactive
 * terminal: non-TTY, missing ANSI control, and painter refusals all
 * degrade to a truthful append-only feed of the same facts — committed
 * lines once each, stable lines when pinned, no partial churn. A SIGINT
 * ends the animation and leaves the stable summary in scrollback before
 * the terminal restores and the signal re-raises — or reaches the
 * caller's `onInterrupt` cancellation path instead. One live activity or
 * request per terminal at a time remains the Adapter's contract.
 */
export async function withActivityLog<T>(
  options: ActivityLogOptions,
  operation: (log: ActivityLogController) => T | Promise<T>,
): Promise<T> {
  assertActivityLabel(options.label);
  if (options.hint !== undefined) assertActivityLabel(options.hint);
  const tailRows = assertActivityLogTailRows(options.tailRows);
  const intervalMs = spinnerInterval(options.intervalMs);
  const io = options.io ?? new DenoTerminalIO();
  const scheduler = options.scheduler ?? systemSpinnerScheduler;
  const run = new ActivityLogRun(options, io, tailRows);
  return await withHiddenTerminalCursor(io, async () => {
    run.begin(scheduler, intervalMs);
    try {
      const value = await operation(run);
      run.settle();
      return value;
    } catch (error) {
      run.abandon();
      throw error;
    }
  }, {
    ...signalPassthrough(options),
    onSignalRestore: () => run.interrupt(),
  });
}
