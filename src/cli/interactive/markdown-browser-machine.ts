/** Pure key, mouse, resolver, and resize transitions for the Markdown browser. */

import type { TerminalCapabilities } from "../capabilities.ts";
import { validateSemanticInlineDestination } from "../semantic-inline.ts";
import { truncateText } from "../text.ts";
import {
  edgeEnabledIndex,
  isInteractionChoice,
  moveEnabledIndex,
  pageEnabledIndex,
} from "./choice-navigation.ts";
import { GraphemeTextEditor } from "./editor.ts";
import {
  isNamedKey,
  type TerminalKey,
  type TerminalMouseEvent,
} from "./keys.ts";
import {
  isMarkdownBrowserDocument,
  isMarkdownBrowserSelectable,
  type MarkdownBrowserEntry,
  markdownBrowserEntry,
  type MarkdownBrowserLinkRequest,
  type MarkdownBrowserLinkResolution,
  type MarkdownBrowserResult,
  markdownBrowserResumableState,
  type MarkdownBrowserState,
  updateMarkdownBrowserState,
} from "./markdown-browser-model.ts";
import {
  fitMarkdownBrowserState,
  markdownBrowserDocumentAnchor,
  markdownBrowserDocumentFragmentOffset,
  markdownBrowserDocumentLines,
  markdownBrowserDocumentMaximumOffset,
  markdownBrowserDocumentVisibleRows,
  markdownBrowserLinkOccurrences,
  markdownBrowserPickerWindow,
  markdownBrowserPointerTarget,
} from "./markdown-browser-renderer.ts";
import type { InteractionEntry } from "./types.ts";

/** Semantic input consumed by the pure Markdown browser transition. */
export type MarkdownBrowserInputEvent =
  | { readonly kind: "key"; readonly key: TerminalKey }
  | TerminalMouseEvent
  | { readonly kind: "resize"; readonly columns: number; readonly rows: number }
  | {
    readonly kind: "link-resolution";
    readonly request: MarkdownBrowserLinkRequest;
    readonly resolution: MarkdownBrowserLinkResolution;
  }
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
  /** Effect-free resolver request produced by a focused link activation. */
  readonly linkRequest?: MarkdownBrowserLinkRequest;
}

function transition<Action>(
  state: MarkdownBrowserState<Action>,
  result?: MarkdownBrowserTransitionResult<Action>,
  linkRequest?: MarkdownBrowserLinkRequest,
): MarkdownBrowserTransition<Action> {
  return Object.freeze({
    state,
    ...(result === undefined ? {} : { result: Object.freeze(result) }),
    ...(linkRequest === undefined
      ? {}
      : { linkRequest: Object.freeze(linkRequest) }),
  });
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
      linkFocus: null,
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
      linkFocus: null,
      feedback: null,
    }),
    capabilities,
  );
}

function focusLink<Action>(
  state: MarkdownBrowserState<Action>,
  id: string,
  capabilities: TerminalCapabilities,
  origin: "keyboard" | "pointer" = "keyboard",
): MarkdownBrowserState<Action> {
  let focused = fitMarkdownBrowserState(
    updateMarkdownBrowserState(state, {
      linkFocus: { id, origin },
      feedback: null,
    }),
    capabilities,
  );
  const occurrence = markdownBrowserLinkOccurrences(focused, capabilities)
    .find((link) => link.id === id);
  if (occurrence === undefined) {
    return updateMarkdownBrowserState(focused, { linkFocus: null });
  }
  const visibleRows = markdownBrowserDocumentVisibleRows(focused);
  const start = occurrence.documentStartRow - 1;
  const end = occurrence.documentEndRow - 1;
  const current = focused.documentScrollOffset;
  const target = start < current
    ? start
    : end >= current + visibleRows
    ? end - visibleRows + 1
    : current;
  const maximum = markdownBrowserDocumentMaximumOffset(focused, capabilities);
  const offset = Math.max(0, Math.min(target, maximum));
  const lines = markdownBrowserDocumentLines(focused, capabilities);
  const anchor = markdownBrowserDocumentAnchor(lines, offset);
  focused = updateMarkdownBrowserState(focused, {
    documentScrollOffset: offset,
    ...(anchor === undefined
      ? { documentAnchor: null }
      : { documentAnchor: anchor }),
  });
  return fitMarkdownBrowserState(focused, capabilities);
}

function wheelPicker<Action>(
  state: MarkdownBrowserState<Action>,
  direction: -1 | 1,
  capabilities: TerminalCapabilities,
): MarkdownBrowserState<Action> {
  let moved = state;
  for (let index = 0; index < 3; index += 1) {
    moved = movePicker(moved, capabilities, { kind: "step", direction });
  }
  return moved;
}

function handleMouse<Action>(
  state: MarkdownBrowserState<Action>,
  mouse: TerminalMouseEvent,
  capabilities: TerminalCapabilities,
): MarkdownBrowserTransition<Action> {
  const target = markdownBrowserPointerTarget(
    state,
    capabilities,
    mouse.column,
    mouse.row,
  );
  if (target === undefined) return transition(state);
  if (mouse.action === "wheel") {
    const direction = mouse.direction === "up" ? -1 : 1;
    return transition(
      target.kind === "picker"
        ? wheelPicker(state, direction, capabilities)
        : scrollDocument(
          state,
          capabilities,
          state.documentScrollOffset + direction * 3,
        ),
    );
  }
  if (mouse.action !== "press" || mouse.button !== "left") {
    return transition(state);
  }
  if (target.kind === "picker") {
    return transition(fitMarkdownBrowserState(
      updateMarkdownBrowserState(state, {
        focusedPane: "picker",
        ...(target.selectable && target.entryId !== undefined
          ? { highlightedId: target.entryId }
          : {}),
        linkFocus: null,
        feedback: null,
      }),
      capabilities,
    ));
  }
  if (target.linkId === undefined) {
    return transition(fitMarkdownBrowserState(
      updateMarkdownBrowserState(state, {
        focusedPane: "document",
        linkFocus: null,
        feedback: null,
      }),
      capabilities,
    ));
  }
  const focused = focusLink(
    updateMarkdownBrowserState(state, { focusedPane: "document" }),
    target.linkId,
    capabilities,
    "pointer",
  );
  const request = focusedLinkRequest(focused, capabilities);
  return request === undefined
    ? transition(updateMarkdownBrowserState(focused, { linkFocus: null }))
    : transition(focused, undefined, request);
}

function moveLinkFocus<Action>(
  state: MarkdownBrowserState<Action>,
  direction: -1 | 1,
  capabilities: TerminalCapabilities,
): MarkdownBrowserState<Action> {
  const links = markdownBrowserLinkOccurrences(state, capabilities);
  if (links.length === 0) {
    return updateMarkdownBrowserState(state, {
      linkFocus: null,
      feedback: {
        kind: "boundary",
        message: "This document has no addressable links.",
      },
    });
  }
  const current = state.linkFocus === undefined
    ? -1
    : links.findIndex((link) => link.id === state.linkFocus?.id);
  let next: number;
  if (current >= 0) next = current + direction;
  else if (direction > 0) {
    next = links.findIndex((link) =>
      link.documentEndRow - 1 >= state.documentScrollOffset
    );
    if (next < 0) next = links.length - 1;
  } else {
    const viewportEnd = state.documentScrollOffset +
      markdownBrowserDocumentVisibleRows(state);
    next = links.findLastIndex((link) =>
      link.documentStartRow - 1 < viewportEnd
    );
    if (next < 0) next = 0;
  }
  if (next < 0 || next >= links.length) {
    return updateMarkdownBrowserState(state, {
      feedback: {
        kind: "boundary",
        message: direction > 0 ? "Last link." : "First link.",
      },
    });
  }
  const link = links[next];
  return link === undefined ? state : focusLink(state, link.id, capabilities);
}

function availableDocumentFacts<Action>(state: MarkdownBrowserState<Action>) {
  return Object.freeze(
    state.entries.flatMap((entry) =>
      isMarkdownBrowserDocument(entry)
        ? [Object.freeze({
          id: entry.id,
          label: entry.label,
          path: entry.path,
        })]
        : []
    ),
  );
}

function focusedLinkRequest<Action>(
  state: MarkdownBrowserState<Action>,
  capabilities: TerminalCapabilities,
): MarkdownBrowserLinkRequest | undefined {
  const link = markdownBrowserLinkOccurrences(state, capabilities).find(
    (occurrence) => occurrence.id === state.linkFocus?.id,
  );
  return link === undefined ? undefined : Object.freeze({
    id: link.id,
    sourceDocumentId: link.sourceDocumentId,
    sourcePath: link.sourcePath,
    destination: link.destination,
    availableDocuments: availableDocumentFacts(state),
  });
}

function handleDocumentKey<Action>(
  state: MarkdownBrowserState<Action>,
  key: TerminalKey,
  capabilities: TerminalCapabilities,
): MarkdownBrowserTransition<Action> {
  if (key.kind === "text" && (key.text === "]" || key.text === "[")) {
    return transition(
      moveLinkFocus(state, key.text === "]" ? 1 : -1, capabilities),
    );
  }
  if (key.kind === "text" && key.text === "q") {
    return transition(closeDocument(state, capabilities));
  }
  if (key.kind !== "named") return transition(state);
  if (key.name === "enter" && state.linkFocus !== undefined) {
    const request = focusedLinkRequest(state, capabilities);
    return request === undefined
      ? transition(updateMarkdownBrowserState(state, { linkFocus: null }))
      : transition(state, undefined, request);
  }
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

function unresolvedLinkState<Action>(
  state: MarkdownBrowserState<Action>,
  message: string | undefined,
): MarkdownBrowserState<Action> {
  const value = message ?? "Link could not be resolved.";
  if (value.trim() === "" || /[\p{Cc}\p{Cf}]/u.test(value)) {
    throw new TypeError(
      "Markdown browser unresolved-link feedback must be non-empty and control-free",
    );
  }
  return updateMarkdownBrowserState(state, {
    feedback: {
      kind: "unresolved-link",
      message: truncateText(value.trim(), 120, "..."),
    },
  });
}

function openResolvedDocument<Action>(
  state: MarkdownBrowserState<Action>,
  documentId: string,
  fragment: string | undefined,
  capabilities: TerminalCapabilities,
): MarkdownBrowserState<Action> | undefined {
  const entry = markdownBrowserEntry(state, documentId);
  if (entry === undefined || !isMarkdownBrowserDocument(entry)) {
    return undefined;
  }
  let opened = fitMarkdownBrowserState(
    updateMarkdownBrowserState(state, {
      openedDocumentId: entry.id,
      focusedPane: "document",
      documentScrollOffset: 0,
      documentAnchor: null,
      linkFocus: null,
      feedback: null,
    }),
    capabilities,
  );
  if (fragment === undefined) return opened;
  const offset = markdownBrowserDocumentFragmentOffset(
    opened,
    capabilities,
    fragment,
  );
  if (offset === undefined) return undefined;
  opened = scrollDocument(opened, capabilities, offset);
  return opened;
}

function assertExternalDestination(destination: string): string {
  const safe = validateSemanticInlineDestination(destination);
  if (!/^(?:(?:https?|mailto|file):|\/\/)/iu.test(safe)) {
    throw new TypeError(
      "Markdown browser external resolution must return an absolute safe destination",
    );
  }
  return safe;
}

function handleLinkResolution<Action>(
  state: MarkdownBrowserState<Action>,
  request: MarkdownBrowserLinkRequest,
  resolution: MarkdownBrowserLinkResolution,
  capabilities: TerminalCapabilities,
): MarkdownBrowserTransition<Action> {
  const occurrence = markdownBrowserLinkOccurrences(state, capabilities).find(
    (link) => link.id === request.id,
  );
  if (
    occurrence === undefined ||
    occurrence.destination !== request.destination ||
    occurrence.sourceDocumentId !== request.sourceDocumentId ||
    occurrence.sourcePath !== request.sourcePath
  ) {
    throw new TypeError(
      "Markdown browser link resolution does not match the focused occurrence",
    );
  }
  switch (resolution.kind) {
    case "unresolved":
      return transition(unresolvedLinkState(state, resolution.message));
    case "fragment": {
      const opened = openResolvedDocument(
        state,
        occurrence.sourceDocumentId,
        resolution.fragment,
        capabilities,
      );
      return transition(
        opened ?? unresolvedLinkState(state, "Heading not found."),
      );
    }
    case "document": {
      const opened = openResolvedDocument(
        state,
        resolution.documentId,
        resolution.fragment,
        capabilities,
      );
      return transition(
        opened ?? unresolvedLinkState(
          state,
          resolution.fragment === undefined
            ? "Document not found."
            : "Document heading not found.",
        ),
      );
    }
    case "external": {
      const destination = assertExternalDestination(resolution.destination);
      return transition(state, {
        kind: "external-link",
        id: occurrence.id,
        destination,
        sourceDocumentId: occurrence.sourceDocumentId,
        sourcePath: occurrence.sourcePath,
        state: markdownBrowserResumableState(state),
      });
    }
    default:
      throw new TypeError("Unknown Markdown browser link resolution");
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
        linkFocus: null,
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

/** Apply one semantic key, mouse, resolver, resize, or EOF event. */
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
  if (event.kind === "link-resolution") {
    return handleLinkResolution(
      state,
      event.request,
      event.resolution,
      capabilities,
    );
  }
  if (event.kind === "mouse") {
    return handleMouse(state, event, capabilities);
  }
  const key = event.key;
  if (isNamedKey(key, "ctrl-c")) {
    return transition(state, { kind: "cancelled", reason: "Cancelled." });
  }
  if (isNamedKey(key, "escape")) {
    if (state.linkFocus !== undefined) {
      return transition(updateMarkdownBrowserState(state, {
        linkFocus: null,
        feedback: null,
      }));
    }
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
