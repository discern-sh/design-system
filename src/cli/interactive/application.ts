/** Persistent application effects over the package's bounded region model. @module */
import {
  renderTerminalApplication,
  type TerminalApplicationAction,
  type TerminalApplicationFrame,
  type TerminalApplicationState,
  type TerminalApplicationView,
  transitionTerminalApplication,
  updateTerminalApplication,
} from "./application-model.ts";
import { DenoTerminalIO, type TerminalSize } from "./io.ts";
import { isNamedKey, TerminalInputReader, type TerminalKey } from "./keys.ts";
import { assertInteractiveTerminal, withRawTerminal } from "./lifecycle.ts";
import {
  AbortMailbox,
  ResizeMailbox,
  terminalFacts,
} from "./owned-viewport.ts";
import { CompleteFramePainter } from "./painter.ts";
import { InteractionCancelled } from "./errors.ts";
import { signalPassthrough } from "./signals.ts";
import type { InteractionRuntime } from "./types.ts";

/** A caller-owned navigation decision or foreground operation, returned synchronously from input handlers. */
export type TerminalApplicationCommand =
  | { readonly kind: "handled" }
  | { readonly kind: "exit" }
  | {
    readonly kind: "foreground";
    /** Runs after all application terminal modes restore and before ownership resumes. */
    readonly run: () => void | Promise<void>;
  };

/** Live update boundary. Slow providers publish here, independently of keyboard handling. */
export interface TerminalApplicationContext<Action> {
  /** Latest fitted navigation and reading position. */
  readonly state: TerminalApplicationState<Action>;
  /** Replace caller data; bursts coalesce before rendering without dropping input. */
  update(view: TerminalApplicationView<Action>): void;
  /** Surface a background failure through the same exception-safe cleanup path. */
  fail(error: unknown): void;
}

/** Contents and caller decisions for one persistent terminal session. */
export interface TerminalApplicationOptions<Action> {
  readonly view: TerminalApplicationView<Action>;
  /** Starts once after the first frame; returns cleanup for timers or subscriptions. Never await discovery here. */
  readonly start?: (
    context: TerminalApplicationContext<Action>,
  ) => void | (() => void);
  /** Synchronous consumer navigation; foreground effects must be returned as commands. */
  readonly onAction?: (
    action: TerminalApplicationAction<Action>,
    context: TerminalApplicationContext<Action>,
  ) => TerminalApplicationCommand | void;
  /** Optional caller shortcuts, e.g. Escape to an overview. Omission uses package navigation. */
  readonly onKey?: (
    key: TerminalKey,
    context: TerminalApplicationContext<Action>,
  ) => { readonly kind: "handled" | "exit" } | void;
}

/** One observed frame, without content or product facts. */
export interface TerminalApplicationObservation {
  readonly size: TerminalSize;
  readonly layout: TerminalApplicationFrame<unknown>["layout"];
  readonly renderCalls: number;
  readonly renderDurationMs: number;
  readonly written: boolean;
  readonly frameBytes: number;
}

/** Optional cooperative cancellation and diagnostics for the owned session. */
export interface TerminalApplicationRuntime extends InteractionRuntime {
  readonly abortSignal?: AbortSignal;
  readonly observe?: (observation: TerminalApplicationObservation) => void;
}

/**
 * Own an alternate-screen session with bounded regions, live updates and foreground handoff.
 * No provider runs on navigation. Handlers run synchronously after a consumed read, so a
 * foreground child receives exclusive terminal ownership. Escape exits by default;
 * Ctrl+C, EOF and abort throw InteractionCancelled after terminal restoration.
 */
export async function runTerminalApplication<Action>(
  options: TerminalApplicationOptions<Action>,
  runtime: TerminalApplicationRuntime = {},
): Promise<TerminalApplicationState<Action>> {
  if (runtime.abortSignal?.aborted) {
    throw new InteractionCancelled("Cancelled.");
  }
  const io = runtime.io ?? new DenoTerminalIO();
  assertInteractiveTerminal(io);
  terminalFacts(io);
  let state = updateTerminalApplication(options.view);
  const updates = new ResizeMailbox();
  const abort = new AbortMailbox(runtime.abortSignal);
  const reader = new TerminalInputReader(io);
  let ended = false;
  let pendingView: TerminalApplicationView<Action> | undefined;
  let fault: { error: unknown } | undefined;
  const subscription: { cleanup?: () => void } = {};
  let started = false;
  let failure: { error: unknown } | undefined;
  let signalRestored = false;
  const disposeSubscription = (): void => {
    const cleanup = subscription.cleanup;
    delete subscription.cleanup;
    cleanup?.();
  };
  const context: TerminalApplicationContext<Action> = {
    get state() {
      return state;
    },
    update(view) {
      if (ended) return;
      pendingView = view;
      updates.notify();
    },
    fail(error) {
      if (!ended) {
        fault = { error };
        updates.notify();
      }
    },
  };
  const applyUpdate = (): void => {
    if (pendingView === undefined) return;
    const view = pendingView;
    pendingView = undefined;
    state = updateTerminalApplication(view, state);
  };
  const pendingKeys: TerminalKey[] = [];
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
          const painter = new CompleteFramePainter(io);
          let previousFrame: string | undefined;
          let paintedSize: TerminalSize | undefined;
          let rendered: TerminalApplicationFrame<Action>;
          const paint = (): void => {
            if (signalRestored) throw new InteractionCancelled("Cancelled.");
            if (fault !== undefined) throw fault.error;
            applyUpdate();
            for (let attempt = 0; attempt < 8; attempt += 1) {
              const facts = terminalFacts(io);
              const startedAt = performance.now();
              rendered = renderTerminalApplication(
                state,
                facts.size,
                facts.capabilities,
                runtime,
              );
              state = rendered.state;
              const changed = rendered.frame !== previousFrame;
              if (
                changed && !painter.replace(rendered.frame, facts.size)
              ) continue;
              previousFrame = rendered.frame;
              paintedSize = facts.size;
              runtime.observe?.({
                size: facts.size,
                layout: rendered.layout,
                renderCalls: rendered.renderCalls,
                renderDurationMs: performance.now() - startedAt,
                written: changed,
                frameBytes: changed
                  ? new TextEncoder().encode(rendered.frame).length
                  : 0,
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
                  paint();
                  continue;
                }
                inputRead = undefined;
                if (received.events === null) {
                  throw new InteractionCancelled("Input ended.");
                }
                const keys = received.events.flatMap((event) =>
                  event.kind === "key" ? [event.key] : []
                );
                if (
                  keys.some((key) => isNamedKey(key, "ctrl-c"))
                ) throw new InteractionCancelled("Cancelled.");
                pendingKeys.push(...keys);
              }
              // Geometry is rechecked before input even on hosts without resize signals.
              const size = io.size();
              if (
                paintedSize?.rows !== size.rows ||
                paintedSize.columns !== size.columns
              ) paint();
              const key = pendingKeys.shift();
              if (key === undefined) continue;
              applyUpdate();
              if (
                rendered!.state.view !== state.view ||
                rendered!.state.focusedRegionId !== state.focusedRegionId
              ) paint();
              let command: TerminalApplicationCommand | void = options.onKey?.(
                key,
                context,
              );
              if (command?.kind === "foreground") {
                throw new TypeError(
                  "foreground operations must be activated from a choice with Enter",
                );
              }
              if (command === undefined && isNamedKey(key, "escape")) {
                command = { kind: "exit" };
              }
              if (command === undefined && rendered!.layout !== "too-small") {
                const next = transitionTerminalApplication(
                  state,
                  key,
                  rendered!.regionRows,
                );
                state = next.state;
                if (next.action !== undefined) {
                  command = options.onAction?.(next.action, context);
                }
              }
              if (
                command !== undefined &&
                !["handled", "exit", "foreground"].includes(command.kind)
              ) {
                throw new TypeError(
                  "application input handlers must return synchronous commands",
                );
              }
              if (
                command?.kind === "exit" || command?.kind === "foreground"
              ) {
                return command;
              }
              if (pendingKeys.length === 0) paint();
            }
          } finally {
            stopResize();
          }
        },
        {
          ...signalPassthrough(runtime),
          alternateScreen: true,
          onSignalRestore: () => {
            signalRestored = true;
            ended = true;
            updates.notify();
            try {
              stopResize();
            } finally {
              disposeSubscription();
            }
          },
        },
      );
      if (command.kind === "exit") break;
      if (command.kind === "foreground") await command.run();
    }
  } catch (error) {
    failure = { error };
  } finally {
    ended = true;
    abort.stop();
    try {
      disposeSubscription();
    } catch (error) {
      failure ??= { error };
    }
  }
  if (failure !== undefined) throw failure.error;
  return state;
}
