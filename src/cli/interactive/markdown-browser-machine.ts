/** Pure keyboard and resize transitions for the Markdown browser. */

import type { TerminalCapabilities } from "../capabilities.ts";
import {
  edgeEnabledIndex,
  isInteractionChoice,
  moveEnabledIndex,
  pageEnabledIndex,
} from "./choice-navigation.ts";
import { GraphemeTextEditor } from "./editor.ts";
import { isNamedKey, type TerminalKey } from "./keys.ts";
import {
  isMarkdownBrowserDocument,
  isMarkdownBrowserSelectable,
  type MarkdownBrowserEntry,
  markdownBrowserEntry,
  type MarkdownBrowserResult,
  markdownBrowserResumableState,
  type MarkdownBrowserState,
  updateMarkdownBrowserState,
} from "./markdown-browser-model.ts";
import {
  fitMarkdownBrowserState,
  markdownBrowserDocumentAnchor,
  markdownBrowserDocumentLines,
  markdownBrowserDocumentMaximumOffset,
  markdownBrowserDocumentVisibleRows,
  markdownBrowserPickerWindow,
} from "./markdown-browser-renderer.ts";
import type { InteractionEntry } from "./types.ts";

/** Semantic input consumed by the pure Markdown browser transition. */
export type MarkdownBrowserInputEvent =
  | { readonly kind: "key"; readonly key: TerminalKey }
  | { readonly kind: "resize"; readonly columns: number; readonly rows: number }
  | { readonly kind: "end-of-input" };

/** Cancellation outcome translated to the established interaction error. */
export interface MarkdownBrowserCancellation {
  readonly kind: "cancelled";
  readonly reason: string;
}

/** Optional terminal outcome produced by a pure browser transition. */
export type MarkdownBrowserTransitionResult<Action> =
  | MarkdownBrowserResult<Action>
  | MarkdownBrowserCancellation;

/** Immutable next state plus an optional action, exit, or cancellation. */
export interface MarkdownBrowserTransition<Action> {
  readonly state: MarkdownBrowserState<Action>;
  readonly result?: MarkdownBrowserTransitionResult<Action>;
}

function transition<Action>(
  state: MarkdownBrowserState<Action>,
  result?: MarkdownBrowserTransitionResult<Action>,
): MarkdownBrowserTransition<Action> {
  return Object.freeze(
    result === undefined ? { state } : { state, result: Object.freeze(result) },
  );
}

function navigationEntries<Action>(
  entries: readonly MarkdownBrowserEntry<Action>[],
): readonly InteractionEntry<string>[] {
  return entries.map((entry): InteractionEntry<string> =>
    entry.kind === "group-heading"
      ? {
        kind: "group-heading",
        id: entry.id,
        label: entry.label,
        ...(entry.description === undefined
          ? {}
          : { description: entry.description }),
      }
      : {
        kind: "choice",
        id: entry.id,
        label: entry.label,
        value: entry.id,
      }
  );
}

function highlightedIndex<Action>(
  state: MarkdownBrowserState<Action>,
  entries: readonly InteractionEntry<string>[],
): number {
  return entries.findIndex((entry) =>
    isInteractionChoice(entry) && entry.id === state.highlightedId
  );
}

function movePicker<Action>(
  state: MarkdownBrowserState<Action>,
  capabilities: TerminalCapabilities,
  movement:
    | { readonly kind: "step"; readonly direction: -1 | 1 }
    | { readonly kind: "page"; readonly direction: -1 | 1 }
    | { readonly kind: "edge"; readonly edge: "first" | "last" },
): MarkdownBrowserState<Action> {
  const entries = navigationEntries(state.filteredEntries);
  const current = highlightedIndex(state, entries);
  const next = movement.kind === "step"
    ? moveEnabledIndex(entries, current, movement.direction)
    : movement.kind === "page"
    ? pageEnabledIndex(
      entries,
      current,
      movement.direction,
      Math.max(
        1,
        markdownBrowserPickerWindow(state, capabilities).selectableCount,
      ),
    )
    : edgeEnabledIndex(entries, movement.edge);
  const entry = entries[next];
  if (entry === undefined || !isInteractionChoice(entry)) return state;
  return fitMarkdownBrowserState(
    updateMarkdownBrowserState(state, {
      highlightedId: entry.id,
      feedback: null,
    }),
    capabilities,
  );
}

function closeDocument<Action>(
  state: MarkdownBrowserState<Action>,
  capabilities: TerminalCapabilities,
): MarkdownBrowserState<Action> {
  return fitMarkdownBrowserState(
    updateMarkdownBrowserState(state, {
      openedDocumentId: null,
      focusedPane: "picker",
      documentScrollOffset: 0,
      documentAnchor: null,
      feedback: null,
    }),
    capabilities,
  );
}

function scrollDocument<Action>(
  state: MarkdownBrowserState<Action>,
  capabilities: TerminalCapabilities,
  target: number,
): MarkdownBrowserState<Action> {
  const lines = markdownBrowserDocumentLines(state, capabilities);
  const maximum = markdownBrowserDocumentMaximumOffset(state, capabilities);
  const offset = Math.max(0, Math.min(target, maximum));
  const anchor = markdownBrowserDocumentAnchor(lines, offset);
  return fitMarkdownBrowserState(
    updateMarkdownBrowserState(state, {
      documentScrollOffset: offset,
      ...(anchor === undefined
        ? { documentAnchor: null }
        : { documentAnchor: anchor }),
      feedback: null,
    }),
    capabilities,
  );
}

function handleDocumentKey<Action>(
  state: MarkdownBrowserState<Action>,
  key: TerminalKey,
  capabilities: TerminalCapabilities,
): MarkdownBrowserTransition<Action> {
  if (key.kind === "text" && key.text === "q") {
    return transition(closeDocument(state, capabilities));
  }
  if (key.kind !== "named") return transition(state);
  const page = markdownBrowserDocumentVisibleRows(state);
  switch (key.name) {
    case "up":
    case "ctrl-p":
      return transition(
        scrollDocument(state, capabilities, state.documentScrollOffset - 1),
      );
    case "down":
    case "ctrl-n":
      return transition(
        scrollDocument(state, capabilities, state.documentScrollOffset + 1),
      );
    case "page-up":
      return transition(
        scrollDocument(state, capabilities, state.documentScrollOffset - page),
      );
    case "page-down":
      return transition(
        scrollDocument(state, capabilities, state.documentScrollOffset + page),
      );
    case "home":
      return transition(scrollDocument(state, capabilities, 0));
    case "end":
      return transition(
        scrollDocument(
          state,
          capabilities,
          markdownBrowserDocumentMaximumOffset(state, capabilities),
        ),
      );
    default:
      return transition(state);
  }
}

function actionResult<Action>(
  state: MarkdownBrowserState<Action>,
  entry: MarkdownBrowserEntry<Action>,
): MarkdownBrowserResult<Action> | undefined {
  if (entry.kind === "action") {
    return Object.freeze({
      kind: "action",
      id: entry.id,
      value: entry.value,
      state: markdownBrowserResumableState(state),
    });
  }
  if (entry.kind === "exit") {
    return Object.freeze({
      kind: "exit",
      id: entry.id,
      state: markdownBrowserResumableState(state),
    });
  }
  return undefined;
}

function handlePickerEnter<Action>(
  state: MarkdownBrowserState<Action>,
  capabilities: TerminalCapabilities,
): MarkdownBrowserTransition<Action> {
  const entry = markdownBrowserEntry(state, state.highlightedId);
  if (entry === undefined || !isMarkdownBrowserSelectable(entry)) {
    return transition(state);
  }
  if (isMarkdownBrowserDocument(entry)) {
    const opened = fitMarkdownBrowserState(
      updateMarkdownBrowserState(state, {
        openedDocumentId: entry.id,
        focusedPane: "document",
        documentScrollOffset: 0,
        documentAnchor: null,
        feedback: null,
      }),
      capabilities,
    );
    return transition(opened);
  }
  return transition(state, actionResult(state, entry));
}

function handlePickerEdit<Action>(
  state: MarkdownBrowserState<Action>,
  key: TerminalKey,
  capabilities: TerminalCapabilities,
): MarkdownBrowserState<Action> {
  const editor = new GraphemeTextEditor(state.query);
  editor.moveCursorTo(state.queryCursor);
  editor.handle(key);
  if (editor.value === state.query && editor.cursor === state.queryCursor) {
    return state;
  }
  return fitMarkdownBrowserState(
    updateMarkdownBrowserState(state, {
      query: editor.value,
      queryCursor: editor.cursor,
      ...(editor.value === state.query ? {} : { pickerVisibleStart: 0 }),
      feedback: null,
    }),
    capabilities,
  );
}

function handlePickerKey<Action>(
  state: MarkdownBrowserState<Action>,
  key: TerminalKey,
  capabilities: TerminalCapabilities,
): MarkdownBrowserTransition<Action> {
  if (isNamedKey(key, "enter")) {
    return handlePickerEnter(state, capabilities);
  }
  if (
    isNamedKey(key, "up") || isNamedKey(key, "ctrl-p") ||
    (state.openedDocumentId === undefined && isNamedKey(key, "shift-tab"))
  ) {
    return transition(movePicker(state, capabilities, {
      kind: "step",
      direction: -1,
    }));
  }
  if (
    isNamedKey(key, "down") || isNamedKey(key, "ctrl-n") ||
    (state.openedDocumentId === undefined && isNamedKey(key, "tab"))
  ) {
    return transition(movePicker(state, capabilities, {
      kind: "step",
      direction: 1,
    }));
  }
  if (isNamedKey(key, "page-up") || isNamedKey(key, "page-down")) {
    return transition(movePicker(state, capabilities, {
      kind: "page",
      direction: isNamedKey(key, "page-up") ? -1 : 1,
    }));
  }
  if (isNamedKey(key, "home") || isNamedKey(key, "end")) {
    return transition(movePicker(state, capabilities, {
      kind: "edge",
      edge: isNamedKey(key, "home") ? "first" : "last",
    }));
  }
  return transition(handlePickerEdit(state, key, capabilities));
}

function resizeState<Action>(
  state: MarkdownBrowserState<Action>,
  columns: number,
  rows: number,
  capabilities: TerminalCapabilities,
): MarkdownBrowserState<Action> {
  if (capabilities.columns !== columns) {
    throw new TypeError(
      `Markdown browser resize width ${columns} does not match terminal capabilities ${capabilities.columns}`,
    );
  }
  const oldCapabilities = { ...capabilities, columns: state.columns };
  const oldLines = state.openedDocumentId === undefined
    ? []
    : markdownBrowserDocumentLines(state, oldCapabilities);
  const oldMaximum = state.openedDocumentId === undefined
    ? 0
    : markdownBrowserDocumentMaximumOffset(state, oldCapabilities);
  const anchor = markdownBrowserDocumentAnchor(
    oldLines,
    state.documentScrollOffset,
  );
  let resized = updateMarkdownBrowserState(state, {
    columns,
    rows,
    ...(anchor === undefined
      ? { documentAnchor: null }
      : { documentAnchor: anchor }),
  });
  if (state.openedDocumentId !== undefined) {
    const newMaximum = markdownBrowserDocumentMaximumOffset(
      resized,
      capabilities,
    );
    const fallback = oldMaximum === 0 ? 0 : Math.round(
      state.documentScrollOffset / oldMaximum * newMaximum,
    );
    resized = updateMarkdownBrowserState(resized, {
      documentScrollOffset: fallback,
      ...(anchor === undefined
        ? { documentAnchor: null }
        : { documentAnchor: anchor }),
    });
  }
  return fitMarkdownBrowserState(resized, capabilities);
}

/** Apply one semantic key, resize, or EOF event without reading the process. */
export function transitionMarkdownBrowser<Action>(
  source: MarkdownBrowserState<Action>,
  event: MarkdownBrowserInputEvent,
  capabilities: TerminalCapabilities,
): MarkdownBrowserTransition<Action> {
  if (event.kind === "end-of-input") {
    return transition(source, {
      kind: "cancelled",
      reason: "Input ended.",
    });
  }
  if (event.kind === "resize") {
    return transition(
      resizeState(source, event.columns, event.rows, capabilities),
    );
  }
  const state = fitMarkdownBrowserState(source, capabilities);
  const key = event.key;
  if (isNamedKey(key, "ctrl-c")) {
    return transition(state, { kind: "cancelled", reason: "Cancelled." });
  }
  if (isNamedKey(key, "escape")) {
    return state.focusedPane === "document"
      ? transition(closeDocument(state, capabilities))
      : transition(state, { kind: "cancelled", reason: "Dismissed." });
  }
  if (
    state.openedDocumentId !== undefined &&
    (isNamedKey(key, "tab") || isNamedKey(key, "shift-tab"))
  ) {
    return transition(fitMarkdownBrowserState(
      updateMarkdownBrowserState(
        state,
        {
          focusedPane: state.focusedPane === "picker" ? "document" : "picker",
          feedback: null,
        },
      ),
      capabilities,
    ));
  }
  return state.focusedPane === "document"
    ? handleDocumentKey(state, key, capabilities)
    : handlePickerKey(state, key, capabilities);
}
