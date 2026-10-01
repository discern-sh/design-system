/**
 * The effects around the pure application model: one alternate screen,
 * input decoded one event at a time, caller callbacks in a fixed order,
 * updates through a coalescing mailbox, timers on the injected clock,
 * painting, foreground handoff, nested applications, and restoration.
 *
 * @module
 */

import {
  systemTerminalClock,
  TerminalAnimationTicker,
  type TerminalClock,
} from "../clock.ts";
import { InteractionCancelled } from "../errors.ts";
import { DenoTerminalIO, type TerminalIO, type TerminalSize } from "../io.ts";
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
import type {
  TerminalApplicationActionSource,
  TerminalApplicationDismissal,
  TerminalApplicationDismissTarget,
  TerminalApplicationLayout,
  TerminalApplicationLink,
  TerminalApplicationLinkSource,
  TerminalApplicationReadingTarget,
  TerminalApplicationSelectionMove,
  TerminalApplicationState,
} from "./model.ts";
import type { TerminalApplicationViewIssue } from "./validate.ts";
import type { ApplicationActivity } from "./layer-view.ts";
import {
  type ApplicationEpilogueLine,
  releasedLines,
} from "./released-lines.ts";
import {
  ApplicationSession,
  type LoopCommand,
  nestedStart,
  type RunningSession,
  type SessionFrame,
  type SessionHost,
  type TerminalApplicationNested,
} from "./session.ts";
import type {
  ApplicationKeyBinding,
  ApplicationRun,
  TerminalApplicationView,
} from "./view.ts";

export {
  nestTerminalApplication,
  type TerminalApplicationNested,
  TerminalNestedApplication,
} from "./session.ts";

/**
 * What an action asks the runtime to do next. `foreground` hands the
 * terminal to a caller operation and resumes afterwards; `background`
 * starts an operation that runs while the screen stays live; `exit` ends
 * the session; `nested`, made by `nestTerminalApplication`, runs another
 * application on this screen until it exits. Any other value is a caller
 * error.
 */
export type TerminalApplicationCommand =
  | {
    readonly kind: "foreground";
    /**
     * A line printed after the screen is released, before the operation
     * runs; it wraps to the terminal as an epilogue line does.
     */
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
    /**
     * Lines printed after the screen is released. A line wider than the
     * terminal wraps at word boundaries, its continuations hanging two
     * cells under its own indentation; a `code` run never breaks. A nested
     * application returns to the one that opened it and prints none.
     */
    readonly epilogue?: readonly ApplicationEpilogueLine[];
  }
  | TerminalApplicationNested;

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
   * Scroll a reading body to a position its `readingScroll` reported or to
   * a heading of its Markdown, or focus one of its links and bring it on
   * screen. Applies like `select`; a heading the document lacks leaves the
   * position as it was.
   */
  reveal(readingId: string, target: TerminalApplicationReadingTarget): void;
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
   * background, nest another application, or leave.
   */
  readonly onAction?: (
    action: A,
    context: TerminalApplicationContext<A>,
    source: TerminalApplicationActionSource,
  ) => TerminalApplicationCommand | void;
  /**
   * A reader followed a link in a Markdown reading body with Enter or a
   * click, other than a link to a heading of the same document, which the
   * package scrolls to itself. Return a command as `onAction` does.
   */
  readonly onLink?: (
    link: TerminalApplicationLink,
    context: TerminalApplicationContext<A>,
    source: TerminalApplicationLinkSource,
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
   * view must omit it. A layer the package `refused` was left out of the
   * view because it breaks a rule; a corrected version opens as new.
   */
  readonly onDismiss?: (
    target: TerminalApplicationDismissTarget,
    via: TerminalApplicationDismissal,
    context: TerminalApplicationContext<A>,
  ) => void;
  /**
   * Layers of a view broke the view rules and were refused instead of the
   * session: the view was adopted without them, and each is also reported
   * to `onDismiss` as `refused`. Supplying this callback is what turns
   * refusal on, so an application that builds layers from observed data
   * keeps its session — and the background commands running beside it —
   * when one record makes a layer that breaks a rule. Without it, a broken
   * layer fails the session like any other broken rule; a rule broken
   * outside the layers always does.
   */
  readonly onViewRejected?: (
    issues: readonly TerminalApplicationViewIssue[],
    context: TerminalApplicationContext<A>,
  ) => void;
  /**
   * A background command reported progress. Reports arriving together are
   * coalesced to the newest per command, and while a foreground operation
   * or a nested application owns the terminal they wait, so the screen
   * repaints once with the latest when it returns.
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

/** A command that ends the screen's bracket: a handoff or the last exit. */
type ReleaseCommand = Extract<LoopCommand, { kind: "foreground" | "exit" }>;

/** Print lines on the released screen, wrapped to the terminal. */
function printReleased(
  io: TerminalIO,
  lines: readonly ApplicationEpilogueLine[],
): void {
  const { unicode } = io.capabilities();
  const { columns } = io.size();
  for (const line of lines) {
    for (const row of releasedLines(line, columns, unicode)) {
      io.write(`${row}\n`);
    }
  }
}

/**
 * Own an alternate-screen application until an action exits. Input is
 * decoded one event at a time: the package applies its own transition,
 * then calls `onField`, `onSelectionMoved`, `onSelectionChange`,
 * `onDismiss`, and `onAction` in that order; an update made inside them
 * applies before the next input, so a key typed after one that opens a
 * layer lands on that layer. A `nested` command runs another application on
 * the same screen and resumes this one when it exits. Escape never exits by
 * itself. Ctrl+C, EOF, and abort throw `InteractionCancelled` after
 * restoration unless a binding claims Ctrl+C. Resolves with the final
 * state.
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
  const updates = new ResizeMailbox();
  let ended = false;
  let fault: { error: unknown } | undefined;
  const host: SessionHost = {
    clock,
    notify: updates.notify,
    fail: (error) => {
      if (!ended) {
        fault = { error };
        updates.notify();
      }
    },
    ended: () => ended,
  };
  const root = new ApplicationSession(options, host, false);
  /** The applications on this screen, the one in front last. */
  const stack: RunningSession[] = [root];
  /** What each nested application's opener runs when it closes. */
  const onExits = new Map<
    RunningSession,
    ((state: TerminalApplicationState) => void) | undefined
  >();
  /** Background work of nested applications that already closed. */
  const closing: Promise<void>[] = [];
  const front = (): RunningSession => stack[stack.length - 1] ?? root;
  const ticker = new TerminalAnimationTicker(clock, updates.notify);
  const abort = new AbortMailbox(runtime.abortSignal);
  // The lone-Escape window runs on the application's clock like every other
  // timed transition, so a manual clock delivers Escape when advanced.
  const reader = new TerminalInputReader(io, { clock });
  let failure: { error: unknown } | undefined;
  let signalRestored = false;
  let timer: { readonly at: number; readonly cancel: () => void } | undefined;
  /** Input read but not yet applied; it survives a foreground handoff. */
  const pendingEvents: TerminalInputEvent[] = [];
  let mouseObserved = false;
  let painter: TerminalScreenPainter | undefined;

  const stopTimer = (): void => {
    timer?.cancel();
    timer = undefined;
  };
  const disposeAll = (): void => {
    const errors: unknown[] = [];
    for (const session of [...stack].reverse()) {
      try {
        session.dispose();
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) throw errors[0];
  };
  /** Clicks aimed at a screen that has gone are dropped; keys typed ahead stay. */
  const dropClicks = (): void => {
    const typed = pendingEvents.filter((event) => event.kind === "key");
    pendingEvents.splice(0, pendingEvents.length, ...typed);
  };
  const schedule = (): void => {
    const now = clock.now();
    const deadline = front().deadline(now);
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
        async (): Promise<ReleaseCommand> => {
          const screen = new TerminalScreenPainter(
            io,
            () => clock.now(),
            paintOptions,
          );
          painter = screen;
          let paintedSize: TerminalSize | undefined;
          let rendered: SessionFrame | undefined;
          /** The model the last render fitted, so input never meets an unfitted one. */
          let fitted: object | undefined;
          const motion = () => ({
            phase: ticker.phase,
            now: clock.now(),
            ...(runtime.reducedMotion === true ? { reducedMotion: true } : {}),
          });
          const paint = (): void => {
            if (signalRestored) throw new InteractionCancelled("Cancelled.");
            if (fault !== undefined) throw fault.error;
            const session = front();
            for (let attempt = 0; attempt < 8; attempt += 1) {
              const facts = terminalFacts(io);
              const startedAt = performance.now();
              const frame = session.render(
                facts.size,
                facts.capabilities,
                runtime,
                motion(),
              );
              fitted = session.revision;
              const painted = screen.paint({
                frame: frame.frame,
                size: facts.size,
                // Each application on the stack is its own composition, so
                // opening or closing one paints a keyframe.
                layer: `${stack.length}:${frame.composition}`,
                ...(frame.windowTitle === undefined
                  ? {}
                  : { title: frame.windowTitle }),
                ...(facts.capabilities.applicationStateReports === true
                  ? { report: frame.report }
                  : {}),
                mouse: session.mouse() &&
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
          /**
           * Lay the front model out for the screen without painting, when
           * it changed since the last frame. Keys read together paint once,
           * but each still meets the model its predecessor left fitted —
           * scroll, density, and where links sit — as it would had it
           * arrived alone.
           */
          const fit = (): void => {
            const session = front();
            if (session.revision === fitted) return;
            const facts = terminalFacts(io);
            session.render(facts.size, facts.capabilities, runtime, motion());
            fitted = session.revision;
          };
          /** Start a session: its first frame, then `start` and what it owes. */
          const begin = (session: RunningSession): LoopCommand | void => {
            paint();
            const before = session.revision;
            const first = session.begin();
            if (first === undefined && session.revision !== before) paint();
            return first;
          };
          /**
           * Follow commands that keep the screen — opening a nested
           * application, and returning from one — until none is left or one
           * releases the screen.
           */
          const follow = (
            first: LoopCommand | void,
          ): ReleaseCommand | undefined => {
            let command = first;
            while (command !== undefined) {
              if (command.kind === "nested") {
                const start = nestedStart(command.application);
                const session = start.open(host);
                onExits.set(session, start.onExit);
                stack.push(session);
                dropClicks();
                command = begin(session);
                continue;
              }
              if (command.kind === "foreground") return command;
              const closed = front();
              if (!closed.nested) {
                if (command.kind === "exit") return command;
                throw new InteractionCancelled("Cancelled.");
              }
              stack.pop();
              dropClicks();
              closing.push(closed.end());
              try {
                closed.dispose();
              } catch (error) {
                host.fail(error);
              }
              const onExit = onExits.get(closed);
              onExits.delete(closed);
              const state = closed.snapshot();
              const resumed = front();
              const returned = resumed.resume(
                onExit === undefined ? undefined : () => onExit(state),
              );
              command = command.kind === "interrupt"
                ? returned ?? resumed.interrupt()
                : returned;
              if (command === undefined) paint();
            }
            return undefined;
          };
          // A resize may have damaged the screen even when the size it ends
          // at is the one painted, so the next paint is a keyframe.
          unlistenResize = io.listenResize?.(() => {
            screen.invalidate();
            updates.notify();
          }) ?? (() => {});
          try {
            if (front().started) {
              // Back from a foreground operation: what arrived meanwhile —
              // the newest view and reports — applies before the first paint.
              const waiting = follow(front().drain());
              if (waiting !== undefined) return waiting;
              paint();
            } else {
              const first = follow(begin(front()));
              if (first !== undefined) return first;
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
                  const command = follow(front().drain());
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
              const waiting = follow(front().drain());
              if (waiting !== undefined) return waiting;
              if (event.kind === "mouse") mouseObserved = true;
              fit();
              const session = front();
              const command = follow(
                rendered?.layout === "too-small"
                  ? session.suspendedKey(event)
                  : event.kind === "key"
                  ? session.apply({ kind: "key", key: event.key })
                  : event.kind === "mouse"
                  ? session.apply({ kind: "mouse", event })
                  : undefined,
              );
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
            dropClicks();
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
              disposeAll();
            }
          },
        },
      );
      if (command.kind === "exit") {
        ended = true;
        printReleased(io, command.epilogue ?? []);
        break;
      }
      if (command.handoff !== undefined) printReleased(io, [command.handoff]);
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
    await Promise.allSettled([
      ...closing,
      ...stack.map((session) => session.end()),
    ]);
    try {
      disposeAll();
    } catch (error) {
      failure ??= { error };
    }
  }
  if (failure !== undefined) throw failure.error;
  return root.snapshot();
}
