/** Effect adapter for the keyboard Markdown browser. */

import type { TerminalCapabilities } from "../capabilities.ts";
import { InteractionCancelled } from "./errors.ts";
import { DenoTerminalIO, type TerminalIO, type TerminalSize } from "./io.ts";
import { TerminalKeyReader } from "./keys.ts";
import { assertInteractiveTerminal, withRawTerminal } from "./lifecycle.ts";
import {
  type MarkdownBrowserInputEvent,
  transitionMarkdownBrowser,
} from "./markdown-browser-machine.ts";
import {
  createMarkdownBrowserState,
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

/** Internal renderer seam used to prove effect restoration after render faults. */
export interface MarkdownBrowserRequestServices {
  readonly render?: BrowserRenderer;
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
  runtime: InteractionRuntime = {},
  services: MarkdownBrowserRequestServices = {},
): Promise<MarkdownBrowserResult<Action>> {
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
  const reader = new TerminalKeyReader(io);
  const resize = new ResizeMailbox();
  let stopResizeListener: () => void = () => {};
  let resizeListening = false;
  const stopResize = (): void => {
    if (!resizeListening) return;
    resizeListening = false;
    stopResizeListener();
  };

  return await withRawTerminal(io, async () => {
    let outcome: Settled<MarkdownBrowserResult<Action>>;
    try {
      stopResizeListener = io.listenResize?.(resize.notify) ?? (() => {});
      resizeListening = true;
      painter.replace(frame);

      let keyRead = reader.readKey().then((key) => ({
        kind: "key" as const,
        key,
      }));
      let resizeRead = resize.next().then(() => ({
        kind: "resize" as const,
      }));

      while (true) {
        const received = await Promise.race([keyRead, resizeRead]);
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
        const event: MarkdownBrowserInputEvent = received.key === null
          ? { kind: "end-of-input" }
          : { kind: "key", key: received.key };
        const next = transitionMarkdownBrowser(
          state,
          event,
          facts.capabilities,
        );
        state = next.state;
        if (next.result?.kind === "cancelled") {
          throw new InteractionCancelled(next.result.reason);
        }
        if (next.result !== undefined) {
          outcome = { ok: true, value: next.result };
          break;
        }

        frame = render(state, facts.capabilities);
        painter.replace(frame);
        keyRead = reader.readKey().then((key) => ({
          kind: "key" as const,
          key,
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
    onSignalRestore: stopResize,
  });
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
  runtime: InteractionRuntime = {},
): Promise<MarkdownBrowserResult<Action>> {
  return await runMarkdownBrowserRequest(options, runtime);
}
