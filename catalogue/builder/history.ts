/** Bounded undo/redo state for accepted builder documents. */
import type { BuilderDocument } from "./model.ts";

/** Present plus retained undo/redo snapshots; worst case is about 25 MiB. */
export const BUILDER_HISTORY_LIMIT = 100;

export interface BuilderHistoryState {
  readonly past: readonly BuilderDocument[];
  readonly present: BuilderDocument;
  readonly future: readonly BuilderDocument[];
}

/** Start a history around one already-accepted document. */
export function initialHistory(document: BuilderDocument): BuilderHistoryState {
  return { past: [], present: document, future: [] };
}

/** Commit one accepted document while holding the total snapshot ceiling. */
export function commitHistory(
  state: BuilderHistoryState,
  next: BuilderDocument,
): BuilderHistoryState {
  if (next === state.present) return state;
  return {
    past: [
      ...state.past.slice(-(BUILDER_HISTORY_LIMIT - 2)),
      state.present,
    ],
    present: next,
    future: [],
  };
}

/** Undo one commit without creating or losing a snapshot. */
export function undoHistory(state: BuilderHistoryState): BuilderHistoryState {
  const previous = state.past.at(-1);
  if (previous === undefined) return state;
  return {
    past: state.past.slice(0, -1),
    present: previous,
    future: [state.present, ...state.future],
  };
}

/** Redo one undone commit without creating or losing a snapshot. */
export function redoHistory(state: BuilderHistoryState): BuilderHistoryState {
  const next = state.future[0];
  if (next === undefined) return state;
  return {
    past: [...state.past, state.present],
    present: next,
    future: state.future.slice(1),
  };
}
