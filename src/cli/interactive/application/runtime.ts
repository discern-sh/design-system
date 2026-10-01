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
import { type TerminalInputEvent, TerminalInputReader } from "../keys.ts";
import { assertInteractiveTerminal, withRawTerminal } from "../lifecycle.ts";
import { drainTerminalMouseInput } from "../mouse-input.ts";
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
import { type RenderedFrame, renderModelState } from "./frame.ts";
import { keyChordOf } from "./keymap.ts";
import {
  assertDismissalsHonoured,
  bindingInForce,
  createModelState,
  interruptEffect,
  modelStateDeadline,
  snapshotModelState,
  type TerminalApplicationActionSource,
  type TerminalApplicationDismissal,
  type TerminalApplicationDismissTarget,
  type TerminalApplicationEffect,
  type TerminalApplicationInput,
  type TerminalApplicationLayout,
  type TerminalApplicationSelectionMove,
  type TerminalApplicationState,
  transitionModelState,
  updateModelState,
  updateModelStateProvisionally,
} from "./model.ts";
import type { ApplicationActivity } from "./layer-view.ts";
import type {
  ApplicationKeyBinding,
  ApplicationRun,
  TerminalApplicationView,
} from "./view.ts";

/**
 * What an action asks the runtime to do next. `foreground` hands the
 * terminal to a caller operation and resumes afterwards; `background`
 * starts an operation that runs while the screen stays live; `exit` ends
 * the session. Any other value is a caller error.
 */
export type TerminalApplicationCommand =
  | {
    readonly kind: "foreground";
    /** A line printed after the screen is released, before the operation runs. */
    readonly handoff?: readonly ApplicationRun[];
    /** Runs after every terminal mode restores and before ownership resumes. */
    readonly run: () => void | Promise<void>;
  }
  | {
    readonly kind: "background";
    /** Names the command for `onReport`, `onCommandSettled`, and `context.abort`. */
    readonly id: string;
    /**
     * Runs without the terminal: it never reads input. `report` sends its
     * progress to `onReport`; `signal` aborts only through
     * `context.abort(id)`, an exit, or the session ending — never because
     * of a key or a terminal signal.
     */
    readonly run: (
      report: (steps: ApplicationActivity) => void,
      signal: AbortSignal,
    ) => Promise<void>;
  }
  | {
    readonly kind: "exit";
    /** Lines printed after the screen is released. */
    readonly epilogue?: readonly string[];
  };

/** How a background command ended. */
export type TerminalApplicationCommandOutcome =
  | { readonly status: "completed" }
  | { readonly status: "aborted" }
  | { readonly status: "failed"; readonly error: unknown };

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
  /**
   * Write a field's value in an open layer, such as text an external editor
   * returned. Applies like `update`; the cursor moves to the end. Line
   * breaks become newlines in a multi-line field and spaces elsewhere, tabs
   * become spaces, and other control and format characters are dropped; a
   * choice field takes only an option that can be chosen, and any other
   * value fails the session like an invalid view.
   */
  setField(layerId: string, fieldId: string, value: string): void;
  /**
   * Abort a running background command's signal. Unknown or finished ids
   * are ignored; the command reports its end through `onCommandSettled`.
   */
  abort(commandId: string): void;
  /** End the session with this error after restoring the terminal. */
  fail(error: unknown): void;
  /** The runtime clock's time. */
  now(): number;
}

/** Contents, bindings, and callbacks for one persistent terminal session. */
export interface TerminalApplicationOptions<A> {
  readonly view: TerminalApplicationView<A>;
  /** Caller bindings; collisions with reserved keys throw before the terminal changes. */
  readonly keymap?: readonly ApplicationKeyBinding<A>[];
  /** Bind j and k to Down and Up. */
  readonly viKeys?: boolean;
  /** Starts once after the first frame; returns cleanup for timers or subscriptions. */
  readonly start?: (
    context: TerminalApplicationContext<A>,
  ) => void | (() => void);
  /**
   * An action chosen by Enter, a binding, a menu, a button, a click, or a
   * chip, as `source` says. Return a command to hand off, run in the
   * background, or leave.
   */
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
  /**
   * A message or layer was dismissed — by timeout, a key, Escape, the safe
   * button, or a click outside — and the package already hides it. The next
   * view must omit it.
   */
  readonly onDismiss?: (
    target: TerminalApplicationDismissTarget,
    via: TerminalApplicationDismissal,
    context: TerminalApplicationContext<A>,
  ) => void;
  /**
   * A background command reported progress. Reports arriving together are
   * coalesced to the newest per command, and while a foreground operation
   * owns the terminal they wait, so the screen repaints once with the
   * latest when it returns.
   */
  readonly onReport?: (
    commandId: string,
    steps: ApplicationActivity,
    context: TerminalApplicationContext<A>,
  ) => void;
  /** A background command finished, failed, or was aborted. */
  readonly onCommandSettled?: (
    commandId: string,
    outcome: TerminalApplicationCommandOutcome,
    context: TerminalApplicationContext<A>,
  ) => void;
  /**
   * A field in an open layer changed: typing, a choice, or a challenge. It
   * runs before any other callback of the same input, so a preview built
   * from it is current before an action reads it.
   */
  readonly onField?: (
    layerId: string,
    fieldId: string,
    value: string,
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
/** Every command kind, checked against the union so the two never drift. */
const COMMAND_KINDS: ReadonlySet<string> = new Set(
  Object.keys(
    {
      foreground: true,
      background: true,
      exit: true,
    } satisfies Record<TerminalApplicationCommand["kind"], true>,
  ),
);
/** Callbacks one input may cause before its views are judged unstable. */
const MAXIMUM_CALLBACKS = 512;

function assertCommand(command: unknown): TerminalApplicationCommand | void {
  if (command === undefined) return undefined;
  if (
    typeof command !== "object" || command === null ||
    !COMMAND_KINDS.has(String((command as { kind?: unknown }).kind))
  ) {
    throw new TypeError(
      `application actions return a ${
        [...COMMAND_KINDS].join(", ")
      } command, or nothing`,
    );
  }
  const typed = command as TerminalApplicationCommand;
  if (typed.kind !== "exit" && typeof typed.run !== "function") {
    throw new TypeError(`a ${typed.kind} command runs an operation`);
  }
  if (
    typed.kind === "background" &&
    (typeof typed.id !== "string" || typed.id.trim() === "")
  ) {
    throw new TypeError("a background command names itself with an id");
  }
  return typed;
}

/** A callback the runtime owes: a step's effect, or news from a background command. */
type RuntimeCallback<A> =
  | TerminalApplicationEffect<A>
  | {
    readonly kind: "report";
    readonly id: string;
    readonly steps: ApplicationActivity;
  }
  | {
    readonly kind: "settled";
    readonly id: string;
    readonly outcome: TerminalApplicationCommandOutcome;
  };

/** A command that ends the screen's bracket: a handoff or an exit. */
type LoopCommand = Exclude<TerminalApplicationCommand, { kind: "background" }>;

/** A background command that has not settled. */
interface RunningCommand {
  readonly controller: AbortController;
  readonly done: Promise<void>;
}

/** The plain line a foreground handoff prints on the released screen. */
function handoffLine(
  runs: readonly ApplicationRun[],
  unicode: boolean,
): string {
  return runs.map((run) => unicode ? run.text : run.ascii ?? run.text).join("");
}

/**
 * Own an alternate-screen application until an action exits. Input is
 * decoded one event at a time: the package applies its own transition,
 * then calls `onField`, `onSelectionMoved`, `onSelectionChange`,
 * `onDismiss`, and `onAction` in that order; an update made inside them
 * applies before the next input, so a key typed after one that opens a
 * layer lands on that layer. Escape never exits by itself. Ctrl+C, EOF, and
 * abort throw `InteractionCancelled` after restoration unless a binding
 * claims Ctrl+C. Resolves with the final state.
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
  const created = createModelState(options.view, {
    ...(options.keymap === undefined ? {} : { keymap: options.keymap }),
    ...(options.viKeys === undefined ? {} : { viKeys: options.viKeys }),
  }, clock.now());
  let model = created.model;
  const queue: RuntimeCallback<A>[] = [...created.effects];
  /** Background commands by id, until they settle. */
  const running = new Map<string, RunningCommand>();
  /** The newest report per command, waiting for the loop. */
  const reports = new Map<string, ApplicationActivity>();
  /** Commands that settled, waiting for the loop, in order. */
  const settled: {
    readonly id: string;
    readonly outcome: TerminalApplicationCommandOutcome;
  }[] = [];
  const updates = new ResizeMailbox();
  const ticker = new TerminalAnimationTicker(clock, updates.notify);
  const abort = new AbortMailbox(runtime.abortSignal);
  const reader = new TerminalInputReader(io);
  let ended = false;
  let dispatching = false;
  /** Whether a callback replaced the view during the current dispatch. */
  let viewReplaced = false;
  let pendingView: TerminalApplicationView<A> | undefined;
  const pendingInputs: TerminalApplicationInput[] = [];
  let fault: { error: unknown } | undefined;
  const subscription: { cleanup?: () => void } = {};
  let started = false;
  let failure: { error: unknown } | undefined;
  let signalRestored = false;
  let timer: { readonly at: number; readonly cancel: () => void } | undefined;
  /** Input read but not yet applied; it survives a foreground handoff. */
  const pendingEvents: TerminalInputEvent[] = [];
  let mouseObserved = false;
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
      return snapshotModelState(model);
    },
    update(view) {
      if (ended) return;
      if (dispatching) {
        // Later callbacks of this input may report further dismissals, so
        // the view is judged against them once the queue drains.
        const step = updateModelStateProvisionally(
          model,
          view,
          clock.now(),
        );
        model = step.model;
        queue.push(...step.effects);
        viewReplaced = true;
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
        const step = transitionModelState(model, input, clock.now());
        model = step.model;
        queue.push(...step.effects);
        return;
      }
      pendingInputs.push(input);
      updates.notify();
    },
    setField(layerId, fieldId, value) {
      if (ended) return;
      const input: TerminalApplicationInput = {
        kind: "field",
        layerId,
        fieldId,
        value,
      };
      if (dispatching) {
        const step = transitionModelState(model, input, clock.now());
        model = step.model;
        queue.push(...step.effects);
        return;
      }
      pendingInputs.push(input);
      updates.notify();
    },
    abort(commandId) {
      running.get(commandId)?.controller.abort();
    },
    fail(error) {
      if (!ended) {
        fault = { error };
        updates.notify();
      }
    },
    now: () => clock.now(),
  };

  /**
   * Start a background command. Its reports and its end wait for the loop,
   * which delivers them between inputs; nothing reaches the caller once the
   * session has ended.
   */
  const startBackground = (
    command: Extract<TerminalApplicationCommand, { kind: "background" }>,
  ): void => {
    if (running.has(command.id)) {
      throw new TypeError(
        `background command ${JSON.stringify(command.id)} is already running`,
      );
    }
    const controller = new AbortController();
    const report = (steps: ApplicationActivity): void => {
      if (ended || !running.has(command.id)) return;
      reports.set(command.id, steps);
      updates.notify();
    };
    const finish = (outcome: TerminalApplicationCommandOutcome): void => {
      running.delete(command.id);
      if (ended) return;
      settled.push({ id: command.id, outcome });
      updates.notify();
    };
    const done = (async () => {
      try {
        await command.run(report, controller.signal);
        finish(
          controller.signal.aborted
            ? { status: "aborted" }
            : { status: "completed" },
        );
      } catch (error) {
        finish(
          controller.signal.aborted
            ? { status: "aborted" }
            : { status: "failed", error },
        );
      }
    })();
    running.set(command.id, { controller, done });
  };

  /** Run queued callbacks in order; the first command an action returns wins. */
  const dispatch = (): LoopCommand | void => {
    let command: LoopCommand | undefined;
    dispatching = true;
    viewReplaced = false;
    try {
      for (let calls = 0; queue.length > 0; calls += 1) {
        if (calls >= MAXIMUM_CALLBACKS) {
          throw new TypeError("application callbacks did not settle");
        }
        const effect = queue.shift();
        if (effect === undefined) break;
        switch (effect.kind) {
          case "field":
            options.onField?.(
              effect.layerId,
              effect.fieldId,
              effect.value,
              context,
            );
            break;
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
            if (result === undefined) break;
            if (result.kind === "background") startBackground(result);
            else command ??= result;
            break;
          }
          case "report":
            options.onReport?.(effect.id, effect.steps, context);
            break;
          case "settled":
            options.onCommandSettled?.(effect.id, effect.outcome, context);
            break;
          case "cancel":
            throw new InteractionCancelled("Cancelled.");
        }
      }
      // The view a caller leaves in force after hearing of a dismissal must omit it.
      if (viewReplaced) assertDismissalsHonoured(model);
    } finally {
      dispatching = false;
    }
    return command;
  };
  const apply = (
    input: TerminalApplicationInput,
  ): LoopCommand | void => {
    const step = transitionModelState(model, input, clock.now());
    model = step.model;
    queue.push(...step.effects);
    return dispatch();
  };
  /**
   * Below the minimum size navigation waits; the bindings in force still
   * run as they would at full size — the top layer's while one is open,
   * only field bindings while a field owns input — and Ctrl+C keeps its
   * one meaning.
   */
  const suspendedKey = (
    event: TerminalInputEvent,
  ): LoopCommand | void => {
    if (event.kind !== "key") return undefined;
    const chord = keyChordOf(event.key);
    if (chord === "ctrl-c") queue.push(interruptEffect(model));
    else {
      const binding = chord === undefined
        ? undefined
        : bindingInForce(model, chord);
      if (binding !== undefined) {
        queue.push({ kind: "action", action: binding.action, source: "key" });
      }
    }
    return dispatch();
  };

  /** Apply what waited in the mailbox: the newest view, caller selections, due timers. */
  const drainMailbox = (): LoopCommand | void => {
    if (pendingView !== undefined) {
      const view = pendingView;
      pendingView = undefined;
      const step = updateModelState(model, view, clock.now());
      model = step.model;
      queue.push(...step.effects);
    }
    for (const input of pendingInputs.splice(0)) {
      const step = transitionModelState(model, input, clock.now());
      model = step.model;
      queue.push(...step.effects);
    }
    for (const [id, steps] of reports) {
      queue.push({ kind: "report", id, steps });
    }
    reports.clear();
    for (const entry of settled.splice(0)) {
      queue.push({ kind: "settled", ...entry });
    }
    const command = dispatch();
    return command ?? apply({ kind: "time" });
  };
  const schedule = (): void => {
    const now = clock.now();
    const deadline = modelStateDeadline(model, now);
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
        async (): Promise<LoopCommand> => {
          const screen = new TerminalScreenPainter(
            io,
            () => clock.now(),
            paintOptions,
          );
          painter = screen;
          let paintedSize: TerminalSize | undefined;
          let rendered: RenderedFrame<A> | undefined;
          const paint = (): void => {
            if (signalRestored) throw new InteractionCancelled("Cancelled.");
            if (fault !== undefined) throw fault.error;
            for (let attempt = 0; attempt < 8; attempt += 1) {
              const facts = terminalFacts(io);
              const startedAt = performance.now();
              const frame = renderModelState(
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
                layer: frame.composition,
                ...(frame.windowTitle === undefined
                  ? {}
                  : { title: frame.windowTitle }),
                ...(facts.capabilities.applicationStateReports === true
                  ? { report: frame.report }
                  : {}),
                mouse: model.view.input?.mouse === true &&
                  facts.capabilities.mouseTracking !== false,
              });
              if (painted.status === "resized") continue;
              rendered = frame;
              paintedSize = facts.size;
              ticker.sync(frame.animated, frame.clock);
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
          // A resize may have damaged the screen even when the size it ends
          // at is the one painted, so the next paint is a keyframe.
          unlistenResize = io.listenResize?.(() => {
            screen.invalidate();
            updates.notify();
          }) ?? (() => {});
          try {
            if (started) {
              // Back from a foreground operation: what arrived meanwhile —
              // the newest view and reports — applies before the first paint.
              const waiting = drainMailbox();
              if (waiting !== undefined) return waiting;
            }
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
              if (pendingEvents.length === 0) {
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
                pendingEvents.push(
                  ...received.events.filter((event) =>
                    event.kind === "key" || event.kind === "mouse"
                  ),
                );
              }
              // Geometry is rechecked before input even on hosts without resize signals.
              const size = io.size();
              if (
                paintedSize?.rows !== size.rows ||
                paintedSize.columns !== size.columns
              ) paint();
              const event = pendingEvents.shift();
              if (event === undefined) continue;
              const waiting = drainMailbox();
              if (waiting !== undefined) return waiting;
              if (event.kind === "mouse") mouseObserved = true;
              const command = rendered?.layout === "too-small"
                ? suspendedKey(event)
                : event.kind === "key"
                ? apply({ kind: "key", key: event.key })
                : event.kind === "mouse"
                ? apply({ kind: "mouse", event })
                : undefined;
              if (command !== undefined) return command;
              if (pendingEvents.length === 0) paint();
            }
          } finally {
            ticker.stop();
            stopTimer();
            stopResize();
            const reporting = screen.release();
            painter = undefined;
            // Clicks read before the handoff resolve against a frame that is
            // gone; keys typed ahead still apply when the screen returns.
            const typed = pendingEvents.filter((event) => event.kind === "key");
            pendingEvents.splice(0, pendingEvents.length, ...typed);
            // Reports the terminal queued before tracking stopped must not
            // reach a child, whether or not one was already read.
            if (reporting || mouseObserved) {
              mouseObserved = false;
              await drainTerminalMouseInput(io);
            }
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
    // Ending the session ends its background work: every signal aborts,
    // and the session settles only once each command has.
    const remaining = [...running.values()];
    for (const command of remaining) command.controller.abort();
    await Promise.allSettled(remaining.map((command) => command.done));
    try {
      disposeSubscription();
    } catch (error) {
      failure ??= { error };
    }
  }
  if (failure !== undefined) throw failure.error;
  return snapshotModelState(model);
}
