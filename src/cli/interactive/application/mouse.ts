/**
 * Mouse input against the last frame's hit regions: a click selects a row
 * and a click on the selected row is Enter; the wheel moves a list's
 * selection or scrolls a detail, a reading body, or a layer; a click on a
 * key hint presses its key; a confirm or destructive button needs one click
 * to focus it and a second to activate it; a click outside the top layer is
 * the safe choice.
 *
 * @module
 */

import type { TerminalKey, TerminalMouseEvent } from "../keys.ts";
import { decodableChord } from "./keymap.ts";
import { isTerminalKeyName } from "../keys.ts";
import { type ApplicationHitTarget, hitAt } from "./hits.ts";
import { buttonControl, parseControl } from "./layer-controls.ts";
import {
  activateButton,
  focusControl,
  type LayerStepContext,
  type TerminalApplicationLayerModel,
} from "./layer-model.ts";
import { menuItem, paletteRows } from "./layer-search.ts";
import type { ApplicationLayer } from "./layer-view.ts";
import { rowIndexForKey } from "./list-model.ts";
import { clearReadingFocus, followReadingLink } from "./reading-model.ts";
import {
  applyKey,
  applyLayerEffects,
  bodyList,
  enterRow,
  type KeyStep,
  listModelRows,
  type ModelState,
  replaceLayer,
  selectRow,
  topLayer,
} from "./model.ts";

/** Lines one wheel step scrolls a detail, a reading body, or a sheet. */
const WHEEL_LINES = 3;

/** The decoded key a single-chord hint stands for. */
function keyFor(chord: string): TerminalKey | undefined {
  const normal = decodableChord(chord);
  if (normal === undefined) return undefined;
  if (normal === "space") return { kind: "text", text: " " };
  return isTerminalKeyName(normal)
    ? { kind: "named", name: normal }
    : { kind: "text", text: normal };
}

/** Select a list row, or run it when it is already selected. */
function clickRow<A>(
  model: ModelState<A>,
  listId: string,
  key: string,
  step: KeyStep<A>,
): ModelState<A> {
  const list = model.lists[listId];
  if (list === undefined) return model;
  if (list.selection === key) return enterRow(model, listId, step, "click");
  const rows = listModelRows(list);
  const index = rowIndexForKey(rows.rows, key);
  return index < 0
    ? model
    : selectRow({ ...model, primaryFocused: false }, listId, rows, index);
}

function scrollLayer(
  layer: TerminalApplicationLayerModel,
  delta: number,
): TerminalApplicationLayerModel {
  const { reveal: _reveal, ...rest } = layer;
  return { ...rest, scroll: Math.max(0, layer.scroll + delta) };
}

/** A click on one control of the top layer. */
function clickControl<A>(
  model: ModelState<A>,
  layer: ApplicationLayer<A>,
  current: TerminalApplicationLayerModel,
  control: string,
  step: KeyStep<A>,
): ModelState<A> {
  const target = parseControl(control);
  const context: LayerStepContext<A> = { effects: [] };
  let next = current;
  switch (target.kind) {
    case "button": {
      if (layer.kind !== "sheet" && layer.kind !== "form") break;
      const button = layer.buttons.find((candidate) =>
        candidate.id === target.id
      );
      if (button === undefined) break;
      const consequential = button.role === "confirm" ||
        button.role === "destructive";
      // The arm holds only while the click that set it left focus on the
      // button; any focus change in between starts the confirmation over.
      const armed = current.armed === button.id &&
        current.focus === buttonControl(button.id);
      if (consequential && !armed) {
        next = {
          ...focusControl(layer, current, buttonControl(button.id)),
          armed: button.id,
        };
        break;
      }
      next = activateButton(
        layer,
        focusControl(layer, current, buttonControl(button.id)),
        button,
        "click",
        context,
      );
      break;
    }
    case "disclosure":
    case "group":
      next = {
        ...focusControl(layer, current, control),
        open: {
          ...current.open,
          [target.id]: current.open[target.id] !== true,
        },
      };
      break;
    case "field":
      next = focusControl(layer, current, control);
      break;
    case "item":
      if (layer.kind === "palette") {
        if (current.highlight === target.id) {
          const item = paletteRows(layer, current.query).items.find((
            candidate,
          ) => candidate.id === target.id);
          if (item !== undefined) {
            context.effects.push({
              kind: "action",
              action: item.action,
              source: "click",
            });
          }
        } else next = focusControl(layer, current, control);
        break;
      }
      if (layer.kind !== "menu") break;
      if (current.focus === control) {
        const item = menuItem(layer, target.id);
        if (item !== undefined) {
          context.effects.push({
            kind: "action",
            action: item.action,
            source: "click",
          });
        }
      } else next = focusControl(layer, current, control);
      break;
    case "unavailable":
      next = target.id === ""
        ? {
          ...focusControl(layer, current, control),
          unavailableOpen: !current.unavailableOpen,
        }
        : { ...focusControl(layer, current, control), why: target.id };
      break;
  }
  return applyLayerEffects(replaceLayer(model, next), context.effects, step);
}

/** A wheel turn over a layer: sheets and forms scroll, the rest move like arrows. */
function wheelLayer<A>(
  model: ModelState<A>,
  layer: ApplicationLayer<A>,
  current: TerminalApplicationLayerModel,
  direction: "up" | "down",
  step: KeyStep<A>,
): ModelState<A> {
  if (layer.kind === "sheet" || layer.kind === "form") {
    return replaceLayer(
      model,
      scrollLayer(current, direction === "up" ? -WHEEL_LINES : WHEEL_LINES),
    );
  }
  return applyKey(model, { kind: "named", name: direction }, step);
}

/** Inside or outside the top layer. */
function layerTarget(
  target: ApplicationHitTarget | undefined,
  layerId: string,
): boolean {
  if (target === undefined) return false;
  switch (target.kind) {
    case "layer":
    case "layer-scroll":
    case "control":
      return target.layerId === layerId;
    case "hint":
      return true;
    default:
      return false;
  }
}

/**
 * Apply one mouse event. Releases and buttons other than the left one do
 * nothing; the package acts on presses and wheel turns.
 */
export function mouseTransition<A>(
  model: ModelState<A>,
  event: TerminalMouseEvent,
  step: KeyStep<A>,
): ModelState<A> {
  if (event.action === "release") return model;
  if (event.action === "press" && event.button !== "left") return model;
  const target = hitAt(model.hits, event.row - 1, event.column - 1);
  const layer = topLayer(model);
  const current = layer === undefined ? undefined : model.layers[layer.id];
  if (layer !== undefined && current !== undefined) {
    const readerRow = target?.kind === "row" && layer.kind === "reader" &&
      layer.rows?.id === target.listId;
    if (!readerRow && !layerTarget(target, layer.id)) {
      if (event.action === "wheel") return model;
      return applyLayerEffects(model, [{
        kind: "dismiss",
        target: { layer: layer.id },
        via: "click-outside",
      }], step);
    }
    if (event.action === "wheel") {
      return wheelLayer(model, layer, current, event.direction, step);
    }
    if (target?.kind === "control") {
      return clickControl(model, layer, current, target.control, step);
    }
  }
  if (target === undefined) return model;
  if (event.action === "wheel") {
    const delta = event.direction === "up" ? -1 : 1;
    switch (target.kind) {
      case "row":
      case "list":
        return applyKey(model, { kind: "named", name: event.direction }, step);
      case "detail": {
        const list = bodyList(model.view);
        const selected = list === undefined
          ? undefined
          : model.lists[list.id]?.selection;
        const itemId = selected?.startsWith("i:") === true
          ? selected.slice(2)
          : undefined;
        if (itemId === undefined) return model;
        return {
          ...model,
          detailScroll: {
            ...model.detailScroll,
            [itemId]: Math.max(
              0,
              (model.detailScroll[itemId] ?? 0) + delta * WHEEL_LINES,
            ),
          },
        };
      }
      case "reading":
      case "link": {
        const body = model.view.body;
        if (body.kind !== "reading") return model;
        // Scrolling moves the reader away from the focused link.
        return {
          ...clearReadingFocus(model, body.id),
          readingScroll: {
            ...model.readingScroll,
            [body.id]: Math.max(
              0,
              (model.readingScroll[body.id] ?? 0) + delta * WHEEL_LINES,
            ),
          },
        };
      }
      default:
        return model;
    }
  }
  switch (target.kind) {
    case "row":
      return clickRow(model, target.listId, target.key, step);
    case "hint": {
      const key = keyFor(target.chord);
      return key === undefined ? model : applyKey(model, key, step);
    }
    case "link":
      return followReadingLink(
        model,
        target.readingId,
        target.linkId,
        "click",
        step,
      );
    case "chip": {
      const action = model.view.header.chips?.[target.index]?.action;
      if (action !== undefined) {
        step.effects.push({ kind: "action", action, source: "chip" });
      }
      return model;
    }
    default:
      return model;
  }
}
