/**
 * Every word the package itself writes on an application screen, in one
 * table with English defaults. A view replaces any of them through `copy`,
 * so a screen in another language or voice never shows package English.
 *
 * @module
 */

import type { ApplicationRun } from "./view.ts";

/**
 * The words the package writes: generated key hint labels, empty and
 * pending states, counts, overflow markers, the challenge hint, and the
 * too-small notice. Words a caller already supplies elsewhere — liveness
 * labels, a sheet's `readHint`, a field editor's label — keep their own
 * fields, which win over these.
 */
export interface TerminalApplicationCopy {
  // Key hint labels the package generates.
  /** Enter on a field in a sheet or form: move to the buttons. */
  readonly buttons: string;
  /** Left and Right between a layer's buttons. */
  readonly choose: string;
  /** Tab between a form's fields. */
  readonly nextField: string;
  /** Page Down while a sheet's body must still be read. */
  readonly readMore: string;
  /** A field's external-editor chord, when the field names none. */
  readonly editor: string;
  /** Enter on a folded group or disclosure. */
  readonly show: string;
  /** Enter on an open group or disclosure. */
  readonly hide: string;
  /** Enter on an unavailable menu item. */
  readonly why: string;
  /** Up and Down between rows. */
  readonly move: string;
  /** Up and Down between items while the detail is zoomed. */
  readonly next: string;
  /** Up and Down through a document without rows. */
  readonly scroll: string;
  /** Enter on a reader's row. */
  readonly open: string;
  /** Enter while a list filter is being edited. */
  readonly done: string;
  /** Escape while a query or filter holds text. */
  readonly clear: string;
  /** Escape in a menu or palette. */
  readonly close: string;
  /** Escape in a reader, and Left out of zoom. */
  readonly back: string;
  /** `/` in a menu. */
  readonly filter: string;
  /** The word standing for a menu's item keys when letters run items. */
  readonly letters: string;
  /** What those letters do. */
  readonly run: string;
  /** The word standing for typing in a palette. */
  readonly type: string;
  /** What typing does there. */
  readonly toSearch: string;
  // States and counts.
  /** A detail whose item has no content yet. */
  readonly loading: string;
  /** A list with no items. */
  readonly noItems: string;
  /** A filter, menu, or palette with no matches. */
  readonly noMatches: string;
  /** A count within a total, such as `3 of 11`. */
  readonly count: (shown: number, total: number) => string;
  /** Hidden lines beside an arrow, such as `6 more`. */
  readonly more: (count: number) => string;
  /** Hidden lines above, without Unicode arrows, such as `6 more above`. */
  readonly moreAbove: (count: number) => string;
  /** Hidden lines below, without Unicode arrows, such as `6 more below`. */
  readonly moreBelow: (count: number) => string;
  // A sheet's typed challenge.
  /** The text matches exactly. */
  readonly matches: string;
  /** The text cannot become a match by typing more. */
  readonly doesNotMatch: string;
  /** Characters still to type, such as `17 more characters`. */
  readonly charactersLeft: (count: number) => string;
  /** The label before work that follows a running operation. */
  readonly then: string;
  // The screen below its minimum size.
  readonly tooSmall: string;
  /** The size needed, such as `Needs 32 × 10`. */
  readonly needs: (columns: number, rows: number, times: string) => string;
  /** The size now, such as `now 30 × 9`. */
  readonly now: (columns: number, rows: number, times: string) => string;
  /** Shown once when mouse input turns on: how to select text natively. */
  readonly selectionHint: readonly ApplicationRun[];
}

/** The English copy the package uses where a view supplies none. */
export const DEFAULT_TERMINAL_APPLICATION_COPY: TerminalApplicationCopy = Object
  .freeze({
    buttons: "Buttons",
    choose: "Choose",
    nextField: "Next field",
    readMore: "Read more",
    editor: "Editor",
    show: "Show",
    hide: "Hide",
    why: "Why",
    move: "Move",
    next: "Next",
    scroll: "Scroll",
    open: "Open",
    done: "Done",
    clear: "Clear",
    close: "Close",
    back: "Back",
    filter: "Filter",
    letters: "Letters",
    run: "Run",
    type: "Type",
    toSearch: "to search",
    loading: "Loading…",
    noItems: "No items",
    noMatches: "No matches",
    count: (shown: number, total: number) => `${shown} of ${total}`,
    more: (count: number) => `${count} more`,
    moreAbove: (count: number) => `${count} more above`,
    moreBelow: (count: number) => `${count} more below`,
    matches: "Matches",
    doesNotMatch: "Does not match",
    charactersLeft: (count: number) =>
      `${count} more character${count === 1 ? "" : "s"}`,
    then: "Then",
    tooSmall: "Too small",
    needs: (columns: number, rows: number, times: string) =>
      `Needs ${columns} ${times} ${rows}`,
    now: (columns: number, rows: number, times: string) =>
      `now ${columns} ${times} ${rows}`,
    selectionHint: Object.freeze([
      Object.freeze({ text: "Shift-drag", role: "key" as const }),
      Object.freeze({ text: " to select text" }),
    ]),
  });

const resolved = new WeakMap<object, TerminalApplicationCopy>();

/** A view's copy: its replacements over the English defaults. */
export function applicationCopy(
  copy: Partial<TerminalApplicationCopy> | undefined,
): TerminalApplicationCopy {
  if (copy === undefined) return DEFAULT_TERMINAL_APPLICATION_COPY;
  const cached = resolved.get(copy);
  if (cached !== undefined) return cached;
  const merged = Object.freeze({
    ...DEFAULT_TERMINAL_APPLICATION_COPY,
    ...copy,
  });
  resolved.set(copy, merged);
  return merged;
}
