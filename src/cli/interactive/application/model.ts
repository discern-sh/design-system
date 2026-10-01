/**
 * Pure application state. A model adopts immutable views, applies one input
 * at a time, and reports the caller callbacks each step owes in a fixed
 * order. Geometry-dependent decisions — density, list width, scroll — are
 * settled by the renderer, which returns the model it fitted.
 *
 * @module
 */

import { GraphemeTextEditor } from "../editor.ts";
import type { TerminalKey, TerminalMouseEvent } from "../keys.ts";
import {
  type CompiledBinding,
  type CompiledKeymap,
  compileKeymap,
  keyChordOf,
  terminalApplicationReservedKeys,
} from "./keymap.ts";
import {
  adoptLayerModel,
  createLayerModel,
  formField,
  layerFieldValues,
  layerKey,
  type LayerStepContext,
  type TerminalApplicationLayerModel,
} from "./layer-model.ts";
import { isTextControl } from "./layer-controls.ts";
import type { ApplicationLayer, ApplicationReader } from "./layer-view.ts";
import type { ApplicationHit } from "./hits.ts";
import { mouseTransition } from "./mouse.ts";
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
  type ViewRuleContext,
} from "./validate.ts";
import { fieldText } from "./validate-rules.ts";
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
export interface ModelGeometry {
  readonly layout: TerminalApplicationLayout;
  readonly listRows: number;
  /** Rows of a detail column or zoom; 0 while the detail is a strip or absent. */
  readonly detailRows: number;
  readonly readingRows: number;
}

/** A list's filter while it applies. */
export interface FilterState {
  readonly query: string;
  readonly cursor: number;
  /** Whether the filter field owns input. */
  readonly editing: boolean;
}

/** Fitting decisions made on resize and membership change only. */
export interface DensityDecision {
  /** The geometry and membership the decision was made for. */
  readonly key: string;
  readonly separators: boolean;
  readonly densityFolds: readonly string[];
  /** The list's width beside a detail column. */
  readonly width?: number;
}

/** Everything the package remembers about one list, by its id. */
export interface ListModel<A> {
  /** The newest list the caller supplied. */
  readonly latest: GroupedList<A>;
  /** The list whose membership and order are on screen. */
  readonly settled: GroupedList<A>;
  /** The settled membership with the newest content. */
  readonly display: GroupedList<A>;
  /** Whether a membership change waits for the settle window. */
  readonly pending: boolean;
  readonly selection?: ListRowKey;
  readonly filter?: FilterState;
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
  readonly density?: DensityDecision;
}

/**
 * The package's complete application state: the adopted view, the caller's
 * bindings, and everything navigation owns. Package-internal: callers hold
 * it sealed inside a {@linkcode TerminalApplicationModel}.
 */
export interface ModelState<A> {
  readonly view: TerminalApplicationView<A>;
  readonly keymap: CompiledKeymap<A>;
  readonly lists: Readonly<Record<string, ListModel<A>>>;
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
  /** Message ids reported dismissed that the view still declares; they stay hidden. */
  readonly dismissed: readonly string[];
  /** Open layers by id. */
  readonly layers: Readonly<Record<string, TerminalApplicationLayerModel>>;
  /** Layer ids reported dismissed that the view still declares; they stay hidden. */
  readonly dismissedLayers: readonly string[];
  /** When mouse input turned on, while its selection hint shows. */
  readonly mouseHintSince?: number;
  readonly geometry?: ModelGeometry;
  /** Where the last frame put each clickable thing. */
  readonly hits?: readonly ApplicationHit[];
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

/** One open layer's navigation state as callers read it. */
export interface TerminalApplicationLayerState {
  /**
   * The layer's focused control: `button:<id>`, `field:<id>`,
   * `disclosure:<id>`, `group:<id>`, `item:<id>`, `unavailable` or
   * `unavailable:<id>`, `filter` while a menu filter owns input, `input` for
   * a palette's query, `rows` for a reader's rows, or `body`.
   */
  readonly focusedControlId: string;
  /** The highlighted palette item. */
  readonly highlightedId?: string;
  /** A palette's or menu's query. */
  readonly query: string;
  /** Open disclosures and field groups. */
  readonly open: readonly string[];
  readonly scroll: number;
}

/** A read-only snapshot of what the package owns, for building views and saving preferences. */
export interface TerminalApplicationState {
  /** The topmost open layer, when one is open. */
  readonly topLayerId?: string;
  /**
   * What receives the next key: inside the top layer, `<layer>:<control>`;
   * otherwise the list, `<list>:filter`, `primary`, or a reading id.
   */
  readonly focusedControlId?: string;
  readonly lists: Readonly<Record<string, TerminalApplicationListState>>;
  /** Detail scroll by item id. */
  readonly detailScroll: Readonly<Record<string, number>>;
  /** Reading scroll by body id. */
  readonly readingScroll: Readonly<Record<string, number>>;
  /** Open layers by id. */
  readonly layers: Readonly<Record<string, TerminalApplicationLayerState>>;
  /** Field values by layer, then field. */
  readonly fields: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** Whether each sheet's body has been read to its end in this review. */
  readonly fullyRead: Readonly<Record<string, boolean>>;
  /**
   * Messages and layers reported dismissed that the view in force still
   * declares; they stay hidden, and the caller's next view must omit them.
   */
  readonly dismissed: TerminalApplicationDismissed;
}

/** Message and layer ids reported dismissed and still declared. */
export interface TerminalApplicationDismissed {
  readonly messages: readonly string[];
  readonly layers: readonly string[];
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

/** What a dismissal closed: a message or a layer, by id. */
export type TerminalApplicationDismissTarget =
  | { readonly message: string }
  | { readonly layer: string };

/**
 * One caller callback a step owes. A step's effects are ordered: field
 * changes, selection moves and changes, then dismissals, then actions.
 */
export type TerminalApplicationEffect<A> =
  | {
    readonly kind: "field";
    readonly layerId: string;
    readonly fieldId: string;
    readonly value: string;
  }
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
    readonly target: TerminalApplicationDismissTarget;
    readonly via: TerminalApplicationDismissal;
  }
  | {
    readonly kind: "action";
    readonly action: A;
    readonly source: TerminalApplicationActionSource;
  }
  | { readonly kind: "cancel" };

/** One step's new model state and the callbacks it owes, in order. */
export interface ModelStep<A> {
  readonly model: ModelState<A>;
  readonly effects: readonly TerminalApplicationEffect<A>[];
}

let openModel: <A>(model: TerminalApplicationModel<A>) => ModelState<A>;
let sealModel: <A>(state: ModelState<A>) => TerminalApplicationModel<A>;

/**
 * An application's complete state: the adopted view, the caller's bindings,
 * and everything navigation owns. It is opaque and immutable; only the
 * package's functions read or advance it, and callers read the public
 * projection with {@linkcode terminalApplicationState}.
 */
export class TerminalApplicationModel<A> {
  readonly #state: ModelState<A>;
  private constructor(state: ModelState<A>) {
    this.#state = state;
  }
  static {
    openModel = <B>(model: TerminalApplicationModel<B>) => model.#state;
    sealModel = <B>(state: ModelState<B>) =>
      new TerminalApplicationModel(state);
  }
}

/** The state a sealed model holds. Package-internal. */
export function modelState<A>(
  model: TerminalApplicationModel<A>,
): ModelState<A> {
  return openModel(model);
}

/** Seal model state for callers. Package-internal. */
export function sealModelState<A>(
  state: ModelState<A>,
): TerminalApplicationModel<A> {
  return sealModel(state);
}

/** One step's new model and the callbacks it owes, in order. */
export interface TerminalApplicationTransition<A> {
  readonly model: TerminalApplicationModel<A>;
  readonly effects: readonly TerminalApplicationEffect<A>[];
}

function sealStep<A>(step: ModelStep<A>): TerminalApplicationTransition<A> {
  return { model: sealModel(step.model), effects: step.effects };
}

/**
 * Start an application model from its first view. The transition's effects
 * hold the initial selection change. A view or keymap that breaks a rule
 * throws a `TypeError` before anything is shown.
 */
export function createTerminalApplicationModel<A>(
  view: TerminalApplicationView<A>,
  config: TerminalApplicationConfig<A> = {},
  now = 0,
): TerminalApplicationTransition<A> {
  return sealStep(createModelState(view, config, now));
}

/**
 * Adopt a replacement view. Selection follows item identity; membership and
 * order changes wait for the settle window while keys are being pressed. A
 * view that breaks a rule throws a `TypeError`.
 */
export function updateTerminalApplication<A>(
  model: TerminalApplicationModel<A>,
  view: TerminalApplicationView<A>,
  now: number,
): TerminalApplicationTransition<A> {
  return sealStep(updateModelState(openModel(model), view, now));
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
  return sealStep(transitionModelState(openModel(model), input, now));
}

/** The read-only snapshot callers read: selection, focus, fields, and more. */
export function terminalApplicationState<A>(
  model: TerminalApplicationModel<A>,
): TerminalApplicationState {
  return snapshotModelState(openModel(model));
}

/**
 * The next time something is due without input: a settle window closing, a
 * message timing out, or a busy liveness becoming visible.
 */
export function terminalApplicationDeadline<A>(
  model: TerminalApplicationModel<A>,
  now: number,
): number | undefined {
  return modelStateDeadline(openModel(model), now);
}

/** Input the model applies one at a time. */
export type TerminalApplicationInput =
  | { readonly kind: "key"; readonly key: TerminalKey }
  /** A click or wheel turn, applied only while the view asks for mouse input. */
  | { readonly kind: "mouse"; readonly event: TerminalMouseEvent }
  /** Time has passed: settle windows, message timeouts. */
  | { readonly kind: "time" }
  /** The caller selects an item; `reveal` unfolds its group. */
  | {
    readonly kind: "select";
    readonly listId: string;
    readonly itemId: string;
    readonly reveal?: boolean;
  }
  /** The caller writes a field's value, such as text an external editor returned. */
  | {
    readonly kind: "field";
    readonly layerId: string;
    readonly fieldId: string;
    readonly value: string;
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
  field: 0,
  "selection-moved": 1,
  "selection-change": 2,
  dismiss: 3,
  action: 4,
  cancel: 5,
};

/** How long the selection hint shows after mouse input turns on. */
export const MOUSE_HINT_MS = 6000;

function ordered<A>(
  effects: readonly TerminalApplicationEffect<A>[],
): readonly TerminalApplicationEffect<A>[] {
  return [...effects].sort((left, right) =>
    EFFECT_ORDER[left.kind] - EFFECT_ORDER[right.kind]
  );
}

/** The layers on screen, bottom to top: the view's, less any dismissed. */
export function visibleLayers<A>(
  model: Pick<ModelState<A>, "view" | "dismissedLayers">,
): readonly ApplicationLayer<A>[] {
  const layers = model.view.layers ?? [];
  return model.dismissedLayers.length === 0
    ? layers
    : layers.filter((layer) => !model.dismissedLayers.includes(layer.id));
}

/** The layer that owns focus, if one is open. */
export function topLayer<A>(
  model: Pick<ModelState<A>, "view" | "dismissedLayers">,
): ApplicationLayer<A> | undefined {
  return visibleLayers(model).at(-1);
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
  list: ListModel<A>,
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
  before: ListModel<A> | undefined,
  after: ListModel<A>,
  effects: TerminalApplicationEffect<A>[],
  report: boolean,
): ListModel<A> {
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
  list: ListModel<A>,
  selection: ListRowKey | undefined,
): ListModel<A> {
  if (selection === list.selection) return list;
  const { selection: _previous, ...rest } = list;
  return selection === undefined ? rest : { ...rest, selection };
}

/** Adopt one list version, deferring membership changes inside the settle window. */
function adoptList<A>(
  previous: ListModel<A> | undefined,
  list: GroupedList<A>,
  settleDeferred: boolean,
): ListModel<A> {
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
  model: ModelState<A> | undefined,
  list: GroupedList<A>,
  now: number,
): boolean {
  return model?.lastKeyAt !== undefined &&
    now - model.lastKeyAt < (list.settleMs ?? DEFAULT_LIST_SETTLE_MS);
}

/** The rows of each visible reader, which hold selections of their own. */
function readerLists<A>(
  layers: readonly ApplicationLayer<A>[],
): readonly GroupedList<A>[] {
  return layers.flatMap((layer) =>
    layer.kind === "reader" && layer.rows !== undefined ? [layer.rows] : []
  );
}

/** The selected item id of the body's list and of each reader's rows. */
function selectedItems<A>(
  model: ModelState<A>,
): ReadonlyMap<string, string | undefined> {
  const selected = new Map<string, string | undefined>();
  const list = bodyList(model.view);
  if (list !== undefined) {
    selected.set(
      list.id,
      model.view.body.kind === "empty" && model.primaryFocused
        ? undefined
        : keyItemId(model.lists[list.id]?.selection),
    );
  }
  for (const rows of readerLists(visibleLayers(model))) {
    selected.set(rows.id, keyItemId(model.lists[rows.id]?.selection));
  }
  return selected;
}

function selectionEffects<A>(
  before: ModelState<A> | undefined,
  after: ModelState<A>,
  effects: TerminalApplicationEffect<A>[],
): void {
  const was = before === undefined ? undefined : selectedItems(before);
  for (const [listId, itemId] of selectedItems(after)) {
    if (was?.has(listId) === true && was.get(listId) === itemId) continue;
    effects.push({
      kind: "selection-change",
      listId,
      ...(itemId === undefined ? {} : { itemId }),
    });
  }
}

function messageTiming<A>(
  previous: ModelState<A> | undefined,
  message: MessageLine | undefined,
  now: number,
): number | undefined {
  if (message === undefined) return undefined;
  return previous?.view.message?.id === message.id &&
      previous.messageSince !== undefined
    ? previous.messageSince
    : now;
}

/**
 * Dismissed ids a view still declares. They stay hidden; a view adopted
 * while an input's callbacks still run may declare them, because the caller
 * may not have heard of every dismissal yet.
 */
function stillDeclared<A>(
  previous: ModelState<A> | undefined,
  view: TerminalApplicationView<A>,
): {
  readonly messages: readonly string[];
  readonly layers: readonly string[];
} {
  const layerIds = new Set((view.layers ?? []).map((layer) => layer.id));
  return {
    messages: (previous?.dismissed ?? []).filter((id) =>
      view.message?.id === id
    ),
    layers: (previous?.dismissedLayers ?? []).filter((id) => layerIds.has(id)),
  };
}

/**
 * How a view is adopted. `final` refuses a view that still declares a
 * dismissed message or layer; `provisional` keeps such ids hidden until a
 * later view omits them, for views supplied while one input's callbacks run.
 */
export type ViewAdoption = "final" | "provisional";

function adopt<A>(
  previous: ModelState<A> | undefined,
  view: TerminalApplicationView<A>,
  keymap: CompiledKeymap<A>,
  now: number,
  adoption: ViewAdoption = "final",
): ModelStep<A> {
  const declared = stillDeclared(previous, view);
  const context: ViewRuleContext<A> = {
    ...(adoption === "final"
      ? {
        dismissedMessages: declared.messages,
        dismissedLayers: declared.layers,
      }
      : {}),
    keymap,
  };
  assertTerminalApplicationView(view, context);
  const effects: TerminalApplicationEffect<A>[] = [];
  const lists = { ...previous?.lists };
  const list = bodyList(view);
  const viewLayers = view.layers ?? [];
  for (
    const adopted of [
      ...(list === undefined ? [] : [list]),
      ...readerLists(viewLayers),
    ]
  ) {
    const before = lists[adopted.id];
    const next = adoptList(
      before,
      adopted,
      settleWindowOpen(previous, adopted, now),
    );
    lists[adopted.id] = reconcileSelection(
      adopted.id,
      before,
      next,
      effects,
      before !== undefined,
    );
  }
  const layers: Record<string, TerminalApplicationLayerModel> = {};
  for (const layer of viewLayers) {
    const before = previous?.layers[layer.id];
    layers[layer.id] = before === undefined
      ? createLayerModel(layer)
      : adoptLayerModel(before, layer);
  }
  const mouse = view.input?.mouse === true;
  const mouseHintSince = !mouse
    ? undefined
    : previous?.view.input?.mouse === true
    ? previous.mouseHintSince
    : now;
  const busy = view.header.liveness?.state === "busy";
  const busySince = busy
    ? previous?.view.header.liveness?.state === "busy"
      ? previous.busySince ?? now
      : now
    : undefined;
  const messageSince = messageTiming(previous, view.message, now);
  const model: ModelState<A> = {
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
    dismissed: declared.messages,
    layers,
    dismissedLayers: declared.layers,
    ...(mouseHintSince === undefined ? {} : { mouseHintSince }),
    ...(previous?.geometry === undefined
      ? {}
      : { geometry: previous.geometry }),
    ...(previous?.hits === undefined ? {} : { hits: previous.hits }),
  };
  selectionEffects(previous, model, effects);
  return { model, effects: ordered(effects) };
}

/**
 * Start an application model from its first view. The transition's effects
 * hold the initial selection change.
 */
export function createModelState<A>(
  view: TerminalApplicationView<A>,
  config: TerminalApplicationConfig<A> = {},
  now = 0,
): ModelStep<A> {
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
export function updateModelState<A>(
  model: ModelState<A>,
  view: TerminalApplicationView<A>,
  now: number,
): ModelStep<A> {
  return adopt(model, view, model.keymap, now);
}

/**
 * Adopt a view supplied while one input's callbacks still run. A dismissed
 * message or layer it still declares stays hidden instead of failing, since
 * a later callback of the same input may be the one that reports it; once
 * the callbacks finish, {@linkcode assertDismissalsHonoured} checks the view
 * that stands.
 */
export function updateModelStateProvisionally<A>(
  model: ModelState<A>,
  view: TerminalApplicationView<A>,
  now: number,
): ModelStep<A> {
  return adopt(model, view, model.keymap, now, "provisional");
}

/**
 * Throw unless the view in force omits every message and layer reported
 * dismissed: the rule a view supplied in answer to a dismissal must keep.
 */
export function assertDismissalsHonoured<A>(
  model: ModelState<A>,
): void {
  if (model.dismissed.length === 0 && model.dismissedLayers.length === 0) {
    return;
  }
  assertTerminalApplicationView(model.view, {
    dismissedMessages: model.dismissed,
    dismissedLayers: model.dismissedLayers,
    keymap: model.keymap,
  });
}

/** Replace one list's model. */
export function replaceList<A>(
  model: ModelState<A>,
  id: string,
  list: ListModel<A>,
): ModelState<A> {
  return { ...model, lists: { ...model.lists, [id]: list } };
}

/** Apply settle windows and timed dismissals that are due. */
function applyTime<A>(
  model: ModelState<A>,
  now: number,
  effects: TerminalApplicationEffect<A>[],
): ModelState<A> {
  let next = model;
  for (const [id, list] of Object.entries(model.lists)) {
    if (!list.pending || settleWindowOpen(model, list.latest, now)) continue;
    const settled: ListModel<A> = {
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
  if (
    next.mouseHintSince !== undefined &&
    now - next.mouseHintSince >= MOUSE_HINT_MS
  ) {
    const { mouseHintSince: _shown, ...rest } = next;
    next = rest;
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
  model: ModelState<A>,
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
export function modelStateDeadline<A>(
  model: ModelState<A>,
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
  if (model.mouseHintSince !== undefined) {
    deadlines.push(model.mouseHintSince + MOUSE_HINT_MS);
  }
  const liveness = model.view.header.liveness;
  const reveal = model.busySince === undefined
    ? undefined
    : model.busySince + (liveness?.busyAfterMs ?? 0);
  if (liveness?.state === "busy" && reveal !== undefined && reveal > now) {
    deadlines.push(reveal);
  }
  return deadlines.length === 0 ? undefined : Math.min(...deadlines);
}

/** Select a row by index in a list, keeping the model's other state. */
export function selectRow<A>(
  model: ModelState<A>,
  listId: string,
  rows: ListRows<A>,
  index: number,
): ModelState<A> {
  const list = model.lists[listId];
  const key = rowKey(rows.rows[index]);
  if (list === undefined || key === undefined) return model;
  const { anchor: _anchor, ...rest } = list;
  return replaceList(model, listId, { ...rest, selection: key });
}

function revealItem<A>(
  model: ModelState<A>,
  listId: string,
  itemId: string,
  reveal: boolean,
): ModelState<A> {
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
  model: ModelState<A>,
  listId: string,
  groups: readonly string[],
): ModelState<A> {
  const list = model.lists[listId];
  if (list === undefined) return model;
  const opened: ListModel<A> = {
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
  model: ModelState<A>,
  listId: string,
  filter: FilterState | undefined,
): ModelState<A> {
  const list = model.lists[listId];
  if (list === undefined) return model;
  const { filter: _old, anchor: _anchor, ...rest } = list;
  const next: ListModel<A> = filter === undefined
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

/** The effects one input owes, collected as it applies. */
export interface KeyStep<A> {
  readonly model: ModelState<A>;
  readonly effects: TerminalApplicationEffect<A>[];
}

/** Keys while a filter field owns input. */
function filterKey<A>(
  model: ModelState<A>,
  listId: string,
  filter: FilterState,
  key: TerminalKey,
  step: KeyStep<A>,
): ModelState<A> {
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
  model: ModelState<A>,
  itemId: string | undefined,
  delta: number,
): ModelState<A> {
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
  model: ModelState<A>,
  listId: string,
  chord: string,
): ModelState<A> {
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
  model: ModelState<A>,
  step: KeyStep<A>,
): ModelState<A> {
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
  return listView === undefined
    ? model
    : enterRow(model, listView.id, step, "enter");
}

/** Run a list's selected item, or fold or unfold its selected group row. */
export function enterRow<A>(
  model: ModelState<A>,
  listId: string,
  step: KeyStep<A>,
  source: "enter" | "click",
): ModelState<A> {
  const list = model.lists[listId];
  if (list === undefined) return model;
  const rows = listModelRows(list);
  const row = rows.rows[rowIndexForKey(rows.rows, list.selection)];
  if (row === undefined || row.kind === "blank") return model;
  if (row.kind === "item") {
    if (row.item.primary !== undefined) {
      step.effects.push({ kind: "action", action: row.item.primary, source });
    }
    return model;
  }
  if (row.kind === "fold") {
    return unfold(
      model,
      listId,
      row.groups.map((folded) => folded.group.id),
    );
  }
  if (row.group.foldable !== true) return model;
  return replaceList(model, listId, {
    ...list,
    folds: [...list.folds, row.group.id],
  });
}

/** Escape closes the nearest thing: a filter, zoom, then a message. */
function escape<A>(
  model: ModelState<A>,
  step: KeyStep<A>,
): ModelState<A> {
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
  model: ModelState<A>,
  id: string,
  chord: string,
): ModelState<A> {
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
  model: ModelState<A>,
  key: TerminalKey,
  step: KeyStep<A>,
): ModelState<A> {
  const chord = keyChordOf(key);
  if (chord === undefined) return model;
  const listView = bodyList(model.view);
  const viKeys = model.keymap.viKeys;
  const reserved = new Set(
    terminalApplicationReservedKeys(model.view.body, { viKeys }),
  );
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

/**
 * What Ctrl+C does in every scope and at every size: the base binding's
 * action when one claims it, otherwise cancelling the session. Layers
 * cannot bind it, so it means one thing everywhere.
 */
export function interruptEffect<A>(
  model: ModelState<A>,
): TerminalApplicationEffect<A> {
  const binding = model.keymap.base.get("ctrl-c");
  return binding === undefined
    ? { kind: "cancel" }
    : { kind: "action", action: binding.action, source: "key" };
}

/**
 * The caller binding a key reaches in the scope in force — the top
 * layer's while one is open, else the base — skipping bindings that do not
 * apply in fields while a text field, a palette's query, or a filter owns
 * input. Navigation waits below the minimum size, but these still run.
 */
export function bindingInForce<A>(
  model: ModelState<A>,
  chord: string,
): CompiledBinding<A> | undefined {
  const layer = topLayer(model);
  if (layer === undefined) {
    const list = bodyList(model.view);
    const filtering = list !== undefined &&
      model.lists[list.id]?.filter?.editing === true;
    const binding = model.keymap.base.get(chord);
    return filtering && binding?.inFields !== true ? undefined : binding;
  }
  const stored = model.layers[layer.id];
  const inField = layer.kind === "palette" || stored?.filtering === true ||
    (stored !== undefined && isTextControl(layer, stored.focus));
  const binding = model.keymap.layers.get(layer.id)?.get(chord);
  return inField && binding?.inFields !== true ? undefined : binding;
}

function keyTransition<A>(
  model: ModelState<A>,
  key: TerminalKey,
  step: KeyStep<A>,
): ModelState<A> {
  const chord = keyChordOf(key);
  if (chord === "ctrl-c") {
    step.effects.push(interruptEffect(model));
    return model;
  }
  const message = visibleMessage(model);
  let next = model;
  const listView = bodyList(model.view);
  const list = listView === undefined ? undefined : model.lists[listView.id];
  const filter = list?.filter;
  const layer = topLayer(model);
  // Escape with nothing else to close dismisses the message itself.
  const escapeDismisses = chord === "escape" && layer === undefined &&
    filter === undefined && list?.zoomed !== true;
  if (message?.dismiss?.onKey === true && !escapeDismisses) {
    step.effects.push({
      kind: "dismiss",
      target: { message: message.id },
      via: "key",
    });
    next = { ...next, dismissed: [...next.dismissed, message.id] };
  }
  if (layer !== undefined) return layerStep(next, layer, key, step);
  if (listView !== undefined && filter?.editing === true) {
    return filterKey(next, listView.id, filter, key, step);
  }
  return baseKey(next, key, step);
}

/** Apply one key as if pressed, as a click on its key hint does. */
export function applyKey<A>(
  model: ModelState<A>,
  key: TerminalKey,
  step: KeyStep<A>,
): ModelState<A> {
  return keyTransition(model, key, step);
}

/** Replace one layer's model. */
export function replaceLayer<A>(
  model: ModelState<A>,
  layer: TerminalApplicationLayerModel,
): ModelState<A> {
  return { ...model, layers: { ...model.layers, [layer.id]: layer } };
}

/** Report a layer step's effects, hiding a dismissed layer at once. */
export function applyLayerEffects<A>(
  model: ModelState<A>,
  effects: LayerStepContext<A>["effects"],
  step: KeyStep<A>,
): ModelState<A> {
  let next = model;
  for (const effect of effects) {
    step.effects.push(effect);
    if (effect.kind === "dismiss") {
      next = {
        ...next,
        dismissedLayers: [...next.dismissedLayers, effect.target.layer],
      };
    }
  }
  return next;
}

/** Move between a reader's rows; undefined when the key is not row movement. */
function readerRowsKey<A>(
  model: ModelState<A>,
  layer: ApplicationReader<A>,
  key: TerminalKey,
  step: KeyStep<A>,
): ModelState<A> | undefined {
  const chord = keyChordOf(key);
  const listId = layer.rows?.id;
  const list = listId === undefined ? undefined : model.lists[listId];
  if (listId === undefined || list === undefined || chord === undefined) {
    return undefined;
  }
  const rows = listModelRows(list);
  const at = rowIndexForKey(rows.rows, list.selection);
  const page = Math.max(1, (model.layers[layer.id]?.page ?? 2) - 1);
  switch (chord) {
    case "up":
    case "shift-tab":
      return selectRow(model, listId, rows, stepSelection(rows.rows, at, -1));
    case "down":
    case "tab":
      return selectRow(model, listId, rows, stepSelection(rows.rows, at, 1));
    case "page-up":
    case "page-down":
      return selectRow(
        model,
        listId,
        rows,
        stepSelection(rows.rows, at, chord === "page-up" ? -page : page),
      );
    case "home":
      return selectRow(model, listId, rows, firstSelectable(rows.rows));
    case "end":
      return selectRow(model, listId, rows, lastSelectable(rows.rows));
    case "enter":
      return enterRow(model, listId, step, "enter");
    default:
      return undefined;
  }
}

/** Apply one key to the top layer. */
function layerStep<A>(
  model: ModelState<A>,
  layer: ApplicationLayer<A>,
  key: TerminalKey,
  step: KeyStep<A>,
): ModelState<A> {
  const stored = model.layers[layer.id];
  if (stored === undefined) return model;
  // A key ends any two-click confirmation a click began.
  const { armed: _armed, ...current } = stored;
  if (layer.kind === "reader") {
    const moved = readerRowsKey(model, layer, key, step);
    if (moved !== undefined) return moved;
  }
  const bindings = model.keymap.layers.get(layer.id);
  const context: LayerStepContext<A> = {
    ...(bindings === undefined ? {} : { bindings }),
    effects: [],
  };
  const next = layerKey(layer, current, key, context);
  return applyLayerEffects(replaceLayer(model, next), context.effects, step);
}

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

function graphemeCount(text: string): number {
  return [...graphemes.segment(text)].length;
}

/**
 * The caller writes a field's value; the cursor moves to its end. Text is
 * normalised as {@linkcode fieldText} describes; a choice field accepts
 * only an option that can be chosen, and anything else is a caller error.
 * A layer or field the view no longer shows is ignored, since it may have
 * closed while the caller worked.
 */
function writeField<A>(
  model: ModelState<A>,
  layerId: string,
  fieldId: string,
  value: string,
): ModelState<A> {
  const stored = model.layers[layerId];
  const layer = visibleLayers(model).find((open) => open.id === layerId);
  if (
    stored === undefined || layer === undefined || !(fieldId in stored.values)
  ) return model;
  const path = `fields.${layerId}.${fieldId}`;
  if (typeof value !== "string") throw new TypeError(`${path} must be text`);
  const field = layer.kind === "form" ? formField(layer, fieldId) : undefined;
  let written: string;
  if (field?.kind === "choice") {
    const option = field.options.find((candidate) => candidate.id === value);
    if (option === undefined || option.disabledReason !== undefined) {
      throw new TypeError(`${path} must name an option that can be chosen`);
    }
    written = value;
  } else {
    written = fieldText(
      value,
      field?.kind === "text" && field.multiline === true,
    );
  }
  return replaceLayer(model, {
    ...stored,
    values: { ...stored.values, [fieldId]: written },
    cursors: { ...stored.cursors, [fieldId]: graphemeCount(written) },
  });
}

/**
 * Apply one input. Keys move selection, folds, zoom, filter, and scroll;
 * bound keys and Enter become actions; time settles membership changes and
 * times out messages; a caller selection follows identity and may reveal.
 */
export function transitionModelState<A>(
  model: ModelState<A>,
  input: TerminalApplicationInput,
  now: number,
): ModelStep<A> {
  const effects: TerminalApplicationEffect<A>[] = [];
  let next: ModelState<A>;
  switch (input.kind) {
    case "key":
      next = keyTransition(
        withoutHint({ ...model, lastKeyAt: now }),
        input.key,
        { model, effects },
      );
      break;
    case "mouse":
      next = model.view.input?.mouse === true
        ? mouseTransition(withoutHint(model), input.event, { model, effects })
        : model;
      break;
    case "field":
      next = writeField(model, input.layerId, input.fieldId, input.value);
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

/** Hide the mouse selection hint: any input means the person has seen it. */
function withoutHint<A>(
  model: ModelState<A>,
): ModelState<A> {
  if (model.mouseHintSince === undefined) return model;
  const { mouseHintSince: _shown, ...rest } = model;
  return rest;
}

/** A layer's focused control, as its state reports it. */
function layerFocus(layer: TerminalApplicationLayerModel): string {
  return layer.filtering ? "filter" : layer.focus;
}

/** The control that receives the next key. */
function focusedControl<A>(
  model: ModelState<A>,
): string | undefined {
  const top = topLayer(model);
  const layer = top === undefined ? undefined : model.layers[top.id];
  if (top !== undefined && layer !== undefined) {
    return `${top.id}:${layerFocus(layer)}`;
  }
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
export function snapshotModelState<A>(
  model: ModelState<A>,
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
  const layers: Record<string, TerminalApplicationLayerState> = {};
  const fields: Record<string, Readonly<Record<string, string>>> = {};
  const fullyRead: Record<string, boolean> = {};
  for (const layer of visibleLayers(model)) {
    const state = model.layers[layer.id];
    if (state === undefined) continue;
    layers[layer.id] = Object.freeze({
      focusedControlId: layerFocus(state),
      ...(state.highlight === undefined
        ? {}
        : { highlightedId: state.highlight }),
      query: state.query,
      open: Object.freeze(
        Object.entries(state.open).flatMap(([id, open]) => open ? [id] : []),
      ),
      scroll: state.scroll,
    });
    const values = layerFieldValues(layer, state);
    if (Object.keys(values).length > 0) {
      fields[layer.id] = Object.freeze(values);
    }
    if (layer.kind === "sheet") fullyRead[layer.id] = state.fullyRead;
  }
  const top = topLayer(model);
  return Object.freeze({
    ...(top === undefined ? {} : { topLayerId: top.id }),
    ...(focusedControlId === undefined ? {} : { focusedControlId }),
    lists: Object.freeze(lists),
    detailScroll: Object.freeze({ ...model.detailScroll }),
    readingScroll: Object.freeze({ ...model.readingScroll }),
    layers: Object.freeze(layers),
    fields: Object.freeze(fields),
    fullyRead: Object.freeze(fullyRead),
    dismissed: Object.freeze({
      messages: Object.freeze([...model.dismissed]),
      layers: Object.freeze([...model.dismissedLayers]),
    }),
  });
}
