/**
 * One application's side of a running screen: its model, its callbacks in
 * their fixed order, its mailbox, and its background commands. The runtime
 * owns the terminal and runs one session on it, or a stack of them when an
 * application opens another in its place.
 *
 * @module
 */

import type { TerminalClock } from "../clock.ts";
import type { CliPresentationOptions } from "../../contracts.ts";
import type { TerminalCapabilities } from "../../capabilities.ts";
import { InteractionCancelled } from "../errors.ts";
import type { TerminalSize } from "../io.ts";
import type { TerminalInputEvent } from "../keys.ts";
import { renderModelState } from "./frame.ts";
import { keyChordOf } from "./keymap.ts";
import {
  assertDismissalsHonoured,
  bindingInForce,
  createModelState,
  interruptEffect,
  type ModelState,
  modelStateDeadline,
  snapshotModelState,
  type TerminalApplicationEffect,
  type TerminalApplicationInput,
  type TerminalApplicationLayout,
  type TerminalApplicationState,
  transitionModelState,
  updateModelState,
  updateModelStateProvisionally,
} from "./model.ts";
import type { TerminalApplicationMotion } from "./paint.ts";
import type { ApplicationActivity } from "./layer-view.ts";
import type { TerminalApplicationStateReport } from "../state-report.ts";
import type {
  TerminalApplicationCommand,
  TerminalApplicationCommandOutcome,
  TerminalApplicationContext,
  TerminalApplicationOptions,
} from "./runtime.ts";

/** Callbacks one input may cause before its views are judged unstable. */
const MAXIMUM_CALLBACKS = 512;

/** Every command kind, checked against the union so the two never drift. */
export const COMMAND_KINDS: ReadonlySet<string> = new Set(
  Object.keys(
    {
      foreground: true,
      background: true,
      exit: true,
      nested: true,
    } satisfies Record<TerminalApplicationCommand["kind"], true>,
  ),
);

/** Check what an action returned: a known command, or nothing. */
export function assertCommand(
  command: unknown,
): TerminalApplicationCommand | void {
  if (command === undefined) return undefined;
  if (
    typeof command !== "object" || command === null ||
    !COMMAND_KINDS.has(String((command as { kind?: unknown }).kind))
  ) {
    const kinds = [...COMMAND_KINDS];
    const last = kinds.pop() ?? "";
    throw new TypeError(
      `application actions return a ${
        kinds.join(", ")
      }, or ${last} command, or nothing`,
    );
  }
  const typed = command as TerminalApplicationCommand;
  if (
    (typed.kind === "foreground" || typed.kind === "background") &&
    typeof typed.run !== "function"
  ) {
    throw new TypeError(`a ${typed.kind} command runs an operation`);
  }
  if (
    typed.kind === "background" &&
    (typeof typed.id !== "string" || typed.id.trim() === "")
  ) {
    throw new TypeError("a background command names itself with an id");
  }
  if (
    typed.kind === "nested" &&
    !(typed.application instanceof TerminalNestedApplication)
  ) {
    throw new TypeError(
      "a nested command carries an application made by nestTerminalApplication",
    );
  }
  return typed;
}

/** What a session needs from the runtime that owns the screen. */
export interface SessionHost {
  readonly clock: TerminalClock;
  /** Wake the runtime's loop. */
  readonly notify: () => void;
  /** End the whole screen with this error after restoration. */
  readonly fail: (error: unknown) => void;
  /** Whether the screen has ended. */
  readonly ended: () => boolean;
}

/**
 * What a session asks the loop to do next. `interrupt` is a nested
 * application's unbound Ctrl+C: it closes the nested application and
 * reaches the one beneath as Ctrl+C.
 */
export type LoopCommand =
  | Exclude<TerminalApplicationCommand, { kind: "background" }>
  | { readonly kind: "interrupt" };

/** One rendered frame, as the loop paints it. */
export interface SessionFrame {
  readonly frame: string;
  readonly layout: TerminalApplicationLayout;
  readonly composition: string;
  readonly renderCalls: number;
  readonly animated: boolean;
  readonly clock: boolean;
  readonly windowTitle?: string;
  readonly report: TerminalApplicationStateReport;
}

/** A session with its action type hidden, as the loop's stack holds it. */
export interface RunningSession {
  /** Whether another application opened this one. */
  readonly nested: boolean;
  readonly started: boolean;
  /** The model's identity, which changes whenever the model does. */
  readonly revision: object;
  /** Run `start` after the first frame, then the callbacks it owes. */
  begin(): LoopCommand | void;
  /** Apply one input, then the callbacks it owes. */
  apply(input: TerminalApplicationInput): LoopCommand | void;
  /** One key below the minimum size: only bindings and Ctrl+C run. */
  suspendedKey(event: TerminalInputEvent): LoopCommand | void;
  /** Deliver Ctrl+C as the scope in force means it. */
  interrupt(): LoopCommand | void;
  /** Apply what waited in the mailbox, then due timers. */
  drain(): LoopCommand | void;
  /** Return from a nested application: catch up, then run `then`. */
  resume(then: (() => void) | undefined): LoopCommand | void;
  render(
    size: TerminalSize,
    capabilities: TerminalCapabilities,
    presentation: CliPresentationOptions,
    motion: TerminalApplicationMotion,
  ): SessionFrame;
  deadline(now: number): number | undefined;
  /** Whether the view in force asks for mouse input. */
  mouse(): boolean;
  snapshot(): TerminalApplicationState;
  /** Abort background work and stop reaching the caller; settles with the work. */
  end(): Promise<void>;
  /** Run the caller's subscription cleanup once. */
  dispose(): void;
}

/** A callback the runtime owes: a step's effect, news from a background command, or a return. */
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
  }
  | { readonly kind: "call"; readonly run: () => void };

/** A background command that has not settled. */
interface RunningCommand {
  readonly controller: AbortController;
  readonly done: Promise<void>;
}

/** One application's model, callbacks, mailbox, and background work. */
export class ApplicationSession<A> implements RunningSession {
  readonly nested: boolean;
  readonly context: TerminalApplicationContext<A>;
  #model: ModelState<A>;
  readonly #options: TerminalApplicationOptions<A>;
  readonly #host: SessionHost;
  readonly #queue: RuntimeCallback<A>[] = [];
  /** Background commands by id, until they settle. */
  readonly #running = new Map<string, RunningCommand>();
  /** The newest report per command, waiting for the loop. */
  readonly #reports = new Map<string, ApplicationActivity>();
  /** Commands that settled, waiting for the loop, in order. */
  readonly #settled: {
    readonly id: string;
    readonly outcome: TerminalApplicationCommandOutcome;
  }[] = [];
  readonly #pendingInputs: TerminalApplicationInput[] = [];
  #pendingView: TerminalApplicationOptions<A>["view"] | undefined;
  #ended = false;
  #dispatching = false;
  /** Whether a callback replaced the view during the current dispatch. */
  #viewReplaced = false;
  #started = false;
  #cleanup: (() => void) | undefined;

  /** A view or keymap that breaks a rule throws here, before anything shows. */
  constructor(
    options: TerminalApplicationOptions<A>,
    host: SessionHost,
    nested: boolean,
  ) {
    this.#options = options;
    this.#host = host;
    this.nested = nested;
    const created = createModelState(options.view, {
      ...(options.keymap === undefined ? {} : { keymap: options.keymap }),
      ...(options.viKeys === undefined ? {} : { viKeys: options.viKeys }),
    }, host.clock.now());
    this.#model = created.model;
    this.#queue.push(...created.effects);
    this.context = this.#createContext();
  }

  get started(): boolean {
    return this.#started;
  }

  get revision(): object {
    return this.#model;
  }

  #live(): boolean {
    return !this.#ended && !this.#host.ended();
  }

  #createContext(): TerminalApplicationContext<A> {
    // Inside a callback a change applies at once, so the next key already
    // sees it; from elsewhere it waits in the mailbox for the loop.
    const input = (value: TerminalApplicationInput): void => {
      if (!this.#live()) return;
      if (this.#dispatching) {
        this.#step(value);
        return;
      }
      this.#pendingInputs.push(value);
      this.#host.notify();
    };
    const snapshot = (): TerminalApplicationState => this.snapshot();
    return {
      // A getter keeps the snapshot current on every read.
      get state(): TerminalApplicationState {
        return snapshot();
      },
      update: (view) => {
        if (!this.#live()) return;
        if (this.#dispatching) {
          // Later callbacks of this input may report further dismissals, so
          // the view is judged against them once the queue drains.
          const step = updateModelStateProvisionally(
            this.#model,
            view,
            this.#host.clock.now(),
          );
          this.#model = step.model;
          this.#queue.push(...step.effects);
          this.#viewReplaced = true;
          return;
        }
        this.#pendingView = view;
        this.#host.notify();
      },
      select: (listId, itemId, selection = {}) =>
        input({
          kind: "select",
          listId,
          itemId,
          ...(selection.reveal === true ? { reveal: true } : {}),
        }),
      setField: (layerId, fieldId, value) =>
        input({ kind: "field", layerId, fieldId, value }),
      reveal: (readingId, target) =>
        input({ kind: "reveal", readingId, target }),
      abort: (commandId) => {
        this.#running.get(commandId)?.controller.abort();
      },
      fail: (error) => this.#host.fail(error),
      now: () => this.#host.clock.now(),
    };
  }

  #step(input: TerminalApplicationInput): void {
    const step = transitionModelState(
      this.#model,
      input,
      this.#host.clock.now(),
    );
    this.#model = step.model;
    this.#queue.push(...step.effects);
  }

  /**
   * Start a background command. Its reports and its end wait for the loop,
   * which delivers them between inputs; nothing reaches the caller once the
   * session has ended.
   */
  #startBackground(
    command: Extract<TerminalApplicationCommand, { kind: "background" }>,
  ): void {
    if (this.#running.has(command.id)) {
      throw new TypeError(
        `background command ${JSON.stringify(command.id)} is already running`,
      );
    }
    const controller = new AbortController();
    const report = (steps: ApplicationActivity): void => {
      if (!this.#live() || !this.#running.has(command.id)) return;
      this.#reports.set(command.id, steps);
      this.#host.notify();
    };
    const finish = (outcome: TerminalApplicationCommandOutcome): void => {
      this.#running.delete(command.id);
      if (!this.#live()) return;
      this.#settled.push({ id: command.id, outcome });
      this.#host.notify();
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
    this.#running.set(command.id, { controller, done });
  }

  /** Keep the first command an action returns; start background work at once. */
  #take(
    returned: TerminalApplicationCommand | void,
    current: LoopCommand | undefined,
  ): LoopCommand | undefined {
    if (returned === undefined) return current;
    if (returned.kind === "background") {
      this.#startBackground(returned);
      return current;
    }
    if (
      returned.kind === "exit" && this.nested &&
      (returned.epilogue?.length ?? 0) > 0
    ) {
      throw new TypeError(
        "a nested application returns to the one that opened it, so its exit prints no epilogue",
      );
    }
    return current ?? returned;
  }

  /** Run queued callbacks in order; the first command an action returns wins. */
  #dispatch(): LoopCommand | void {
    let command: LoopCommand | undefined;
    const options = this.#options;
    const context = this.context;
    this.#dispatching = true;
    this.#viewReplaced = false;
    try {
      for (let calls = 0; this.#queue.length > 0; calls += 1) {
        if (calls >= MAXIMUM_CALLBACKS) {
          throw new TypeError("application callbacks did not settle");
        }
        const effect = this.#queue.shift();
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
          case "action":
            command = this.#take(
              assertCommand(
                options.onAction?.(effect.action, context, effect.source),
              ),
              command,
            );
            break;
          case "link":
            command = this.#take(
              assertCommand(
                options.onLink?.(effect.link, context, effect.source),
              ),
              command,
            );
            break;
          case "report":
            options.onReport?.(effect.id, effect.steps, context);
            break;
          case "settled":
            options.onCommandSettled?.(effect.id, effect.outcome, context);
            break;
          case "call":
            effect.run();
            break;
          case "cancel":
            // Ctrl+C unwinds to the application that opened this one.
            if (this.nested) {
              command ??= { kind: "interrupt" };
              break;
            }
            throw new InteractionCancelled("Cancelled.");
        }
      }
      // The view a caller leaves in force after hearing of a dismissal must omit it.
      if (this.#viewReplaced) assertDismissalsHonoured(this.#model);
    } finally {
      this.#dispatching = false;
    }
    return command;
  }

  begin(): LoopCommand | void {
    this.#started = true;
    const cleanup = this.#options.start?.(this.context);
    if (cleanup !== undefined && typeof cleanup !== "function") {
      throw new TypeError(
        "application start must return synchronous subscription cleanup",
      );
    }
    if (cleanup !== undefined) this.#cleanup = cleanup;
    return this.#dispatch() ?? this.drain();
  }

  apply(input: TerminalApplicationInput): LoopCommand | void {
    this.#step(input);
    return this.#dispatch();
  }

  /**
   * Below the minimum size navigation waits; the bindings in force still
   * run as they would at full size — the top layer's while one is open,
   * only field bindings while a field owns input — and Ctrl+C keeps its
   * one meaning.
   */
  suspendedKey(event: TerminalInputEvent): LoopCommand | void {
    if (event.kind !== "key") return undefined;
    const chord = keyChordOf(event.key);
    if (chord === "ctrl-c") this.#queue.push(interruptEffect(this.#model));
    else {
      const binding = chord === undefined
        ? undefined
        : bindingInForce(this.#model, chord);
      if (binding !== undefined) {
        this.#queue.push({
          kind: "action",
          action: binding.action,
          source: "key",
        });
      }
    }
    return this.#dispatch();
  }

  interrupt(): LoopCommand | void {
    this.#queue.push(interruptEffect(this.#model));
    return this.#dispatch();
  }

  /** Apply what waited in the mailbox: the newest view, caller selections, reports, due timers. */
  drain(): LoopCommand | void {
    const now = this.#host.clock.now();
    if (this.#pendingView !== undefined) {
      const view = this.#pendingView;
      this.#pendingView = undefined;
      const step = updateModelState(this.#model, view, now);
      this.#model = step.model;
      this.#queue.push(...step.effects);
    }
    for (const input of this.#pendingInputs.splice(0)) this.#step(input);
    for (const [id, steps] of this.#reports) {
      this.#queue.push({ kind: "report", id, steps });
    }
    this.#reports.clear();
    for (const entry of this.#settled.splice(0)) {
      this.#queue.push({ kind: "settled", ...entry });
    }
    return this.#dispatch() ?? this.apply({ kind: "time" });
  }

  resume(then: (() => void) | undefined): LoopCommand | void {
    const waiting = this.drain();
    if (then !== undefined) this.#queue.push({ kind: "call", run: then });
    return waiting ?? this.#dispatch();
  }

  render(
    size: TerminalSize,
    capabilities: TerminalCapabilities,
    presentation: CliPresentationOptions,
    motion: TerminalApplicationMotion,
  ): SessionFrame {
    const frame = renderModelState(
      this.#model,
      size,
      capabilities,
      presentation,
      motion,
    );
    this.#model = frame.model;
    return frame;
  }

  deadline(now: number): number | undefined {
    return modelStateDeadline(this.#model, now);
  }

  mouse(): boolean {
    return this.#model.view.input?.mouse === true;
  }

  snapshot(): TerminalApplicationState {
    return snapshotModelState(this.#model);
  }

  end(): Promise<void> {
    this.#ended = true;
    const remaining = [...this.#running.values()];
    for (const command of remaining) command.controller.abort();
    return Promise.allSettled(remaining.map((command) => command.done)).then(
      () => undefined,
    );
  }

  dispose(): void {
    const cleanup = this.#cleanup;
    this.#cleanup = undefined;
    cleanup?.();
  }
}

/** How a nested application starts on the runtime's screen. */
interface NestedStart {
  readonly open: (host: SessionHost) => RunningSession;
  readonly onExit?: (state: TerminalApplicationState) => void;
}

let openNested: (nested: TerminalNestedApplication) => NestedStart;
let sealNested: (start: NestedStart) => TerminalApplicationNested;

/** The `nested` command, as {@linkcode nestTerminalApplication} makes it. */
export interface TerminalApplicationNested {
  readonly kind: "nested";
  readonly application: TerminalNestedApplication;
}

/**
 * An application prepared to run in place of the one that opened it, on
 * the same screen. It is opaque; make one with `nestTerminalApplication`.
 */
export class TerminalNestedApplication {
  readonly #start: NestedStart;
  private constructor(start: NestedStart) {
    this.#start = start;
  }
  static {
    openNested = (nested) => nested.#start;
    sealNested = (start) =>
      Object.freeze({
        kind: "nested" as const,
        application: new TerminalNestedApplication(start),
      });
  }
}

/** How a nested command opens. Package-internal. */
export function nestedStart(nested: TerminalNestedApplication): NestedStart {
  return openNested(nested);
}

/**
 * A command that runs another application on this screen until it exits,
 * then resumes this one exactly where it was. The view and keymap are
 * checked now, so a broken one fails the action that returned it. While it
 * runs, this application's reports and mailbox wait; `onExit` then runs
 * with the nested application's final state, as one of this application's
 * callbacks, so a view it supplies applies before the first frame back.
 * The nested application's unbound Ctrl+C closes it and reaches this
 * application as Ctrl+C.
 */
export function nestTerminalApplication<B>(
  options: TerminalApplicationOptions<B>,
  onExit?: (state: TerminalApplicationState) => void,
): TerminalApplicationNested {
  createModelState(options.view, {
    ...(options.keymap === undefined ? {} : { keymap: options.keymap }),
    ...(options.viKeys === undefined ? {} : { viKeys: options.viKeys }),
  });
  return sealNested({
    open: (host) => new ApplicationSession(options, host, true),
    ...(onExit === undefined ? {} : { onExit }),
  });
}
