/**
 * The effects around the pure application model: one alternate screen,
 * input decoded one event at a time, caller callbacks in a fixed order,
 * updates through a coalescing mailbox, timers on the injected clock,
 * painting, foreground handoff, and restoration.
 *
 * @module
 */

import {
  systemTerminalClock,
  TerminalAnimationTicker,
  type TerminalClock,
} from "../clock.ts";
import { InteractionCancelled } from "../errors.ts";
import { DenoTerminalIO, type TerminalSize } from "../io.ts";
import { TerminalInputReader, type TerminalKey } from "../keys.ts";
import { assertInteractiveTerminal, withRawTerminal } from "../lifecycle.ts";
import {
  AbortMailbox,
  ResizeMailbox,
  terminalFacts,
} from "../owned-viewport.ts";
import {
  type TerminalPaintOptions,
  terminalPaintOptions,
  TerminalScreenPainter,
} from "../painter.ts";
import { signalPassthrough } from "../signals.ts";
import type { InteractionRuntime } from "../types.ts";
import {
  renderTerminalApplication,
  type TerminalApplicationFrame,
} from "./frame.ts";
import { keyChordOf } from "./keymap.ts";
import {
  createTerminalApplicationModel,
  type TerminalApplicationActionSource,
  terminalApplicationDeadline,
  type TerminalApplicationDismissal,
  type TerminalApplicationEffect,
  type TerminalApplicationInput,
  type TerminalApplicationLayout,
  type TerminalApplicationSelectionMove,
  type TerminalApplicationState,
  terminalApplicationState,
  transitionTerminalApplication,
  updateTerminalApplication,
} from "./model.ts";
import type {
  InlineRun,
  KeymapEntry,
  TerminalApplicationView,
} from "./view.ts";

/**
 * What an action asks the runtime to do next. `foreground` hands the
 * terminal to a caller operation and resumes afterwards; `exit` ends the
 * session. Any other value is a caller error.
 */
export type TerminalApplicationCommand =
  | {
    readonly kind: "foreground";
    /** A line printed after the screen is released, before the operation runs. */
    readonly handoff?: readonly InlineRun[];
    /** Runs after every terminal mode restores and before ownership resumes. */
    readonly run: () => void | Promise<void>;
  }
  | {
    readonly kind: "exit";
    /** Lines printed after the screen is released. */
    readonly epilogue?: readonly string[];
  };

/** The caller's handle on a running application. */
export interface TerminalApplicationContext<A> {
  /** A read-only snapshot of selection, filters, folds, zoom, and scroll. */
  readonly state: TerminalApplicationState;
  /**
   * Replace the view. Inside a callback it applies at once, before the next
   * input; from elsewhere it waits in a mailbox that keeps only the newest
   * view and applies between inputs.
   */
  update(view: TerminalApplicationView<A>): void;
  /** Select an item by identity; `reveal` unfolds its group. */
  select(
    listId: string,
    itemId: string,
    options?: { readonly reveal?: boolean },
  ): void;
  /** End the session with this error after restoring the terminal. */
  fail(error: unknown): void;
  /** The runtime clock's time. */
  now(): number;
}

/** Contents, bindings, and callbacks for one persistent terminal session. */
export interface TerminalApplicationOptions<A> {
  readonly view: TerminalApplicationView<A>;
  /** Caller bindings; collisions with reserved keys throw before the terminal changes. */
  readonly keymap?: readonly KeymapEntry<A>[];
  /** Bind j and k to Down and Up. */
  readonly viKeys?: boolean;
  /** Starts once after the first frame; returns cleanup for timers or subscriptions. */
  readonly start?: (
    context: TerminalApplicationContext<A>,
  ) => void | (() => void);
  /** An action chose by Enter, a binding, or another route. Return a command to leave or hand off. */
  readonly onAction?: (
    action: A,
    context: TerminalApplicationContext<A>,
    source: TerminalApplicationActionSource,
  ) => TerminalApplicationCommand | void;
  /** The selected item changed, for any reason. */
  readonly onSelectionChange?: (
    listId: string,
    itemId: string | undefined,
    context: TerminalApplicationContext<A>,
  ) => void;
  /** A view change moved the selected item to another group, or removed it. */
  readonly onSelectionMoved?: (
    listId: string,
    itemId: string,
    move: TerminalApplicationSelectionMove,
    context: TerminalApplicationContext<A>,
  ) => void;
  /** A message was dismissed; the next view must omit it. */
  readonly onDismiss?: (
    target: { readonly message: string },
    via: TerminalApplicationDismissal,
    context: TerminalApplicationContext<A>,
  ) => void;
}

/** One observed frame, without content or product facts. */
export interface TerminalApplicationObservation {
  readonly size: TerminalSize;
  readonly layout: TerminalApplicationLayout;
  readonly renderCalls: number;
  readonly renderDurationMs: number;
  /** How the frame reached the screen: every row, only changed rows, or not at all. */
  readonly paint: "keyframe" | "rows" | "unchanged";
  /** Whether this paint wrote anything. */
  readonly written: boolean;
  /** Rows this paint wrote. */
  readonly rowsWritten: number;
  /** UTF-8 bytes this paint wrote, control sequences and any state report included. */
  readonly bytesWritten: number;
  /** UTF-8 size of the rendered frame's rows: what rewriting all of them costs. */
  readonly frameBytes: number;
  /** Whether a visible glyph moves, which keeps the animation tick running. */
  readonly animated: boolean;
}

/** Optional cancellation, timing, motion, painting, and diagnostics for the owned session. */
export interface TerminalApplicationRuntime extends InteractionRuntime {
  readonly abortSignal?: AbortSignal;
  readonly observe?: (observation: TerminalApplicationObservation) => void;
  /**
   * Time for settle windows, message timeouts, keyframe intervals, and the
   * animation tick. Defaults to the process clock; tests pass a manual clock.
   */
  readonly clock?: TerminalClock;
  /** Hold animated glyphs on their resting form and never run the animation tick. */
  readonly reducedMotion?: boolean;
  /**
   * How frames are written. The defaults bracket each paint in synchronized
   * output, rewrite only changed rows, and paint a keyframe at least every 30
   * seconds while the screen changes.
   */
  readonly paint?: Partial<TerminalPaintOptions>;
}

const textEncoder = new TextEncoder();
const COMMAND_KINDS: ReadonlySet<string> = new Set(["foreground", "exit"]);
/** Callbacks one input may cause before its views are judged unstable. */
const MAXIMUM_CALLBACKS = 512;

function assertCommand(command: unknown): TerminalApplicationCommand | void {
  if (command === undefined) return undefined;
  if (
    typeof command !== "object" || command === null ||
    !COMMAND_KINDS.has(String((command as { kind?: unknown }).kind))
  ) {
    throw new TypeError(
      "application actions return a foreground or exit command, or nothing",
    );
  }
  const typed = command as TerminalApplicationCommand;
  if (typed.kind === "foreground" && typeof typed.run !== "function") {
    throw new TypeError("a foreground command runs an operation");
  }
  return typed;
}

/** The plain line a foreground handoff prints on the released screen. */
function handoffLine(
  runs: readonly InlineRun[],
  unicode: boolean,
): string {
  return runs.map((run) => unicode ? run.text : run.ascii ?? run.text).join("");
}

/**
 * Own an alternate-screen application until an action exits. Input is
 * decoded one event at a time: the package applies its own transition,
 * then calls `onSelectionMoved`, `onSelectionChange`, `onDismiss`, and
 * `onAction` in that order; an update made inside them applies before the
 * next input. Escape never exits by itself. Ctrl+C, EOF, and abort throw
 * `InteractionCancelled` after restoration unless a binding claims Ctrl+C.
 * Resolves with the final state.
 */
export async function runTerminalApplication<A>(
  options: TerminalApplicationOptions<A>,
  runtime: TerminalApplicationRuntime = {},
): Promise<TerminalApplicationState> {
  if (runtime.abortSignal?.aborted) {
    throw new InteractionCancelled("Cancelled.");
  }
  const io = runtime.io ?? new DenoTerminalIO();
  assertInteractiveTerminal(io);
  terminalFacts(io);
  const paintOptions = terminalPaintOptions(runtime.paint);
  const clock = runtime.clock ?? systemTerminalClock;
  const created = createTerminalApplicationModel(options.view, {
    ...(options.keymap === undefined ? {} : { keymap: options.keymap }),
    ...(options.viKeys === undefined ? {} : { viKeys: options.viKeys }),
  }, clock.now());
  let model = created.model;
  const queue: TerminalApplicationEffect<A>[] = [...created.effects];
  const updates = new ResizeMailbox();
  const ticker = new TerminalAnimationTicker(clock, updates.notify);
  const abort = new AbortMailbox(runtime.abortSignal);
  const reader = new TerminalInputReader(io);
  let ended = false;
  let dispatching = false;
  let pendingView: TerminalApplicationView<A> | undefined;
  const pendingInputs: TerminalApplicationInput[] = [];
  let fault: { error: unknown } | undefined;
  const subscription: { cleanup?: () => void } = {};
  let started = false;
  let failure: { error: unknown } | undefined;
  let signalRestored = false;
  let timer: { readonly at: number; readonly cancel: () => void } | undefined;
  /** Keys read but not yet applied; they survive a foreground handoff. */
  const pendingKeys: TerminalKey[] = [];
  let painter: TerminalScreenPainter | undefined;

  const disposeSubscription = (): void => {
    const cleanup = subscription.cleanup;
    delete subscription.cleanup;
    cleanup?.();
  };
  const stopTimer = (): void => {
    timer?.cancel();
    timer = undefined;
  };
  const context: TerminalApplicationContext<A> = {
    get state() {
      return terminalApplicationState(model);
    },
    update(view) {
      if (ended) return;
      if (dispatching) {
        const step = updateTerminalApplication(model, view, clock.now());
        model = step.model;
        queue.push(...step.effects);
        return;
      }
      pendingView = view;
      updates.notify();
    },
    select(listId, itemId, selection = {}) {
      if (ended) return;
      const input: TerminalApplicationInput = {
        kind: "select",
        listId,
        itemId,
        ...(selection.reveal === true ? { reveal: true } : {}),
      };
      if (dispatching) {
        const step = transitionTerminalApplication(model, input, clock.now());
        model = step.model;
        queue.push(...step.effects);
        return;
      }
      pendingInputs.push(input);
      updates.notify();
    },
    fail(error) {
      if (!ended) {
        fault = { error };
        updates.notify();
      }
    },
    now: () => clock.now(),
  };

  /** Run queued callbacks in order; the first command an action returns wins. */
  const dispatch = (): TerminalApplicationCommand | void => {
    let command: TerminalApplicationCommand | undefined;
    dispatching = true;
    try {
      for (let calls = 0; queue.length > 0; calls += 1) {
        if (calls >= MAXIMUM_CALLBACKS) {
          throw new TypeError("application callbacks did not settle");
        }
        const effect = queue.shift();
        if (effect === undefined) break;
        switch (effect.kind) {
          case "selection-moved":
            options.onSelectionMoved?.(
              effect.listId,
              effect.itemId,
              effect.move,
              context,
            );
            break;
          case "selection-change":
            options.onSelectionChange?.(effect.listId, effect.itemId, context);
            break;
          case "dismiss":
            options.onDismiss?.(effect.target, effect.via, context);
            break;
          case "action": {
            const result = assertCommand(
              options.onAction?.(effect.action, context, effect.source),
            );
            command ??= result ?? undefined;
            break;
          }
          case "cancel":
            throw new InteractionCancelled("Cancelled.");
        }
      }
    } finally {
      dispatching = false;
    }
    return command;
  };
  const apply = (
    input: TerminalApplicationInput,
  ): TerminalApplicationCommand | void => {
    const step = transitionTerminalApplication(model, input, clock.now());
    model = step.model;
    queue.push(...step.effects);
    return dispatch();
  };
  /**
   * Below the minimum size navigation waits; bindings still run, and Ctrl+C
   * still cancels unless a binding claims it.
   */
  const suspendedKey = (
    key: TerminalKey,
  ): TerminalApplicationCommand | void => {
    const chord = keyChordOf(key);
    const binding = chord === undefined
      ? undefined
      : model.keymap.base.get(chord);
    if (binding !== undefined) {
      queue.push({ kind: "action", action: binding.action, source: "key" });
    } else if (chord === "ctrl-c") queue.push({ kind: "cancel" });
    return dispatch();
  };

  /** Apply what waited in the mailbox: the newest view, caller selections, due timers. */
  const drainMailbox = (): TerminalApplicationCommand | void => {
    if (pendingView !== undefined) {
      const view = pendingView;
      pendingView = undefined;
      const step = updateTerminalApplication(model, view, clock.now());
      model = step.model;
      queue.push(...step.effects);
    }
    for (const input of pendingInputs.splice(0)) {
      const step = transitionTerminalApplication(model, input, clock.now());
      model = step.model;
      queue.push(...step.effects);
    }
    const command = dispatch();
    return command ?? apply({ kind: "time" });
  };
  const schedule = (): void => {
    const now = clock.now();
    const deadline = terminalApplicationDeadline(model, now);
    if (deadline === timer?.at) return;
    stopTimer();
    if (deadline === undefined || ended) return;
    const cancel = clock.delay(
      () => {
        timer = undefined;
        updates.notify();
      },
      Math.max(0, deadline - now),
    );
    timer = { at: deadline, cancel };
  };

  try {
    while (true) {
      let unlistenResize = (): void => {};
      const stopResize = (): void => {
        const unlisten = unlistenResize;
        unlistenResize = () => {};
        unlisten();
      };
      const command = await withRawTerminal(
        io,
        async (): Promise<TerminalApplicationCommand> => {
          const screen = new TerminalScreenPainter(
            io,
            () => clock.now(),
            paintOptions,
          );
          painter = screen;
          let paintedSize: TerminalSize | undefined;
          let rendered: TerminalApplicationFrame<A> | undefined;
          const paint = (): void => {
            if (signalRestored) throw new InteractionCancelled("Cancelled.");
            if (fault !== undefined) throw fault.error;
            for (let attempt = 0; attempt < 8; attempt += 1) {
              const facts = terminalFacts(io);
              const startedAt = performance.now();
              const frame = renderTerminalApplication(
                model,
                facts.size,
                facts.capabilities,
                runtime,
                {
                  phase: ticker.phase,
                  now: clock.now(),
                  ...(runtime.reducedMotion === true
                    ? { reducedMotion: true }
                    : {}),
                },
              );
              model = frame.model;
              const painted = screen.paint({
                frame: frame.frame,
                size: facts.size,
                layer: frame.layout,
                ...(frame.windowTitle === undefined
                  ? {}
                  : { title: frame.windowTitle }),
                ...(facts.capabilities.applicationStateReports === true
                  ? { report: frame.report }
                  : {}),
              });
              if (painted.status === "resized") continue;
              rendered = frame;
              paintedSize = facts.size;
              ticker.sync(frame.animated);
              schedule();
              runtime.observe?.({
                size: facts.size,
                layout: frame.layout,
                renderCalls: frame.renderCalls,
                renderDurationMs: performance.now() - startedAt,
                paint: painted.status === "painted"
                  ? painted.kind
                  : "unchanged",
                written: painted.status === "painted",
                rowsWritten: painted.status === "painted" ? painted.rows : 0,
                bytesWritten: painted.status === "painted" ? painted.bytes : 0,
                frameBytes: textEncoder.encode(frame.frame).length,
                animated: frame.animated,
              });
              return;
            }
            throw new TypeError(
              "application viewport did not stabilise while painting",
            );
          };
          unlistenResize = io.listenResize?.(updates.notify) ?? (() => {});
          try {
            paint();
            if (!started) {
              started = true;
              const cleanup = options.start?.(context);
              if (cleanup !== undefined && typeof cleanup !== "function") {
                throw new TypeError(
                  "application start must return synchronous subscription cleanup",
                );
              }
              if (cleanup !== undefined) subscription.cleanup = cleanup;
              const before = model;
              const first = dispatch() ?? drainMailbox();
              if (first !== undefined) return first;
              if (model !== before) paint();
            }
            let inputRead:
              | ReturnType<TerminalInputReader["readEvents"]>
              | undefined;
            let updateRead = updates.next();
            while (true) {
              if (fault !== undefined) throw fault.error;
              if (runtime.abortSignal?.aborted) {
                throw new InteractionCancelled("Cancelled.");
              }
              if (pendingKeys.length === 0) {
                inputRead ??= reader.readEvents();
                const received = await Promise.race([
                  inputRead.then((events) => ({
                    kind: "input" as const,
                    events,
                  })),
                  updateRead.then(() => ({ kind: "update" as const })),
                  abort.event,
                ]);
                if (received.kind === "abort") {
                  throw new InteractionCancelled("Cancelled.");
                }
                if (received.kind === "update") {
                  updateRead = updates.next();
                  const command = drainMailbox();
                  if (command !== undefined) return command;
                  paint();
                  continue;
                }
                inputRead = undefined;
                if (received.events === null) {
                  throw new InteractionCancelled("Input ended.");
                }
                pendingKeys.push(
                  ...received.events.flatMap((event) =>
                    event.kind === "key" ? [event.key] : []
                  ),
                );
              }
              // Geometry is rechecked before input even on hosts without resize signals.
              const size = io.size();
              if (
                paintedSize?.rows !== size.rows ||
                paintedSize.columns !== size.columns
              ) paint();
              const key = pendingKeys.shift();
              if (key === undefined) continue;
              const waiting = drainMailbox();
              if (waiting !== undefined) return waiting;
              const command = rendered?.layout === "too-small"
                ? suspendedKey(key)
                : apply({ kind: "key", key });
              if (command !== undefined) return command;
              if (pendingKeys.length === 0) paint();
            }
          } finally {
            ticker.stop();
            stopTimer();
            stopResize();
            screen.release();
            painter = undefined;
          }
        },
        {
          ...signalPassthrough(runtime),
          alternateScreen: true,
          onSignalRestore: () => {
            signalRestored = true;
            ended = true;
            ticker.stop();
            stopTimer();
            updates.notify();
            painter?.release();
            try {
              stopResize();
            } finally {
              disposeSubscription();
            }
          },
        },
      );
      if (command.kind === "exit") {
        ended = true;
        for (const line of command.epilogue ?? []) io.write(`${line}\n`);
        break;
      }
      if (command.handoff !== undefined) {
        io.write(
          `${handoffLine(command.handoff, io.capabilities().unicode)}\n`,
        );
      }
      await command.run();
    }
  } catch (error) {
    failure = { error };
  } finally {
    ended = true;
    ticker.stop();
    stopTimer();
    abort.stop();
    try {
      disposeSubscription();
    } catch (error) {
      failure ??= { error };
    }
  }
  if (failure !== undefined) throw failure.error;
  return terminalApplicationState(model);
}
