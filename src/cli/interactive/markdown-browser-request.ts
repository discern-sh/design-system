/** Effect adapter for the keyboard Markdown browser. */

import type { TerminalCapabilities } from "../capabilities.ts";
import { validateSemanticInlineDestination } from "../semantic-inline.ts";
import { InteractionCancelled } from "./errors.ts";
import { DenoTerminalIO, type TerminalIO, type TerminalSize } from "./io.ts";
import { type TerminalInputEvent, TerminalInputReader } from "./keys.ts";
import { assertInteractiveTerminal, withRawTerminal } from "./lifecycle.ts";
import {
  type MarkdownBrowserInputEvent,
  transitionMarkdownBrowser,
} from "./markdown-browser-machine.ts";
import {
  createMarkdownBrowserState,
  type MarkdownBrowserLinkRequest,
  type MarkdownBrowserLinkResolution,
  type MarkdownBrowserOptions,
  MarkdownBrowserRefusalError,
  type MarkdownBrowserResult,
  type MarkdownBrowserState,
} from "./markdown-browser-model.ts";
import {
  fitMarkdownBrowserState,
  renderMarkdownBrowser,
} from "./markdown-browser-renderer.ts";
import { CompleteFramePainter } from "./painter.ts";
import { signalPassthrough } from "./signals.ts";
import type { InteractionRuntime } from "./types.ts";

type BrowserRenderer = <Action>(
  state: MarkdownBrowserState<Action>,
  capabilities: TerminalCapabilities,
) => string;

interface BrowserInputReader {
  readEvent(): Promise<TerminalInputEvent | null>;
}

/** Runtime effects and optional cooperative cancellation for one browser. */
export interface MarkdownBrowserRuntime extends InteractionRuntime {
  /** Cancel an active read or resolver wait; terminal restoration runs first. */
  readonly abortSignal?: AbortSignal;
}

/** Internal renderer seam used to prove effect restoration after render faults. */
export interface MarkdownBrowserRequestServices {
  readonly render?: BrowserRenderer;
  /** Internal decoder seam used to prove restoration after reader faults. */
  readonly createInputReader?: (io: TerminalIO) => BrowserInputReader;
}

interface TerminalFacts {
  readonly capabilities: TerminalCapabilities;
  readonly size: TerminalSize;
}

type Settled<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: unknown };

function terminalFacts(io: TerminalIO): TerminalFacts {
  const size = io.size();
  const capabilities = io.capabilities();
  if (capabilities.ansiControl === false) {
    throw new MarkdownBrowserRefusalError(
      "ansi-control-unavailable",
      size,
    );
  }
  if (capabilities.columns !== size.columns) {
    throw new TypeError(
      `Terminal capabilities report ${capabilities.columns} columns for a ${size.columns}-column viewport.`,
    );
  }
  return { size, capabilities };
}

function sameGeometry(
  state: MarkdownBrowserState<unknown>,
  facts: TerminalFacts,
): boolean {
  return state.columns === facts.size.columns && state.rows === facts.size.rows;
}

class ResizeMailbox {
  #pending = false;
  #waiter: (() => void) | undefined;

  notify = (): void => {
    const waiter = this.#waiter;
    if (waiter === undefined) {
      this.#pending = true;
      return;
    }
    this.#waiter = undefined;
    waiter();
  };

  next(): Promise<void> {
    if (this.#pending) {
      this.#pending = false;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.#waiter = resolve;
    });
  }
}

class AbortMailbox {
  readonly event: Promise<{ readonly kind: "abort" }>;
  readonly #signal: AbortSignal | undefined;
  readonly #notify: (() => void) | undefined;

  constructor(signal: AbortSignal | undefined) {
    this.#signal = signal;
    if (signal === undefined) {
      this.#notify = undefined;
      this.event = new Promise(() => {});
      return;
    }
    let notify: () => void = () => {};
    this.event = new Promise((resolve) => {
      notify = () => resolve({ kind: "abort" });
    });
    this.#notify = notify;
    if (signal.aborted) notify();
    else signal.addEventListener("abort", notify, { once: true });
  }

  stop(): void {
    if (this.#signal !== undefined && this.#notify !== undefined) {
      this.#signal.removeEventListener("abort", this.#notify);
    }
  }
}

function defaultLinkResolution(
  request: MarkdownBrowserLinkRequest,
): MarkdownBrowserLinkResolution {
  const destination = validateSemanticInlineDestination(request.destination);
  if (destination.startsWith("#")) {
    return { kind: "fragment", fragment: destination };
  }
  if (/^(?:(?:https?|mailto|file):|\/\/)/iu.test(destination)) {
    return { kind: "external", destination };
  }
  return {
    kind: "unresolved",
    message: "This document destination needs a caller resolver.",
  };
}

async function resolveLink(
  options: MarkdownBrowserOptions<unknown>,
  request: MarkdownBrowserLinkRequest,
  abort: AbortMailbox,
): Promise<MarkdownBrowserLinkResolution> {
  const pending = options.resolveLink === undefined
    ? Promise.resolve(defaultLinkResolution(request))
    : Promise.resolve(options.resolveLink({
      sourceDocumentId: request.sourceDocumentId,
      sourcePath: request.sourcePath,
      destination: request.destination,
      availableDocuments: request.availableDocuments,
    }));
  const settled = await Promise.race([
    pending.then((resolution) => ({ kind: "resolution" as const, resolution })),
    abort.event,
  ]);
  if (settled.kind === "abort") {
    throw new InteractionCancelled("Cancelled.");
  }
  return settled.resolution;
}

function resizeEvent(facts: TerminalFacts): MarkdownBrowserInputEvent {
  return {
    kind: "resize",
    columns: facts.size.columns,
    rows: facts.size.rows,
  };
}

/**
 * Drive the package's real Markdown browser with injectable terminal effects.
 * The internal services parameter exists only for package fault testing;
 * consumers use {@linkcode requestMarkdownBrowser}.
 */
export async function runMarkdownBrowserRequest<Action>(
  options: MarkdownBrowserOptions<Action>,
  runtime: MarkdownBrowserRuntime = {},
  services: MarkdownBrowserRequestServices = {},
): Promise<MarkdownBrowserResult<Action>> {
  if (runtime.abortSignal?.aborted === true) {
    throw new InteractionCancelled("Cancelled.");
  }
  const io = runtime.io ?? new DenoTerminalIO();
  assertInteractiveTerminal(io);
  const render = services.render ?? renderMarkdownBrowser;

  // Refuse unsupported control and incoherent initial geometry before raw
  // mode, cursor visibility, or alternate-screen state changes.
  let facts = terminalFacts(io);
  let state = fitMarkdownBrowserState(
    createMarkdownBrowserState(options, facts.size, runtime),
    facts.capabilities,
  );
  let frame = render(state, facts.capabilities);

  const painter = new CompleteFramePainter(io);
  const reader = services.createInputReader?.(io) ??
    new TerminalInputReader(io);
  const resize = new ResizeMailbox();
  const abort = new AbortMailbox(runtime.abortSignal);
  let stopResizeListener: () => void = () => {};
  let resizeListening = false;
  const stopResize = (): void => {
    if (!resizeListening) return;
    resizeListening = false;
    stopResizeListener();
  };

  try {
    return await withRawTerminal(io, async () => {
      let outcome: Settled<MarkdownBrowserResult<Action>>;
      try {
        stopResizeListener = io.listenResize?.(resize.notify) ?? (() => {});
        resizeListening = true;
        painter.replace(frame);

        let inputRead = reader.readEvent().then((event) => ({
          kind: "input" as const,
          event,
        }));
        let resizeRead = resize.next().then(() => ({
          kind: "resize" as const,
        }));

        while (true) {
          const received = await Promise.race([
            inputRead,
            resizeRead,
            abort.event,
          ]);
          if (received.kind === "abort") {
            throw new InteractionCancelled("Cancelled.");
          }
          if (received.kind === "resize") {
            resizeRead = resize.next().then(() => ({
              kind: "resize" as const,
            }));
          }

          const currentFacts = terminalFacts(io);
          if (!sameGeometry(state, currentFacts)) {
            const resized = transitionMarkdownBrowser(
              state,
              resizeEvent(currentFacts),
              currentFacts.capabilities,
            );
            state = resized.state;
            facts = currentFacts;
            frame = render(state, facts.capabilities);
            painter.replace(frame);
          } else {
            facts = currentFacts;
          }

          if (received.kind === "resize") continue;
          const event: MarkdownBrowserInputEvent | undefined =
            received.event === null
              ? { kind: "end-of-input" }
              : received.event.kind === "key"
              ? { kind: "key", key: received.event.key }
              : received.event.kind === "mouse" && options.mouse === true &&
                  facts.capabilities.mouseTracking !== false
              ? received.event
              : undefined;
          if (event === undefined) {
            inputRead = reader.readEvent().then((input) => ({
              kind: "input" as const,
              event: input,
            }));
            continue;
          }
          const next = transitionMarkdownBrowser(
            state,
            event,
            facts.capabilities,
          );
          state = next.state;
          let settled = next;
          if (next.linkRequest !== undefined) {
            const resolution = await resolveLink(
              options,
              next.linkRequest,
              abort,
            );
            const resolvedFacts = terminalFacts(io);
            if (!sameGeometry(state, resolvedFacts)) {
              state = transitionMarkdownBrowser(
                state,
                resizeEvent(resolvedFacts),
                resolvedFacts.capabilities,
              ).state;
            }
            facts = resolvedFacts;
            settled = transitionMarkdownBrowser(state, {
              kind: "link-resolution",
              request: next.linkRequest,
              resolution,
            }, facts.capabilities);
            state = settled.state;
          }
          if (settled.result?.kind === "cancelled") {
            throw new InteractionCancelled(settled.result.reason);
          }
          if (settled.result !== undefined) {
            outcome = { ok: true, value: settled.result };
            break;
          }

          frame = render(state, facts.capabilities);
          painter.replace(frame);
          inputRead = reader.readEvent().then((input) => ({
            kind: "input" as const,
            event: input,
          }));
        }
      } catch (error) {
        outcome = { ok: false, error };
      }

      try {
        stopResize();
      } catch (cleanupError) {
        if (outcome.ok) throw cleanupError;
      }
      if (!outcome.ok) throw outcome.error;
      return outcome.value;
    }, {
      ...signalPassthrough(runtime),
      alternateScreen: true,
      mouseTracking: options.mouse === true,
      onSignalRestore: stopResize,
    });
  } finally {
    abort.stop();
  }
}

/**
 * Present a searchable grouped Markdown corpus in an owned terminal viewport.
 * Actions and exits return only after raw mode, cursor visibility, resize
 * observation, and the normal screen have been restored. Ctrl+C, Escape from
 * the picker, and end-of-input raise the established
 * {@linkcode InteractionCancelled} error.
 */
export async function requestMarkdownBrowser<Action>(
  options: MarkdownBrowserOptions<Action>,
  runtime: MarkdownBrowserRuntime = {},
): Promise<MarkdownBrowserResult<Action>> {
  return await runMarkdownBrowserRequest(options, runtime);
}
