/**
 * Pure layer state: what the package remembers about each open layer — the
 * focused control, field values, disclosures, scroll, read progress — and
 * how one key moves it. Layer transitions report the same effects the base
 * list does; the application model routes keys here while a layer is open.
 *
 * @module
 */

import { GraphemeTextEditor } from "../editor.ts";
import type { TerminalKey } from "../keys.ts";
import { decodableChord, keyChordOf } from "./keymap.ts";
import {
  buttonControl,
  buttonRowShown,
  disclosureControl,
  formTextFields,
  initialControl,
  isTextControl,
  itemControl,
  layerButtons,
  type LayerControl,
  PALETTE_INPUT,
  parseControl,
  safeButton,
  sheetChallengeShown,
  tabOrder,
  UNAVAILABLE_SECTION,
  unavailableControl,
} from "./layer-controls.ts";
import { menuItem, menuRows, paletteRows } from "./layer-search.ts";
import type {
  ApplicationButton,
  ApplicationChoiceField,
  ApplicationDisclosure,
  ApplicationForm,
  ApplicationLayer,
  ApplicationLayerKind,
  ApplicationMenu,
  ApplicationPalette,
  ApplicationReader,
  ApplicationSheet,
  ApplicationSheetState,
  ApplicationTextField,
} from "./layer-view.ts";

/** Everything the package remembers about one open layer, by its id. */
export interface TerminalApplicationLayerModel {
  readonly id: string;
  readonly kind: ApplicationLayerKind;
  /** The control that receives the next key. */
  readonly focus: LayerControl;
  /** Field values by field id, including a sheet's challenge. */
  readonly values: Readonly<Record<string, string>>;
  /** Text cursors by field id, in graphemes. */
  readonly cursors: Readonly<Record<string, number>>;
  /** Open disclosures and field groups by id. */
  readonly open: Readonly<Record<string, boolean>>;
  /** The first scrolling line in the viewport. */
  readonly scroll: number;
  /** A control the next frame scrolls into view. */
  readonly reveal?: LayerControl;
  /**
   * Body lines that have been on screen in this review, as sorted,
   * disjoint `[start, end)` ranges of line indexes.
   */
  readonly seen: readonly (readonly [number, number])[];
  /** Whether every body line has been on screen since the review began. */
  readonly fullyRead: boolean;
  /** A palette's or menu filter's query and cursor. */
  readonly query: string;
  readonly queryCursor: number;
  /** Whether a menu's filter field owns input. */
  readonly filtering: boolean;
  /** The highlighted palette item. */
  readonly highlight?: string;
  /** Whether a menu shows its unavailable rows. */
  readonly unavailableOpen: boolean;
  /** An unavailable menu item whose sentence Enter revealed. */
  readonly why?: string;
  /** A confirm or destructive button a first click focused. */
  readonly armed?: string;
  /** The sheet state last adopted, so a new review resets read progress. */
  readonly state?: ApplicationSheetState;
  /** Scrolling rows in the last frame, for paging. */
  readonly page: number;
}

/** One caller callback a layer step owes. */
export type LayerEffect<A> =
  | {
    readonly kind: "field";
    readonly layerId: string;
    readonly fieldId: string;
    readonly value: string;
  }
  | {
    readonly kind: "dismiss";
    readonly target: { readonly layer: string };
    readonly via: "safe" | "escape" | "click-outside";
  }
  | {
    readonly kind: "action";
    readonly action: A;
    readonly source: "enter" | "key" | "menu" | "button" | "click";
  };

/** Bindings scoped to one layer, by normalised chord. */
export type LayerBindingTable<A> = ReadonlyMap<
  string,
  { readonly action: A; readonly inFields: boolean }
>;

/** What a layer step reads besides the layer itself. */
export interface LayerStepContext<A> {
  readonly bindings?: LayerBindingTable<A>;
  readonly effects: LayerEffect<A>[];
}

/** Whether a declared key, in any accepted spelling, is this decoded chord. */
export function sameChord(
  declared: string | undefined,
  chord: string,
): boolean {
  return declared !== undefined && decodableChord(declared) === chord;
}

const BLOCKING_STATES: ReadonlySet<ApplicationSheetState> = new Set([
  "loading",
  "changed",
  "gone",
]);

function disclosuresOf<A>(
  layer: ApplicationLayer<A>,
): readonly ApplicationDisclosure[] {
  return layer.kind === "sheet" || layer.kind === "form"
    ? layer.disclosures ?? []
    : [];
}

function initialValues<A>(
  layer: ApplicationLayer<A>,
): Readonly<Record<string, string>> {
  if (layer.kind === "sheet") {
    return layer.challenge === undefined
      ? {}
      : { [layer.challenge.fieldId]: "" };
  }
  if (layer.kind !== "form") return {};
  const values: Record<string, string> = {};
  for (const field of layer.fields) {
    const fields = field.kind === "group" ? field.fields : [field];
    for (const inner of fields) values[inner.id] = inner.initial;
  }
  return values;
}

function initialOpen<A>(
  layer: ApplicationLayer<A>,
): Readonly<Record<string, boolean>> {
  const open: Record<string, boolean> = {};
  for (const disclosure of disclosuresOf(layer)) {
    open[disclosure.id] = disclosure.initiallyOpen === true;
  }
  if (layer.kind === "form") {
    for (const field of layer.fields) {
      if (field.kind === "group") {
        open[field.id] = field.initiallyOpen === true;
      }
    }
  }
  return open;
}

/** The layer model for a layer that has just opened. */
export function createLayerModel<A>(
  layer: ApplicationLayer<A>,
): TerminalApplicationLayerModel {
  const open = initialOpen(layer);
  const values = initialValues(layer);
  const focus = initialControl(layer, (id) => open[id] === true);
  const cursors = Object.fromEntries(
    Object.entries(values).map(([id, value]) => [id, [...value].length]),
  );
  const menu = layer.kind === "menu";
  return {
    id: layer.id,
    kind: layer.kind,
    focus,
    // The first frame brings the initial control into view, so a challenge
    // below a long body takes keys only where the person can see it.
    reveal: focus,
    values,
    cursors,
    open,
    scroll: 0,
    seen: [],
    fullyRead: false,
    query: "",
    queryCursor: 0,
    filtering: false,
    ...(layer.kind === "palette"
      ? (() => {
        const first = paletteRows(layer, "").items[0];
        return first === undefined ? {} : { highlight: first.id };
      })()
      : {}),
    unavailableOpen: menu && focus === UNAVAILABLE_SECTION,
    ...(layer.kind === "sheet" ? { state: layer.state } : {}),
    page: 1,
  };
}

/** The controls a layer can focus now, for checking a remembered focus. */
function focusable<A>(
  layer: ApplicationLayer<A>,
  model: TerminalApplicationLayerModel,
): readonly LayerControl[] {
  switch (layer.kind) {
    case "sheet":
    case "form":
      return tabOrder(layer, (id) => model.open[id] === true);
    case "menu":
      return menuRows(layer, model.query, 1, model.unavailableOpen).order;
    case "palette":
      return [PALETTE_INPUT];
    case "reader":
      return [initialControl(layer, () => false)];
  }
}

/**
 * Whether a sheet in this state is under review: its body is the plan the
 * person answers. A `loading` sheet is not, so nothing it shows counts as
 * read, and a sheet entering or leaving `loading` starts its review over.
 */
export function sheetUnderReview(state: ApplicationSheetState): boolean {
  return state !== "loading";
}

/**
 * Adopt a new version of an open layer. Focus, values, disclosures, and
 * scroll stay; values for new fields start from their initial text; a
 * focused control that disappeared gives focus back to the layer's initial
 * control. A sheet entering or leaving `loading` starts its review over as
 * a new sheet starts it: nothing read, the challenge empty, focus on its
 * initial control, and the body at its top; only open disclosures stay.
 */
export function adoptLayerModel<A>(
  previous: TerminalApplicationLayerModel,
  layer: ApplicationLayer<A>,
): TerminalApplicationLayerModel {
  if (previous.kind !== layer.kind) return createLayerModel(layer);
  const fresh = createLayerModel(layer);
  const values: Record<string, string> = {};
  const cursors: Record<string, number> = {};
  for (const [id, value] of Object.entries(fresh.values)) {
    const kept = previous.values[id];
    const valid = kept !== undefined && validValue(layer, id, kept);
    values[id] = valid ? kept : value;
    cursors[id] = valid
      ? Math.min(previous.cursors[id] ?? 0, [...kept].length)
      : fresh.cursors[id] ?? 0;
  }
  const open: Record<string, boolean> = {};
  for (const [id, value] of Object.entries(fresh.open)) {
    open[id] = previous.open[id] ?? value;
  }
  // A two-click confirmation never outlives a change of the sheet's state
  // or the button it armed: the second click must answer the same review.
  const { armed, ...kept } = previous;
  const keepArm = armed !== undefined &&
    (layer.kind !== "sheet" || previous.state === layer.state) &&
    layerButtons(layer).some((button) => button.id === armed);
  let next: TerminalApplicationLayerModel = {
    ...kept,
    ...(keepArm ? { armed } : {}),
    values,
    cursors,
    open,
    ...(layer.kind === "sheet" ? { state: layer.state } : {}),
  };
  if (
    layer.kind === "sheet" && previous.state !== undefined &&
    sheetUnderReview(previous.state) !== sheetUnderReview(layer.state)
  ) {
    // A review starts clean: nothing read, typed, or focused against what
    // was on screen before carries over, so neither a stale keystroke nor
    // a body seen before the plan arrived can answer the plan.
    const challenge = layer.challenge?.fieldId;
    next = {
      ...next,
      seen: [],
      fullyRead: false,
      focus: fresh.focus,
      reveal: fresh.focus,
      scroll: 0,
      ...(challenge === undefined ? {} : {
        values: { ...next.values, [challenge]: "" },
        cursors: { ...next.cursors, [challenge]: 0 },
      }),
    };
  }
  if (!focusable(layer, next).includes(next.focus)) {
    next = { ...next, focus: fresh.focus, reveal: fresh.focus };
  }
  if (layer.kind === "palette") {
    const items = paletteRows(layer, next.query).items;
    if (!items.some((item) => item.id === next.highlight)) {
      const { highlight: _old, ...rest } = next;
      next = items[0] === undefined
        ? rest
        : { ...rest, highlight: items[0].id };
    }
  }
  return next;
}

function validValue<A>(
  layer: ApplicationLayer<A>,
  id: string,
  value: string,
): boolean {
  if (layer.kind !== "form") return true;
  const field = formField(layer, id);
  if (field?.kind !== "choice") return true;
  return field.options.some((option) =>
    option.id === value && option.disabledReason === undefined
  );
}

/** A form field by id, inside groups too. */
export function formField<A>(
  form: ApplicationForm<A>,
  id: string,
): ApplicationTextField<A> | ApplicationChoiceField | undefined {
  for (const field of form.fields) {
    if (field.kind === "group") {
      const inner = field.fields.find((candidate) => candidate.id === id);
      if (inner !== undefined) return inner;
    } else if (field.id === id) return field;
  }
  return undefined;
}

/** Whether a sheet needs its body read before confirming. */
export function requiresFullRead<A>(sheet: ApplicationSheet<A>): boolean {
  if (sheet.activity !== undefined) return false;
  return sheet.requireFullRead ??
    sheet.buttons.some((button) =>
      button.role === "confirm" || button.role === "destructive"
    );
}

/**
 * Whether a button can be activated now. The safe button always can. The
 * others need the caller's `enabled`, a sheet state that is not loading,
 * changed, or gone, a challenge that matches exactly, a body read to its
 * end before confirming, and a form's required fields filled.
 */
export function buttonEnabled<A>(
  layer: ApplicationLayer<A>,
  model: TerminalApplicationLayerModel,
  button: ApplicationButton<A>,
): boolean {
  if (button.role === "safe") return true;
  if (button.enabled === false) return false;
  const consequential = button.role === "confirm" ||
    button.role === "destructive";
  if (layer.kind === "sheet") {
    if (BLOCKING_STATES.has(layer.state)) return false;
    if (consequential && requiresFullRead(layer) && !model.fullyRead) {
      return false;
    }
    if (button.requiresChallenge === true) {
      const challenge = layer.challenge;
      if (
        challenge === undefined ||
        model.values[challenge.fieldId] !== challenge.mustEqual
      ) return false;
    }
  }
  if (layer.kind === "form" && consequential) {
    for (const field of formTextFields(layer)) {
      if (
        field.required === true && (model.values[field.id] ?? "").trim() === ""
      ) {
        return false;
      }
    }
  }
  return true;
}

function dismiss<A>(
  layer: ApplicationLayer<A>,
  via: "safe" | "escape" | "click-outside",
  step: LayerStepContext<A>,
): void {
  step.effects.push({ kind: "dismiss", target: { layer: layer.id }, via });
}

/**
 * Activate a button: the safe one dismisses, an enabled one runs its
 * action, a disabled one does nothing.
 */
export function activateButton<A>(
  layer: ApplicationLayer<A>,
  model: TerminalApplicationLayerModel,
  button: ApplicationButton<A>,
  source: "button" | "key" | "click",
  step: LayerStepContext<A>,
): TerminalApplicationLayerModel {
  const { armed: _armed, ...rest } = model;
  if (!buttonEnabled(layer, model, button)) return rest;
  if (button.role === "safe") {
    dismiss(layer, "safe", step);
    return rest;
  }
  if (button.action !== undefined) {
    step.effects.push({
      kind: "action",
      action: button.action,
      source: source === "key"
        ? "key"
        : source === "click"
        ? "click"
        : "button",
    });
  }
  return rest;
}

function focusOn(
  model: TerminalApplicationLayerModel,
  control: LayerControl,
): TerminalApplicationLayerModel {
  const { armed: _armed, ...rest } = model;
  return { ...rest, focus: control, reveal: control };
}

/** Move focus to the next or previous control, wrapping. */
function cycle<A>(
  layer: ApplicationLayer<A>,
  model: TerminalApplicationLayerModel,
  direction: 1 | -1,
): TerminalApplicationLayerModel {
  const order = tabOrder(layer, (id) => model.open[id] === true);
  if (order.length === 0) return model;
  const at = order.indexOf(model.focus);
  const next = at < 0
    ? direction > 0 ? 0 : order.length - 1
    : (at + direction + order.length) % order.length;
  const control = order[next];
  return control === undefined ? model : focusOn(model, control);
}

/** Move along the button row, stopping at its ends. */
function moveButton<A>(
  layer: ApplicationLayer<A>,
  model: TerminalApplicationLayerModel,
  direction: 1 | -1,
): TerminalApplicationLayerModel {
  const buttons = layerButtons(layer).map((button) => buttonControl(button.id));
  const at = buttons.indexOf(model.focus);
  if (at < 0) return model;
  const next =
    buttons[Math.max(0, Math.min(buttons.length - 1, at + direction))];
  return next === undefined || next === model.focus
    ? model
    : focusOn(model, next);
}

function toggleOpen(
  model: TerminalApplicationLayerModel,
  id: string,
  control: LayerControl,
): TerminalApplicationLayerModel {
  const opening = model.open[id] !== true;
  const next = { ...model, open: { ...model.open, [id]: opening } };
  return opening ? { ...next, reveal: control } : next;
}

function scrollBy(
  model: TerminalApplicationLayerModel,
  delta: number,
): TerminalApplicationLayerModel {
  const { reveal: _reveal, ...rest } = model;
  return { ...rest, scroll: Math.max(0, model.scroll + delta) };
}

/** Edit one text value with a decoded key, reporting a changed value. */
function editText(
  model: TerminalApplicationLayerModel,
  layerId: string,
  fieldId: string,
  key: TerminalKey,
  multiline: boolean,
  step: LayerStepContext<unknown>,
): TerminalApplicationLayerModel {
  const value = model.values[fieldId] ?? "";
  const editor = new GraphemeTextEditor(value);
  editor.moveCursorTo(Math.min(model.cursors[fieldId] ?? 0, [...value].length));
  editor.handle(key, { multiline });
  const next = {
    ...model,
    values: { ...model.values, [fieldId]: editor.value },
    cursors: { ...model.cursors, [fieldId]: editor.cursor },
  };
  if (editor.value !== value) {
    step.effects.push({
      kind: "field",
      layerId,
      fieldId,
      value: editor.value,
    });
  }
  return next;
}

/** Edit a palette's or menu filter's query. */
function editQuery(
  model: TerminalApplicationLayerModel,
  key: TerminalKey,
): TerminalApplicationLayerModel {
  const editor = new GraphemeTextEditor(model.query);
  editor.moveCursorTo(Math.min(model.queryCursor, [...model.query].length));
  editor.handle(key);
  return {
    ...model,
    query: editor.value,
    queryCursor: editor.cursor,
    scroll: editor.value === model.query ? model.scroll : 0,
  };
}

function binding<A>(
  step: LayerStepContext<A>,
  chord: string,
  inField: boolean,
): boolean {
  const found = step.bindings?.get(chord);
  if (found === undefined || (inField && !found.inFields)) return false;
  step.effects.push({ kind: "action", action: found.action, source: "key" });
  return true;
}

/** Keys that toggle a disclosure in this focus state. */
function disclosureFor<A>(
  layer: ApplicationLayer<A>,
  chord: string,
  inField: boolean,
): ApplicationDisclosure | undefined {
  return disclosuresOf(layer).find((disclosure) =>
    sameChord(disclosure.fieldKey, chord) ||
    (!inField && sameChord(disclosure.key, chord))
  );
}

function choiceStep<A>(
  form: ApplicationForm<A>,
  model: TerminalApplicationLayerModel,
  fieldId: string,
  direction: 1 | -1,
  step: LayerStepContext<A>,
): TerminalApplicationLayerModel {
  const field = formField(form, fieldId);
  if (field?.kind !== "choice") return model;
  const options = field.options.filter((option) =>
    option.disabledReason === undefined
  );
  const at = options.findIndex((option) => option.id === model.values[fieldId]);
  const next =
    options[Math.max(0, Math.min(options.length - 1, at + direction))];
  if (next === undefined || next.id === model.values[fieldId]) return model;
  step.effects.push({
    kind: "field",
    layerId: form.id,
    fieldId,
    value: next.id,
  });
  return { ...model, values: { ...model.values, [fieldId]: next.id } };
}

/** Keys while a sheet or form is on top. */
function panelKey<A>(
  layer: ApplicationSheet<A> | ApplicationForm<A>,
  model: TerminalApplicationLayerModel,
  key: TerminalKey,
  step: LayerStepContext<A>,
): TerminalApplicationLayerModel {
  const chord = keyChordOf(key);
  if (chord === undefined) return model;
  const control = parseControl(model.focus);
  const inField = isTextControl(layer, model.focus);
  const disclosure = disclosureFor(layer, chord, inField);
  if (disclosure !== undefined) {
    return toggleOpen(model, disclosure.id, disclosureControl(disclosure.id));
  }
  const page = Math.max(1, model.page - 1);
  if (inField) {
    const field = layer.kind === "form"
      ? formField(layer, control.id)
      : undefined;
    const multiline = field?.kind === "text" && field.multiline === true;
    if (field?.kind === "text" && sameChord(field.editor?.key, chord)) {
      if (field.editor !== undefined) {
        step.effects.push({
          kind: "action",
          action: field.editor.action,
          source: "key",
        });
      }
      return model;
    }
    if (binding(step, chord, true)) return model;
    if (chord === "escape") {
      dismiss(layer, "escape", step);
      return model;
    }
    if (chord === "tab" || chord === "shift-tab") {
      return cycle(layer, model, chord === "tab" ? 1 : -1);
    }
    if (chord === "page-up" || chord === "page-down") {
      return scrollBy(model, chord === "page-up" ? -page : page);
    }
    if (!multiline) {
      if (chord === "enter") {
        const safe = safeButton(layer);
        return safe === undefined
          ? model
          : focusOn(model, buttonControl(safe.id));
      }
      // Up and Down move between a form's fields and scroll a sheet's body.
      if (chord === "up" || chord === "down") {
        return layer.kind === "form"
          ? cycle(layer, model, chord === "up" ? -1 : 1)
          : scrollBy(model, chord === "up" ? -1 : 1);
      }
    }
    // Whatever the field does with the key, the person is working in it,
    // so the next frame brings it back into view if paging hid it.
    return {
      ...editText(
        model,
        layer.id,
        control.id,
        key,
        multiline,
        step as LayerStepContext<unknown>,
      ),
      reveal: model.focus,
    };
  }
  switch (chord) {
    case "escape":
      dismiss(layer, "escape", step);
      return model;
    case "enter":
      return activate(layer, model, step);
    case "space":
      if (control.kind === "disclosure" || control.kind === "group") {
        return toggleOpen(model, control.id, model.focus);
      }
      if (control.kind === "field" && layer.kind === "form") {
        return choiceStep(layer, model, control.id, 1, step);
      }
      return model;
    case "left":
    case "right": {
      const direction = chord === "left" ? -1 : 1;
      if (control.kind === "field" && layer.kind === "form") {
        return {
          ...choiceStep(layer, model, control.id, direction, step),
          reveal: model.focus,
        };
      }
      return moveButton(layer, model, direction);
    }
    case "tab":
    case "shift-tab":
      return cycle(layer, model, chord === "tab" ? 1 : -1);
    case "up":
    case "down":
      if (layer.kind === "form" && control.kind !== "button") {
        return cycle(layer, model, chord === "up" ? -1 : 1);
      }
      return scrollBy(model, chord === "up" ? -1 : 1);
    case "page-up":
    case "page-down":
      return scrollBy(model, chord === "page-up" ? -page : page);
    case "home":
      return scrollBy(model, -model.scroll);
    case "end":
      return scrollBy(model, Number.MAX_SAFE_INTEGER / 2);
  }
  const alternative = layer.buttons.find((button) =>
    button.role === "alternative" && sameChord(button.key, chord)
  );
  if (alternative !== undefined) {
    return activateButton(layer, model, alternative, "key", step);
  }
  binding(step, chord, false);
  return model;
}

/** Enter on the focused control of a sheet or form. */
function activate<A>(
  layer: ApplicationSheet<A> | ApplicationForm<A>,
  model: TerminalApplicationLayerModel,
  step: LayerStepContext<A>,
): TerminalApplicationLayerModel {
  const control = parseControl(model.focus);
  switch (control.kind) {
    case "button": {
      // A hidden button row offers nothing to Enter; Escape stays safe.
      if (!buttonRowShown(layer)) return model;
      const button = layer.buttons.find((candidate) =>
        candidate.id === control.id
      );
      return button === undefined
        ? model
        : activateButton(layer, model, button, "button", step);
    }
    case "disclosure":
    case "group":
      return toggleOpen(model, control.id, model.focus);
    case "field": {
      const safe = safeButton(layer);
      return safe === undefined
        ? model
        : focusOn(model, buttonControl(safe.id));
    }
    default:
      return model;
  }
}

/** Keys while a menu is on top. */
function menuKey<A>(
  layer: ApplicationMenu<A>,
  model: TerminalApplicationLayerModel,
  key: TerminalKey,
  step: LayerStepContext<A>,
): TerminalApplicationLayerModel {
  const chord = keyChordOf(key);
  if (chord === undefined) return model;
  const rows = menuRows(layer, model.query, 1, model.unavailableOpen);
  const at = rows.order.indexOf(model.focus);
  const highlight = (control: LayerControl | undefined) => {
    if (control === undefined || control === model.focus) return model;
    const { why: _why, ...rest } = model;
    return { ...rest, focus: control, reveal: control };
  };
  if (model.filtering) {
    if (binding(step, chord, true)) return model;
    switch (chord) {
      case "escape": {
        const cleared = {
          ...model,
          query: "",
          queryCursor: 0,
          filtering: false,
        };
        return withMenuFocus(layer, cleared);
      }
      case "up":
      case "down":
        return highlight(
          rows
            .order[
              Math.max(
                0,
                Math.min(rows.order.length - 1, at + (chord === "up" ? -1 : 1)),
              )
            ],
        );
      case "enter":
        return runMenuControl(layer, model, step);
    }
    return withMenuFocus(layer, editQuery(model, key));
  }
  const page = Math.max(1, model.page - 1);
  switch (chord) {
    case "escape":
    case "left":
      if (model.query !== "") {
        return withMenuFocus(layer, { ...model, query: "", queryCursor: 0 });
      }
      dismiss(layer, "escape", step);
      return model;
    case "up":
    case "down":
    case "page-up":
    case "page-down": {
      const delta = chord === "up"
        ? -1
        : chord === "down"
        ? 1
        : chord === "page-up"
        ? -page
        : page;
      return highlight(
        rows
          .order[
            Math.max(
              0,
              Math.min(rows.order.length - 1, (at < 0 ? 0 : at) + delta),
            )
          ],
      );
    }
    case "home":
      return highlight(rows.order[0]);
    case "end":
      return highlight(rows.order.at(-1));
    case "tab":
    case "shift-tab": {
      const starts = rows.sectionStarts.map((start) =>
        rows.order.indexOf(start)
      ).filter((start) => start >= 0);
      const current = starts.filter((start) => start <= at).at(-1) ?? -1;
      const target = chord === "tab"
        ? starts.find((start) => start > at)
        : starts.filter((start) => start < current).at(-1);
      return target === undefined ? model : highlight(rows.order[target]);
    }
    case "enter":
    case "right":
      return runMenuControl(layer, model, step);
    case "/":
      if (layer.filter !== false) return { ...model, filtering: true };
  }
  if (layer.lettersActivate === true) {
    const item = layer.sections.flatMap((section) => section.items).find((
      candidate,
    ) => sameChord(candidate.key, chord));
    if (item !== undefined) {
      step.effects.push({
        kind: "action",
        action: item.action,
        source: "menu",
      });
      return highlight(itemControl(item.id));
    }
    const unavailable = [
      ...layer.sections.flatMap((section) => section.unavailable ?? []),
      ...(layer.unavailable?.items ?? []),
    ].find((candidate) => sameChord(candidate.key, chord));
    if (unavailable !== undefined) {
      const folded = layer.unavailable?.items.includes(unavailable) === true;
      return {
        ...model,
        unavailableOpen: folded || model.unavailableOpen,
        focus: unavailableControl(unavailable.id),
        reveal: unavailableControl(unavailable.id),
        why: unavailable.id,
      };
    }
  }
  binding(step, chord, false);
  return model;
}

/** Keep a menu's highlight on a row the current query and fold still show. */
function withMenuFocus<A>(
  layer: ApplicationMenu<A>,
  model: TerminalApplicationLayerModel,
): TerminalApplicationLayerModel {
  const rows = menuRows(layer, model.query, 1, model.unavailableOpen);
  if (rows.order.includes(model.focus)) return model;
  const first = rows.order[0];
  return first === undefined
    ? model
    : { ...model, focus: first, reveal: first };
}

/** Enter or Right on a menu's highlighted row. */
function runMenuControl<A>(
  layer: ApplicationMenu<A>,
  model: TerminalApplicationLayerModel,
  step: LayerStepContext<A>,
): TerminalApplicationLayerModel {
  const control = parseControl(model.focus);
  if (model.focus === UNAVAILABLE_SECTION) {
    return { ...model, unavailableOpen: !model.unavailableOpen };
  }
  if (control.kind === "unavailable") return { ...model, why: control.id };
  if (control.kind !== "item") return model;
  const item = menuItem(layer, control.id);
  if (item !== undefined) {
    step.effects.push({ kind: "action", action: item.action, source: "menu" });
  }
  return model;
}

/** Keys while a palette is on top: its query always owns input. */
function paletteKey<A>(
  layer: ApplicationPalette<A>,
  model: TerminalApplicationLayerModel,
  key: TerminalKey,
  step: LayerStepContext<A>,
): TerminalApplicationLayerModel {
  const chord = keyChordOf(key);
  if (chord === undefined) return model;
  if (binding(step, chord, true)) return model;
  const items = paletteRows(layer, model.query).items;
  const at = items.findIndex((item) => item.id === model.highlight);
  const page = Math.max(1, model.page - 1);
  const move = (delta: number) => {
    const target = items[Math.max(0, Math.min(items.length - 1, at + delta))];
    return target === undefined
      ? model
      : { ...model, highlight: target.id, reveal: itemControl(target.id) };
  };
  switch (chord) {
    case "escape":
      if (model.query !== "") {
        return rankPalette(layer, { ...model, query: "", queryCursor: 0 });
      }
      dismiss(layer, "escape", step);
      return model;
    case "up":
      return move(-1);
    case "down":
      return move(1);
    case "page-up":
      return move(-page);
    case "page-down":
      return move(page);
    case "enter": {
      const item = items[at];
      if (item !== undefined) {
        step.effects.push({
          kind: "action",
          action: item.action,
          source: "menu",
        });
      }
      return model;
    }
  }
  const edited = editQuery(model, key);
  return edited.query === model.query ? edited : rankPalette(layer, edited);
}

/** Highlight the best match after the query changes. */
function rankPalette<A>(
  layer: ApplicationPalette<A>,
  model: TerminalApplicationLayerModel,
): TerminalApplicationLayerModel {
  const first = paletteRows(layer, model.query).items[0];
  const { highlight: _old, ...rest } = model;
  return first === undefined
    ? { ...rest, scroll: 0 }
    : { ...rest, highlight: first.id, scroll: 0 };
}

/**
 * Apply one key to the top layer. Escape and the safe button dismiss it;
 * enabled buttons and items run their actions; Tab cycles controls; text
 * fields edit their values and report each change.
 */
export function layerKey<A>(
  layer: ApplicationLayer<A>,
  model: TerminalApplicationLayerModel,
  key: TerminalKey,
  step: LayerStepContext<A>,
): TerminalApplicationLayerModel {
  switch (layer.kind) {
    case "sheet":
    case "form":
      return panelKey(layer, model, key, step);
    case "menu":
      return menuKey(layer, model, key, step);
    case "palette":
      return paletteKey(layer, model, key, step);
    case "reader":
      return readerKey(layer, model, key, step);
  }
}

/**
 * Keys while a reader is on top, apart from moving between its rows, which
 * the application applies through the rows' list model.
 */
function readerKey<A>(
  layer: ApplicationReader<A>,
  model: TerminalApplicationLayerModel,
  key: TerminalKey,
  step: LayerStepContext<A>,
): TerminalApplicationLayerModel {
  const chord = keyChordOf(key);
  if (chord === undefined) return model;
  const page = Math.max(1, model.page - 1);
  switch (chord) {
    case "escape":
    case "left":
      dismiss(layer, "escape", step);
      return model;
    case "up":
    case "down":
      return scrollBy(model, chord === "up" ? -1 : 1);
    case "page-up":
    case "page-down":
      return scrollBy(model, chord === "page-up" ? -page : page);
    case "home":
      return scrollBy(model, -model.scroll);
    case "end":
      return scrollBy(model, Number.MAX_SAFE_INTEGER / 2);
  }
  const hint = layer.keys?.find((candidate) =>
    typeof candidate.key === "string" && sameChord(candidate.key, chord)
  );
  if (hint?.action !== undefined) {
    step.effects.push({ kind: "action", action: hint.action, source: "key" });
    return model;
  }
  binding(step, chord, false);
  return model;
}

/**
 * Focus a control directly, as a click does. Focus moving anywhere ends a
 * two-click confirmation; the caller re-arms when the click itself was the
 * first of two on a consequential button.
 */
export function focusControl<A>(
  layer: ApplicationLayer<A>,
  model: TerminalApplicationLayerModel,
  control: LayerControl,
): TerminalApplicationLayerModel {
  const { armed: _armed, ...unarmed } = model;
  if (layer.kind === "palette") {
    const { kind, id } = parseControl(control);
    return kind === "item" ? { ...unarmed, highlight: id } : unarmed;
  }
  if (layer.kind === "menu") {
    const { why: _why, ...rest } = unarmed;
    return { ...rest, focus: control };
  }
  return { ...unarmed, focus: control };
}

/** The value of each declared field, for the read-only state. */
export function layerFieldValues<A>(
  layer: ApplicationLayer<A>,
  model: TerminalApplicationLayerModel,
): Readonly<Record<string, string>> {
  if (layer.kind === "sheet") {
    return sheetChallengeShown(layer) && layer.challenge !== undefined
      ? {
        [layer.challenge.fieldId]: model.values[layer.challenge.fieldId] ?? "",
      }
      : {};
  }
  return layer.kind === "form" ? { ...model.values } : {};
}
