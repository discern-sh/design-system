/**
 * Pure application state. A model adopts immutable views, applies one input
 * at a time, and reports the caller callbacks each step owes in a fixed
 * order. Geometry-dependent decisions — density, list width, scroll — are
 * settled by the renderer, which returns the model it fitted.
 *
 * @module
 */

import { GraphemeTextEditor } from "../editor.ts";
import type { TerminalKey } from "../keys.ts";
import {
  type CompiledKeymap,
  compileKeymap,
  keyChordOf,
  reservedBaseChords,
} from "./keymap.ts";
import {
  firstSelectable,
  flattenList,
  itemKey,
  jumpGroup,
  keyGroupId,
  keyItemId,
  lastSelectable,
  listLayoutKey,
  type ListRowKey,
  type ListRows,
  mergeDisplayList,
  rowGroupIds,
  rowIndexForKey,
  rowKey,
  stepSelection,
  successorRow,
} from "./list-model.ts";
import {
  assertTerminalApplicationView,
  type TerminalApplicationViewContext,
} from "./validate.ts";
import {
  DEFAULT_LIST_SETTLE_MS,
  type GroupedList,
  type KeymapEntry,
  type MessageLine,
  type TerminalApplicationView,
} from "./view.ts";

/** How the body was last laid out. */
export type TerminalApplicationLayout =
  | "split"
  | "strip"
  | "zoom"
  | "list"
  | "reading"
  | "empty"
  | "too-small";

/** The viewport sizes the last frame gave each region, for paging. */
export interface TerminalApplicationGeometry {
  readonly layout: TerminalApplicationLayout;
  readonly listRows: number;
  /** Rows of a detail column or zoom; 0 while the detail is a strip or absent. */
  readonly detailRows: number;
  readonly readingRows: number;
}

/** A list's filter while it applies. */
export interface TerminalApplicationFilter {
  readonly query: string;
  readonly cursor: number;
  /** Whether the filter field owns input. */
  readonly editing: boolean;
}

/** Fitting decisions made on resize and membership change only. */
export interface TerminalApplicationDensity {
  /** The geometry and membership the decision was made for. */
  readonly key: string;
  readonly separators: boolean;
  readonly densityFolds: readonly string[];
  /** The list's width beside a detail column. */
  readonly width?: number;
}

/** Everything the package remembers about one list, by its id. */
export interface TerminalApplicationListModel<A> {
  /** The newest list the caller supplied. */
  readonly latest: GroupedList<A>;
  /** The list whose membership and order are on screen. */
  readonly settled: GroupedList<A>;
  /** The settled membership with the newest content. */
  readonly display: GroupedList<A>;
  /** Whether a membership change waits for the settle window. */
  readonly pending: boolean;
  readonly selection?: ListRowKey;
  readonly filter?: TerminalApplicationFilter;
  /** Foldable groups the person folded. */
  readonly folds: readonly string[];
  /** Groups whose initial fold has been applied. */
  readonly seen: readonly string[];
  readonly zoomed: boolean;
  /** The first list row in the viewport. */
  readonly scroll: number;
  /** The selection's viewport line in the last frame. */
  readonly line?: number;
  /** A viewport line the next frame keeps the selection on. */
  readonly anchor?: number;
  /** Groups just unfolded, which the next frame scrolls into view. */
  readonly reveal?: readonly string[];
  readonly density?: TerminalApplicationDensity;
}

/**
 * The package's complete application state: the adopted view, the caller's
 * bindings, and everything navigation owns. Treat it as opaque and
 * immutable; read the public projection with
 * {@linkcode terminalApplicationState}.
 */
export interface TerminalApplicationModel<A> {
  readonly view: TerminalApplicationView<A>;
  readonly keymap: CompiledKeymap<A>;
  readonly lists: Readonly<Record<string, TerminalApplicationListModel<A>>>;
  /** Whether an empty body's primary hint holds the selection. */
  readonly primaryFocused: boolean;
  /** Detail scroll by item id. */
  readonly detailScroll: Readonly<Record<string, number>>;
  /** Reading scroll by body id. */
  readonly readingScroll: Readonly<Record<string, number>>;
  readonly lastKeyAt?: number;
  /** When the header's liveness became busy. */
  readonly busySince?: number;
  /** When the current message appeared. */
  readonly messageSince?: number;
  /** Message ids reported dismissed that the next view must omit. */
  readonly dismissed: readonly string[];
  readonly geometry?: TerminalApplicationGeometry;
}

/** One list's navigation state as callers read it. */
export interface TerminalApplicationListState {
  /** The selected item. */
  readonly selectedId?: string;
  /** The selected fold row or foldable header, when no item is selected. */
  readonly selectedGroupId?: string;
  /** The filter text while a filter applies. */
  readonly filter?: string;
  /** Whether the filter field owns input. */
  readonly filtering: boolean;
  /** Groups the person folded. */
  readonly folds: readonly string[];
  readonly zoomed: boolean;
  readonly scroll: number;
}

/** A read-only snapshot of what the package owns, for building views and saving preferences. */
export interface TerminalApplicationState {
  /** The topmost open layer, when one is open. */
  readonly topLayerId?: string;
  /** The list, field, document, or hint that receives the next key. */
  readonly focusedControlId?: string;
  readonly lists: Readonly<Record<string, TerminalApplicationListState>>;
  /** Detail scroll by item id. */
  readonly detailScroll: Readonly<Record<string, number>>;
  /** Reading scroll by body id. */
  readonly readingScroll: Readonly<Record<string, number>>;
  /** Field values by layer, then field. */
  readonly fields: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** Whether each layer's body has been read to its end. */
  readonly fullyRead: Readonly<Record<string, boolean>>;
}

/** How a selected item moved when a view changed. */
export type TerminalApplicationSelectionMove =
  | { readonly kind: "regrouped"; readonly from: string; readonly to: string }
  | { readonly kind: "removed"; readonly replacement?: string };

/** How a message was dismissed. */
export type TerminalApplicationDismissal =
  | "safe"
  | "escape"
  | "click-outside"
  | "timeout"
  | "key";

/** Where an action came from. */
export type TerminalApplicationActionSource =
  | "enter"
  | "key"
  | "menu"
  | "button"
  | "click"
  | "chip";

/**
 * One caller callback a step owes. A step's effects are ordered:
 * selection moves and changes, then dismissals, then actions.
 */
export type TerminalApplicationEffect<A> =
  | {
    readonly kind: "selection-moved";
    readonly listId: string;
    readonly itemId: string;
    readonly move: TerminalApplicationSelectionMove;
  }
  | {
    readonly kind: "selection-change";
    readonly listId: string;
    readonly itemId?: string;
  }
  | {
    readonly kind: "dismiss";
    readonly target: { readonly message: string };
    readonly via: TerminalApplicationDismissal;
  }
  | {
    readonly kind: "action";
    readonly action: A;
    readonly source: TerminalApplicationActionSource;
  }
  | { readonly kind: "cancel" };

/** One step's new model and the callbacks it owes, in order. */
export interface TerminalApplicationTransition<A> {
  readonly model: TerminalApplicationModel<A>;
  readonly effects: readonly TerminalApplicationEffect<A>[];
}

/** Input the model applies one at a time. */
export type TerminalApplicationInput =
  | { readonly kind: "key"; readonly key: TerminalKey }
  /** Time has passed: settle windows, message timeouts. */
  | { readonly kind: "time" }
  /** The caller selects an item; `reveal` unfolds its group. */
  | {
    readonly kind: "select";
    readonly listId: string;
    readonly itemId: string;
    readonly reveal?: boolean;
  };

/** Bindings the model carries. */
export interface TerminalApplicationConfig<A> {
  readonly keymap?: readonly KeymapEntry<A>[];
  /** Bind j and k to Down and Up. */
  readonly viKeys?: boolean;
}

const EFFECT_ORDER: Readonly<
  Record<TerminalApplicationEffect<unknown>["kind"], number>
> = {
  "selection-moved": 0,
  "selection-change": 1,
  dismiss: 2,
  action: 3,
  cancel: 4,
};

function ordered<A>(
  effects: readonly TerminalApplicationEffect<A>[],
): readonly TerminalApplicationEffect<A>[] {
  return [...effects].sort((left, right) =>
    EFFECT_ORDER[left.kind] - EFFECT_ORDER[right.kind]
  );
}

/** The list the body shows, if any. */
export function bodyList<A>(
  view: TerminalApplicationView<A>,
): GroupedList<A> | undefined {
  const body = view.body;
  if (body.kind === "master-detail" || body.kind === "list") return body.list;
  return body.kind === "empty" ? body.list : undefined;
}

const rowsCache = new WeakMap<
  object,
  { readonly key: string; readonly rows: ListRows<unknown> }
>();

/** The rows a list model shows now. */
export function listModelRows<A>(
  list: TerminalApplicationListModel<A>,
): ListRows<A> {
  const shape = {
    folds: new Set(list.folds),
    densityFolds: new Set(list.density?.densityFolds ?? []),
    separators: list.density?.separators ?? true,
    ...(list.filter === undefined ? {} : { query: list.filter.query }),
  };
  const key = JSON.stringify([
    list.folds,
    list.density?.densityFolds ?? [],
    shape.separators,
    list.filter?.query ?? "",
  ]);
  const cached = rowsCache.get(list.display);
  if (cached?.key === key) return cached.rows as ListRows<A>;
  const rows = flattenList(list.display, shape);
  rowsCache.set(list.display, { key, rows: rows as ListRows<unknown> });
  return rows;
}

function groupOfItem<A>(
  list: GroupedList<A>,
  id: string,
): string | undefined {
  return list.groups.find((group) => group.items.some((item) => item.id === id))
    ?.id;
}

/** The first item row, else the first selectable row. */
function initialSelection<A>(rows: ListRows<A>): ListRowKey | undefined {
  const item = rows.rows.find((row) => row.kind === "item");
  return rowKey(item) ?? rowKey(rows.rows[firstSelectable(rows.rows)]);
}

/**
 * Keep a selection on its row after the rows changed. A missing item moves
 * to its successor; a regrouped or removed item is reported, and the viewport
 * keeps the selection on its line.
 */
function reconcileSelection<A>(
  listId: string,
  before: TerminalApplicationListModel<A> | undefined,
  after: TerminalApplicationListModel<A>,
  effects: TerminalApplicationEffect<A>[],
  report: boolean,
): TerminalApplicationListModel<A> {
  const rows = listModelRows(after);
  const key = after.selection;
  if (key === undefined || before === undefined) {
    const initial = key !== undefined && rowIndexForKey(rows.rows, key) >= 0
      ? key
      : initialSelection(rows);
    return withSelection(after, initial);
  }
  const index = rowIndexForKey(rows.rows, key);
  const item = keyItemId(key);
  const oldGroup = item === undefined
    ? undefined
    : groupOfItem(before.display, item);
  const newGroup = item === undefined
    ? undefined
    : groupOfItem(after.display, item);
  const regrouped = report && item !== undefined && oldGroup !== undefined &&
    newGroup !== undefined && oldGroup !== newGroup;
  if (regrouped) {
    effects.push({
      kind: "selection-moved",
      listId,
      itemId: item,
      move: { kind: "regrouped", from: oldGroup, to: newGroup },
    });
  }
  if (index >= 0) {
    return regrouped ? { ...after, anchor: before.line ?? 0 } : after;
  }
  const successor = rowKey(
    rows.rows[successorRow(listModelRows(before), rows, key, after.zoomed)],
  );
  if (report && item !== undefined && newGroup === undefined) {
    const replacement = keyItemId(successor);
    effects.push({
      kind: "selection-moved",
      listId,
      itemId: item,
      move: {
        kind: "removed",
        ...(replacement === undefined ? {} : { replacement }),
      },
    });
  }
  return {
    ...withSelection(after, successor),
    ...(before.line === undefined ? {} : { anchor: before.line }),
  };
}

function withSelection<A>(
  list: TerminalApplicationListModel<A>,
  selection: ListRowKey | undefined,
): TerminalApplicationListModel<A> {
  if (selection === list.selection) return list;
  const { selection: _previous, ...rest } = list;
  return selection === undefined ? rest : { ...rest, selection };
}

/** Adopt one list version, deferring membership changes inside the settle window. */
function adoptList<A>(
  previous: TerminalApplicationListModel<A> | undefined,
  list: GroupedList<A>,
  settleDeferred: boolean,
): TerminalApplicationListModel<A> {
  const initialFolds = (groups: GroupedList<A>["groups"]) =>
    groups.filter((group) =>
      group.foldable === true && group.initiallyFolded === true
    ).map((group) => group.id);
  if (previous === undefined) {
    return {
      latest: list,
      settled: list,
      display: list,
      pending: false,
      folds: initialFolds(list.groups),
      seen: list.groups.map((group) => group.id),
      zoomed: false,
      scroll: 0,
    };
  }
  const seen = new Set(previous.seen);
  const fresh = list.groups.filter((group) => !seen.has(group.id));
  const folds = [...previous.folds, ...initialFolds(fresh)];
  const changed = listLayoutKey(list) !== listLayoutKey(previous.settled);
  const defer = changed && settleDeferred;
  return {
    ...previous,
    latest: list,
    settled: defer ? previous.settled : list,
    display: defer ? mergeDisplayList(previous.settled, list) : list,
    pending: defer,
    folds,
    seen: [...previous.seen, ...fresh.map((group) => group.id)],
  };
}

function settleWindowOpen<A>(
  model: TerminalApplicationModel<A> | undefined,
  list: GroupedList<A>,
  now: number,
): boolean {
  return model?.lastKeyAt !== undefined &&
    now - model.lastKeyAt < (list.settleMs ?? DEFAULT_LIST_SETTLE_MS);
}

/** The selected item id of the body's list. */
function selectedItem<A>(
  model: TerminalApplicationModel<A>,
): { readonly listId: string; readonly itemId?: string } | undefined {
  const list = bodyList(model.view);
  if (list === undefined) return undefined;
  if (model.view.body.kind === "empty" && model.primaryFocused) {
    return { listId: list.id };
  }
  const itemId = keyItemId(model.lists[list.id]?.selection);
  return itemId === undefined
    ? { listId: list.id }
    : { listId: list.id, itemId };
}

function selectionEffects<A>(
  before: TerminalApplicationModel<A> | undefined,
  after: TerminalApplicationModel<A>,
  effects: TerminalApplicationEffect<A>[],
): void {
  const was = before === undefined ? undefined : selectedItem(before);
  const now = selectedItem(after);
  if (now === undefined) return;
  if (was?.listId === now.listId && was.itemId === now.itemId) return;
  effects.push({
    kind: "selection-change",
    listId: now.listId,
    ...(now.itemId === undefined ? {} : { itemId: now.itemId }),
  });
}

function messageTiming<A>(
  previous: TerminalApplicationModel<A> | undefined,
  message: MessageLine | undefined,
  now: number,
): number | undefined {
  if (message === undefined) return undefined;
  return previous?.view.message?.id === message.id &&
      previous.messageSince !== undefined
    ? previous.messageSince
    : now;
}

function adopt<A>(
  previous: TerminalApplicationModel<A> | undefined,
  view: TerminalApplicationView<A>,
  keymap: CompiledKeymap<A>,
  now: number,
): TerminalApplicationTransition<A> {
  const context: TerminalApplicationViewContext = {
    dismissedMessages: previous?.dismissed ?? [],
  };
  assertTerminalApplicationView(view, context);
  const effects: TerminalApplicationEffect<A>[] = [];
  const lists = { ...previous?.lists };
  const list = bodyList(view);
  if (list !== undefined) {
    const before = lists[list.id];
    const adopted = adoptList(
      before,
      list,
      settleWindowOpen(previous, list, now),
    );
    lists[list.id] = reconcileSelection(
      list.id,
      before,
      adopted,
      effects,
      before !== undefined,
    );
  }
  const busy = view.header.liveness?.state === "busy";
  const busySince = busy
    ? previous?.view.header.liveness?.state === "busy"
      ? previous.busySince ?? now
      : now
    : undefined;
  const messageSince = messageTiming(previous, view.message, now);
  const model: TerminalApplicationModel<A> = {
    view,
    keymap,
    lists,
    primaryFocused: view.body.kind === "empty"
      ? previous?.view.body.kind === "empty" ? previous.primaryFocused : true
      : false,
    detailScroll: previous?.detailScroll ?? {},
    readingScroll: previous?.readingScroll ?? {},
    ...(previous?.lastKeyAt === undefined
      ? {}
      : { lastKeyAt: previous.lastKeyAt }),
    ...(busySince === undefined ? {} : { busySince }),
    ...(messageSince === undefined ? {} : { messageSince }),
    dismissed: [],
    ...(previous?.geometry === undefined
      ? {}
      : { geometry: previous.geometry }),
  };
  selectionEffects(previous, model, effects);
  return { model, effects: ordered(effects) };
}

/**
 * Start an application model from its first view. The transition's effects
 * hold the initial selection change.
 */
export function createTerminalApplicationModel<A>(
  view: TerminalApplicationView<A>,
  config: TerminalApplicationConfig<A> = {},
  now = 0,
): TerminalApplicationTransition<A> {
  return adopt(
    undefined,
    view,
    compileKeymap(config.keymap, config.viKeys === true),
    now,
  );
}

/**
 * Adopt a replacement view. Selection follows item identity; membership and
 * order changes wait for the settle window while keys are being pressed.
 */
export function updateTerminalApplication<A>(
  model: TerminalApplicationModel<A>,
  view: TerminalApplicationView<A>,
  now: number,
): TerminalApplicationTransition<A> {
  return adopt(model, view, model.keymap, now);
}

function replaceList<A>(
  model: TerminalApplicationModel<A>,
  id: string,
  list: TerminalApplicationListModel<A>,
): TerminalApplicationModel<A> {
  return { ...model, lists: { ...model.lists, [id]: list } };
}

/** Apply settle windows and timed dismissals that are due. */
function applyTime<A>(
  model: TerminalApplicationModel<A>,
  now: number,
  effects: TerminalApplicationEffect<A>[],
): TerminalApplicationModel<A> {
  let next = model;
  for (const [id, list] of Object.entries(model.lists)) {
    if (!list.pending || settleWindowOpen(model, list.latest, now)) continue;
    const settled: TerminalApplicationListModel<A> = {
      ...list,
      settled: list.latest,
      display: list.latest,
      pending: false,
    };
    next = replaceList(
      next,
      id,
      reconcileSelection(id, list, settled, effects, true),
    );
  }
  const message = visibleMessage(next);
  const after = message?.dismiss?.afterMs;
  if (
    message !== undefined && after !== undefined &&
    next.messageSince !== undefined && now - next.messageSince >= after
  ) {
    effects.push({
      kind: "dismiss",
      target: { message: message.id },
      via: "timeout",
    });
    next = { ...next, dismissed: [...next.dismissed, message.id] };
  }
  return next;
}

/** The message the screen shows: the view's, unless it was dismissed. */
export function visibleMessage<A>(
  model: TerminalApplicationModel<A>,
): MessageLine | undefined {
  const message = model.view.message;
  return message === undefined || model.dismissed.includes(message.id)
    ? undefined
    : message;
}

/**
 * The next time something is due without input: a settle window closing, a
 * message timing out, or a busy liveness becoming visible.
 */
export function terminalApplicationDeadline<A>(
  model: TerminalApplicationModel<A>,
  now: number,
): number | undefined {
  const deadlines: number[] = [];
  for (const list of Object.values(model.lists)) {
    if (list.pending && model.lastKeyAt !== undefined) {
      deadlines.push(
        model.lastKeyAt + (list.latest.settleMs ?? DEFAULT_LIST_SETTLE_MS),
      );
    }
  }
  const message = visibleMessage(model);
  if (
    message?.dismiss?.afterMs !== undefined && model.messageSince !== undefined
  ) deadlines.push(model.messageSince + message.dismiss.afterMs);
  const liveness = model.view.header.liveness;
  const reveal = model.busySince === undefined
    ? undefined
    : model.busySince + (liveness?.busyAfterMs ?? 0);
  if (liveness?.state === "busy" && reveal !== undefined && reveal > now) {
    deadlines.push(reveal);
  }
  return deadlines.length === 0 ? undefined : Math.min(...deadlines);
}

/** Select a row by index in the body list, keeping the model's other state. */
function selectRow<A>(
  model: TerminalApplicationModel<A>,
  listId: string,
  rows: ListRows<A>,
  index: number,
): TerminalApplicationModel<A> {
  const list = model.lists[listId];
  const key = rowKey(rows.rows[index]);
  if (list === undefined || key === undefined) return model;
  const { anchor: _anchor, ...rest } = list;
  return replaceList(model, listId, { ...rest, selection: key });
}

function revealItem<A>(
  model: TerminalApplicationModel<A>,
  listId: string,
  itemId: string,
  reveal: boolean,
): TerminalApplicationModel<A> {
  let list = model.lists[listId];
  if (list === undefined) return model;
  if (groupOfItem(list.display, itemId) === undefined && list.pending) {
    list = {
      ...list,
      settled: list.latest,
      display: list.latest,
      pending: false,
    };
  }
  const group = groupOfItem(list.display, itemId);
  if (group === undefined) return model;
  if (reveal) {
    list = {
      ...list,
      folds: list.folds.filter((id) => id !== group),
      ...(list.density === undefined ? {} : {
        density: {
          ...list.density,
          densityFolds: list.density.densityFolds.filter((id) => id !== group),
        },
      }),
    };
  }
  const { anchor: _anchor, ...rest } = list;
  const selected = { ...rest, selection: itemKey(itemId) };
  if (rowIndexForKey(listModelRows(selected).rows, selected.selection) < 0) {
    return model;
  }
  return replaceList(
    { ...model, primaryFocused: false },
    listId,
    selected,
  );
}

/** Unfold every group a fold row holds, keeping the selection on its first row. */
function unfold<A>(
  model: TerminalApplicationModel<A>,
  listId: string,
  groups: readonly string[],
): TerminalApplicationModel<A> {
  const list = model.lists[listId];
  if (list === undefined) return model;
  const opened: TerminalApplicationListModel<A> = {
    ...list,
    reveal: groups,
    folds: list.folds.filter((id) => !groups.includes(id)),
    ...(list.density === undefined ? {} : {
      density: {
        ...list.density,
        densityFolds: list.density.densityFolds.filter((id) =>
          !groups.includes(id)
        ),
      },
    }),
  };
  const rows = listModelRows(opened);
  if (rowIndexForKey(rows.rows, opened.selection) >= 0) {
    return replaceList(model, listId, opened);
  }
  const start = rows.rows.findIndex((row) =>
    rowGroupIds(row).some((id) => groups.includes(id))
  );
  return selectRow(
    replaceList(model, listId, opened),
    listId,
    rows,
    firstSelectable(rows.rows, start),
  );
}

function filterAfterEdit<A>(
  model: TerminalApplicationModel<A>,
  listId: string,
  filter: TerminalApplicationFilter | undefined,
): TerminalApplicationModel<A> {
  const list = model.lists[listId];
  if (list === undefined) return model;
  const { filter: _old, anchor: _anchor, ...rest } = list;
  const next: TerminalApplicationListModel<A> = filter === undefined
    ? { ...rest, scroll: 0 }
    : { ...rest, filter, scroll: 0 };
  const rows = listModelRows(next);
  if (rowIndexForKey(rows.rows, next.selection) >= 0) {
    return replaceList(model, listId, next);
  }
  const first = rows.rows.findIndex((row) => row.kind === "item");
  return selectRow(
    replaceList(model, listId, next),
    listId,
    rows,
    first >= 0 ? first : firstSelectable(rows.rows),
  );
}

interface KeyStep<A> {
  readonly model: TerminalApplicationModel<A>;
  readonly effects: TerminalApplicationEffect<A>[];
}

/** Keys while a filter field owns input. */
function filterKey<A>(
  model: TerminalApplicationModel<A>,
  listId: string,
  filter: TerminalApplicationFilter,
  key: TerminalKey,
  step: KeyStep<A>,
): TerminalApplicationModel<A> {
  const chord = keyChordOf(key);
  if (chord === "escape") return filterAfterEdit(model, listId, undefined);
  if (chord === "enter") {
    return filterAfterEdit(
      model,
      listId,
      filter.query.trim() === "" ? undefined : { ...filter, editing: false },
    );
  }
  if (
    chord === "up" || chord === "down" || chord === "page-up" ||
    chord === "page-down" || chord === "shift-up" || chord === "shift-down" ||
    chord === "tab" || chord === "shift-tab"
  ) {
    return navigate(model, listId, chord);
  }
  const binding = chord === undefined
    ? undefined
    : model.keymap.base.get(chord);
  if (binding?.inFields === true) {
    step.effects.push({
      kind: "action",
      action: binding.action,
      source: "key",
    });
    return model;
  }
  const editor = new GraphemeTextEditor(filter.query);
  editor.moveCursorTo(Math.min(filter.cursor, editor.value.length));
  editor.handle(key);
  return filterAfterEdit(model, listId, {
    query: editor.value,
    cursor: editor.cursor,
    editing: true,
  });
}

function scrollDetail<A>(
  model: TerminalApplicationModel<A>,
  itemId: string | undefined,
  delta: number,
): TerminalApplicationModel<A> {
  if (itemId === undefined) return model;
  const current = model.detailScroll[itemId] ?? 0;
  return {
    ...model,
    detailScroll: {
      ...model.detailScroll,
      [itemId]: Math.max(0, current + delta),
    },
  };
}

/** Navigation keys a list understands, whether or not a filter owns input. */
function navigate<A>(
  model: TerminalApplicationModel<A>,
  listId: string,
  chord: string,
): TerminalApplicationModel<A> {
  const list = model.lists[listId];
  if (list === undefined) return model;
  const rows = listModelRows(list);
  const geometry = model.geometry;
  const detailVisible = geometry !== undefined && geometry.detailRows > 0;
  const itemsOnly = list.zoomed;
  const at = rowIndexForKey(rows.rows, list.selection);
  const page = Math.max(1, (geometry?.listRows ?? 2) - 2);
  const detailPage = Math.max(1, (geometry?.detailRows ?? 2) - 2);
  const itemId = keyItemId(list.selection);
  if (model.view.body.kind === "empty") {
    if (chord === "down" && model.primaryFocused) {
      const first = firstSelectable(rows.rows);
      return first < 0
        ? model
        : selectRow({ ...model, primaryFocused: false }, listId, rows, first);
    }
    if (
      chord === "up" && !model.primaryFocused &&
      firstSelectable(rows.rows) === at
    ) return { ...model, primaryFocused: true };
    if (model.primaryFocused) return model;
  }
  switch (chord) {
    case "up":
    case "down": {
      const from = at < 0 ? -1 : at;
      const next = stepSelection(
        rows.rows,
        from,
        chord === "up" ? -1 : 1,
        itemsOnly,
      );
      return next === at ? model : selectRow(model, listId, rows, next);
    }
    case "home":
      return selectRow(
        model,
        listId,
        rows,
        firstSelectable(rows.rows, 0, itemsOnly),
      );
    case "end":
      return selectRow(
        model,
        listId,
        rows,
        lastSelectable(rows.rows, rows.rows.length, itemsOnly),
      );
    case "tab":
    case "shift-tab":
      return selectRow(
        model,
        listId,
        rows,
        jumpGroup(rows.rows, at, chord === "tab" ? 1 : -1, itemsOnly),
      );
    case "page-up":
    case "page-down":
      if (detailVisible) {
        return scrollDetail(
          model,
          itemId,
          chord === "page-up" ? -detailPage : detailPage,
        );
      }
      return selectRow(
        model,
        listId,
        rows,
        stepSelection(rows.rows, at, chord === "page-up" ? -page : page),
      );
    case "shift-up":
    case "shift-down":
      return detailVisible
        ? scrollDetail(model, itemId, chord === "shift-up" ? -1 : 1)
        : model;
    default:
      return model;
  }
}

/** Enter on the selected row: run an item, fold or unfold a group. */
function enter<A>(
  model: TerminalApplicationModel<A>,
  step: KeyStep<A>,
): TerminalApplicationModel<A> {
  const body = model.view.body;
  if (body.kind === "empty" && model.primaryFocused) {
    if (body.primary.action !== undefined) {
      step.effects.push({
        kind: "action",
        action: body.primary.action,
        source: "enter",
      });
    }
    return model;
  }
  const listView = bodyList(model.view);
  const list = listView === undefined ? undefined : model.lists[listView.id];
  if (listView === undefined || list === undefined) return model;
  const rows = listModelRows(list);
  const row = rows.rows[rowIndexForKey(rows.rows, list.selection)];
  if (row === undefined || row.kind === "blank") return model;
  if (row.kind === "item") {
    if (row.item.primary !== undefined) {
      step.effects.push({
        kind: "action",
        action: row.item.primary,
        source: "enter",
      });
    }
    return model;
  }
  if (row.kind === "fold") {
    return unfold(
      model,
      listView.id,
      row.groups.map((folded) => folded.group.id),
    );
  }
  if (row.group.foldable !== true) return model;
  return replaceList(model, listView.id, {
    ...list,
    folds: [...list.folds, row.group.id],
  });
}

/** Escape closes the nearest thing: a filter, zoom, then a message. */
function escape<A>(
  model: TerminalApplicationModel<A>,
  step: KeyStep<A>,
): TerminalApplicationModel<A> {
  const listView = bodyList(model.view);
  const list = listView === undefined ? undefined : model.lists[listView.id];
  if (listView !== undefined && list?.filter !== undefined) {
    return filterAfterEdit(model, listView.id, undefined);
  }
  if (listView !== undefined && list?.zoomed === true) {
    return replaceList(model, listView.id, { ...list, zoomed: false });
  }
  const message = visibleMessage(model);
  if (message !== undefined) {
    step.effects.push({
      kind: "dismiss",
      target: { message: message.id },
      via: "escape",
    });
    return { ...model, dismissed: [...model.dismissed, message.id] };
  }
  const binding = model.keymap.base.get("escape");
  if (binding !== undefined) {
    step.effects.push({
      kind: "action",
      action: binding.action,
      source: "key",
    });
  }
  return model;
}

function readingKey<A>(
  model: TerminalApplicationModel<A>,
  id: string,
  chord: string,
): TerminalApplicationModel<A> {
  const rows = Math.max(1, (model.geometry?.readingRows ?? 2) - 1);
  const current = model.readingScroll[id] ?? 0;
  const next = chord === "up"
    ? current - 1
    : chord === "down"
    ? current + 1
    : chord === "page-up"
    ? current - rows
    : chord === "page-down"
    ? current + rows
    : chord === "home"
    ? 0
    : chord === "end"
    ? Number.MAX_SAFE_INTEGER
    : current;
  return next === current ? model : {
    ...model,
    readingScroll: { ...model.readingScroll, [id]: Math.max(0, next) },
  };
}

/** Keys while the list (not a field) owns input. */
function baseKey<A>(
  model: TerminalApplicationModel<A>,
  key: TerminalKey,
  step: KeyStep<A>,
): TerminalApplicationModel<A> {
  const chord = keyChordOf(key);
  if (chord === undefined) return model;
  const listView = bodyList(model.view);
  const viKeys = model.keymap.viKeys;
  const reserved = reservedBaseChords(viKeys);
  const navigation = chord === "j" && viKeys
    ? "down"
    : chord === "k" && viKeys
    ? "up"
    : chord;
  if (chord === "escape") return escape(model, step);
  if (!reserved.has(chord)) {
    const binding = model.keymap.base.get(chord);
    if (binding !== undefined) {
      step.effects.push({
        kind: "action",
        action: binding.action,
        source: "key",
      });
    }
    return model;
  }
  if (model.view.body.kind === "reading") {
    return readingKey(model, model.view.body.id, navigation);
  }
  if (navigation === "enter") return enter(model, step);
  if (listView === undefined) return model;
  const list = model.lists[listView.id];
  if (list === undefined) return model;
  if (navigation === "/") {
    if (listView.filter === undefined || model.primaryFocused) return model;
    const query = list.filter?.query ?? "";
    return replaceList(model, listView.id, {
      ...list,
      filter: { query, cursor: [...query].length, editing: true },
    });
  }
  if (navigation === "space") {
    const zoomable = model.view.body.kind === "master-detail" &&
      (list.zoomed || keyItemId(list.selection) !== undefined);
    return zoomable
      ? replaceList(model, listView.id, { ...list, zoomed: !list.zoomed })
      : model;
  }
  if (navigation === "left") {
    return list.zoomed
      ? replaceList(model, listView.id, { ...list, zoomed: false })
      : model;
  }
  return navigate(model, listView.id, navigation);
}

function keyTransition<A>(
  model: TerminalApplicationModel<A>,
  key: TerminalKey,
  step: KeyStep<A>,
): TerminalApplicationModel<A> {
  const chord = keyChordOf(key);
  if (chord === "ctrl-c") {
    const binding = model.keymap.base.get("ctrl-c");
    step.effects.push(
      binding === undefined
        ? { kind: "cancel" }
        : { kind: "action", action: binding.action, source: "key" },
    );
    return model;
  }
  const message = visibleMessage(model);
  let next = model;
  const listView = bodyList(model.view);
  const list = listView === undefined ? undefined : model.lists[listView.id];
  const filter = list?.filter;
  // Escape with nothing else to close dismisses the message itself.
  const escapeDismisses = chord === "escape" && filter === undefined &&
    list?.zoomed !== true;
  if (message?.dismiss?.onKey === true && !escapeDismisses) {
    step.effects.push({
      kind: "dismiss",
      target: { message: message.id },
      via: "key",
    });
    next = { ...next, dismissed: [...next.dismissed, message.id] };
  }
  if (listView !== undefined && filter?.editing === true) {
    return filterKey(next, listView.id, filter, key, step);
  }
  return baseKey(next, key, step);
}

/**
 * Apply one input. Keys move selection, folds, zoom, filter, and scroll;
 * bound keys and Enter become actions; time settles membership changes and
 * times out messages; a caller selection follows identity and may reveal.
 */
export function transitionTerminalApplication<A>(
  model: TerminalApplicationModel<A>,
  input: TerminalApplicationInput,
  now: number,
): TerminalApplicationTransition<A> {
  const effects: TerminalApplicationEffect<A>[] = [];
  let next: TerminalApplicationModel<A>;
  switch (input.kind) {
    case "key":
      next = keyTransition(
        { ...model, lastKeyAt: now },
        input.key,
        { model, effects },
      );
      break;
    case "time":
      next = applyTime(model, now, effects);
      break;
    case "select":
      next = revealItem(
        model,
        input.listId,
        input.itemId,
        input.reveal === true,
      );
      break;
  }
  next = applyTime(next, now, effects);
  selectionEffects(model, next, effects);
  return { model: next, effects: ordered(effects) };
}

/** The control that receives the next key. */
function focusedControl<A>(
  model: TerminalApplicationModel<A>,
): string | undefined {
  const body = model.view.body;
  if (body.kind === "reading") return body.id;
  if (body.kind === "empty" && model.primaryFocused) return "primary";
  const list = bodyList(model.view);
  if (list === undefined) return undefined;
  return model.lists[list.id]?.filter?.editing === true
    ? `${list.id}:filter`
    : list.id;
}

/** Project the model to the snapshot callers read. */
export function terminalApplicationState<A>(
  model: TerminalApplicationModel<A>,
): TerminalApplicationState {
  const lists: Record<string, TerminalApplicationListState> = {};
  for (const [id, list] of Object.entries(model.lists)) {
    const selectedId = keyItemId(list.selection);
    const selectedGroupId = keyGroupId(list.selection);
    lists[id] = Object.freeze({
      ...(selectedId === undefined ? {} : { selectedId }),
      ...(selectedGroupId === undefined ? {} : { selectedGroupId }),
      ...(list.filter === undefined ? {} : { filter: list.filter.query }),
      filtering: list.filter?.editing === true,
      folds: Object.freeze([...list.folds]),
      zoomed: list.zoomed,
      scroll: list.scroll,
    });
  }
  const focusedControlId = focusedControl(model);
  return Object.freeze({
    ...(focusedControlId === undefined ? {} : { focusedControlId }),
    lists: Object.freeze(lists),
    detailScroll: Object.freeze({ ...model.detailScroll }),
    readingScroll: Object.freeze({ ...model.readingScroll }),
    fields: Object.freeze({}),
    fullyRead: Object.freeze({}),
  });
}
