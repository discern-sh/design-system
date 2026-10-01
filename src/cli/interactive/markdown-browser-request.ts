/**
 * The Markdown browser on the application runtime: standalone, as one
 * request that returns what the reader chose, or inside a running
 * application as a nested application that returns to it.
 *
 * @module
 */

import { InteractionCancelled } from "./errors.ts";
import { DenoTerminalIO } from "./io.ts";
import { assertInteractiveTerminal } from "./lifecycle.ts";
import { TERMINAL_APPLICATION_MINIMUM } from "./application/frame.ts";
import type { TerminalApplicationState } from "./application/model.ts";
import {
  runTerminalApplication,
  type TerminalApplicationCommand,
  type TerminalApplicationContext,
  type TerminalApplicationOptions,
  type TerminalApplicationRuntime,
} from "./application/runtime.ts";
import {
  nestTerminalApplication,
  type TerminalApplicationNested,
} from "./application/session.ts";
import {
  type MarkdownBrowserExitResult,
  type MarkdownBrowserHandlers,
  type MarkdownBrowserOptions,
  MarkdownBrowserRefusalError,
  type MarkdownBrowserRequestHandlers,
  type MarkdownBrowserResult,
} from "./markdown-browser-model.ts";
import {
  MARKDOWN_BROWSER_CONTENTS,
  MARKDOWN_BROWSER_KEYMAP,
  MarkdownBrowserController,
  type MarkdownBrowserOutcome,
  type MarkdownBrowserStep,
} from "./markdown-browser-view.ts";

/** Runtime effects for one standalone browser: the application runtime's own. */
export type MarkdownBrowserRuntime = TerminalApplicationRuntime;

/** How the application around a browser answers it. */
interface BrowserAnswer<Action> {
  readonly respond: NonNullable<
    MarkdownBrowserRequestHandlers<Action>["respond"]
  >;
  /** The browser is closing; with the exit entry chosen, if any. */
  readonly closing: (exit: MarkdownBrowserExitResult | undefined) => void;
}

/**
 * The browser's application options and the controller behind them.
 * Package-internal: callers run it through `requestMarkdownBrowser` or
 * `markdownBrowserCommand`.
 */
export function markdownBrowserApplication<Action>(
  options: MarkdownBrowserOptions<Action>,
  answer: BrowserAnswer<Action>,
): {
  readonly application: TerminalApplicationOptions<MarkdownBrowserStep>;
  readonly controller: MarkdownBrowserController<Action>;
} {
  const controller = new MarkdownBrowserController(options);
  const apply = (
    outcome: MarkdownBrowserOutcome<Action>,
    context: TerminalApplicationContext<MarkdownBrowserStep>,
  ): TerminalApplicationCommand | void => {
    if (outcome.close !== undefined) {
      answer.closing(outcome.close.exit);
      return { kind: "exit" };
    }
    context.update(controller.view());
    for (const move of outcome.moves ?? []) {
      if (move.kind === "select") {
        context.select(MARKDOWN_BROWSER_CONTENTS, move.itemId);
      } else context.reveal(move.readingId, move.target);
    }
    return outcome.result === undefined
      ? undefined
      : answer.respond(outcome.result);
  };
  return {
    controller,
    application: {
      view: controller.view(),
      keymap: MARKDOWN_BROWSER_KEYMAP,
      start: (context) => {
        apply({ moves: controller.startMoves() }, context);
      },
      onSelectionChange: (listId, itemId) => {
        controller.selected(listId, itemId);
      },
      onAction: (step, context) =>
        apply(controller.step(step, context.state), context),
      onLink: (link, context) =>
        apply(controller.link(link, context.state), context),
      onDismiss: (target, _via, context) => {
        controller.dismiss(target);
        context.update(controller.view());
      },
      onCommandSettled: (_id, outcome, context) => {
        if (outcome.status !== "failed") return;
        controller.failed(outcome.error);
        context.update(controller.view());
      },
    },
  };
}

/**
 * Present a grouped Markdown corpus on its own screen until the reader
 * closes it or chooses something the caller does not answer in place, then
 * resolve with that choice, and with where the reader was, after the
 * terminal is restored. The contents list every entry with a preview beside
 * it; Enter opens one, `/` or Ctrl+K searches, `c` returns to the contents,
 * Escape or Backspace goes back, and `q` closes.
 *
 * Without `handlers.respond`, a chosen action or a link that leaves the
 * documents resolves the request. With it, `respond` answers each one while
 * the browser stays on screen — a background command it returns that fails
 * shows its error's message — and the request resolves only when `respond`
 * returns `{ kind: "exit" }`, with the choice it answered, or when the
 * reader chooses an exit entry. Closing it — `q`, or Escape or Backspace
 * where the reader started — Ctrl+C, EOF, and an abort raise
 * `InteractionCancelled`. A terminal without ANSI cursor control, or
 * smaller than the application minimum, is refused with
 * `MarkdownBrowserRefusalError` before anything changes.
 */
export async function requestMarkdownBrowser<Action>(
  options: MarkdownBrowserOptions<Action>,
  runtime: MarkdownBrowserRuntime = {},
  handlers: MarkdownBrowserRequestHandlers<Action> = {},
): Promise<MarkdownBrowserResult<Action>> {
  if (runtime.abortSignal?.aborted === true) {
    throw new InteractionCancelled("Cancelled.");
  }
  const io = runtime.io ?? new DenoTerminalIO();
  assertInteractiveTerminal(io);
  const size = io.size();
  if (io.capabilities().ansiControl === false) {
    throw new MarkdownBrowserRefusalError("ansi-control-unavailable", size);
  }
  if (
    size.columns < TERMINAL_APPLICATION_MINIMUM.columns ||
    size.rows < TERMINAL_APPLICATION_MINIMUM.rows
  ) {
    throw new MarkdownBrowserRefusalError("terminal-too-small", size);
  }
  const respond = handlers.respond ?? ((): TerminalApplicationCommand => ({
    kind: "exit",
  }));
  let result: MarkdownBrowserResult<Action> | undefined;
  const { application } = markdownBrowserApplication(options, {
    respond: (chosen) => {
      const command = respond(chosen);
      if (command !== undefined && command.kind === "exit") result = chosen;
      return command;
    },
    closing: (exit) => {
      result = exit;
    },
  });
  await runTerminalApplication(application, { ...runtime, io });
  if (result === undefined) throw new InteractionCancelled("Dismissed.");
  return result;
}

/**
 * A command that opens the Markdown browser on a running application's
 * screen, in place of it, and returns there when the reader closes it —
 * with `q`, Escape from where it started, an exit entry, or Ctrl+C, which
 * then reaches the application as Ctrl+C — or when `respond` returns `{
 * kind: "exit" }`. `respond` answers a chosen action or a link that leaves
 * the documents while the browser stays open, as it does for a browser on
 * its own screen; `onClose` runs as one of the application's own callbacks
 * with where the reader was, so opening the browser again with that
 * `initialState` resumes there.
 */
export function markdownBrowserCommand<Action>(
  options: MarkdownBrowserOptions<Action>,
  handlers: MarkdownBrowserHandlers<Action> = {},
): TerminalApplicationNested {
  let exit: MarkdownBrowserExitResult | undefined;
  const { application, controller } = markdownBrowserApplication(options, {
    respond: (chosen) => handlers.respond?.(chosen),
    closing: (chosen) => {
      exit = chosen;
    },
  });
  return nestTerminalApplication(
    application,
    (state: TerminalApplicationState) =>
      handlers.onClose?.(controller.resumable(state), exit),
  );
}
