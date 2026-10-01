/**
 * The key hints a layer shows in place of the view's footer: one cluster
 * that names what Enter does now first, then the layer's own keys, and the
 * safe choice last. While a text field has focus, field chords replace the
 * letter keys.
 *
 * @module
 */

import type { KeyHint, KeyHints } from "../../key-hints.ts";
import {
  isTextControl,
  type LayerControl,
  parseControl,
  safeButton,
  UNAVAILABLE_SECTION,
} from "./layer-controls.ts";
import {
  buttonEnabled,
  formField,
  type TerminalApplicationLayerModel,
} from "./layer-model.ts";
import { menuItem, paletteRows } from "./layer-search.ts";
import type {
  ApplicationForm,
  ApplicationLayer,
  ApplicationMenu,
  ApplicationPalette,
  ApplicationReader,
  ApplicationSheet,
} from "./layer-view.ts";

/** What a layer's frame adds to its hints. */
export interface LayerHintFacts {
  /** Body rows remain below and must be read before confirming. */
  readonly unread: boolean;
}

function enterHint(label: string | undefined): readonly KeyHint<never>[] {
  return label === undefined ? [] : [{ key: "enter", label }];
}

function focusedLabel<A>(
  layer: ApplicationSheet<A> | ApplicationForm<A>,
  model: TerminalApplicationLayerModel,
  control: LayerControl,
): string | undefined {
  const { kind, id } = parseControl(control);
  switch (kind) {
    case "button": {
      const button = layer.buttons.find((candidate) => candidate.id === id);
      return button === undefined || !buttonEnabled(layer, model, button)
        ? undefined
        : button.label;
    }
    case "field":
      return "Buttons";
    case "disclosure":
    case "group":
      return model.open[id] === true ? "Hide" : "Show";
    default:
      return undefined;
  }
}

function panelHints<A>(
  layer: ApplicationSheet<A> | ApplicationForm<A>,
  model: TerminalApplicationLayerModel,
  facts: LayerHintFacts,
): KeyHints<A> {
  const inField = isTextControl(layer, model.focus);
  const onButton = parseControl(model.focus).kind === "button";
  const field = layer.kind === "form"
    ? formField(layer, parseControl(model.focus).id)
    : undefined;
  const fields = layer.kind === "form" ? layer.fields.length : 0;
  const safe = safeButton(layer);
  const hints: KeyHint<A>[] = [
    ...enterHint(focusedLabel(layer, model, model.focus)),
    ...(onButton && layer.buttons.length > 1
      ? [{ key: ["left", "right"], label: "Choose" }]
      : []),
    ...(inField && fields > 1 ? [{ key: "tab", label: "Next field" }] : []),
    ...(facts.unread ? [{ key: "page-down", label: "Read more" }] : []),
    ...(field?.kind === "text" && field.editor !== undefined
      ? [{ key: field.editor.key, label: field.editor.label ?? "Editor" }]
      : []),
    ...(layer.disclosures ?? []).flatMap((disclosure) => {
      const key = inField ? disclosure.fieldKey : disclosure.key;
      return key === undefined
        ? []
        : [{ key, label: disclosure.hint ?? disclosure.label }];
    }),
    ...(inField
      ? []
      : layer.buttons.flatMap((button) =>
        button.role === "alternative" && button.key !== undefined
          ? [{ key: button.key, label: button.label }]
          : []
      )),
    ...(safe === undefined ? [] : [{ key: "escape", label: safe.label }]),
  ];
  return { left: hints };
}

function menuHints<A>(
  layer: ApplicationMenu<A>,
  model: TerminalApplicationLayerModel,
): KeyHints<A> {
  const control = parseControl(model.focus);
  const enter = model.focus === UNAVAILABLE_SECTION
    ? model.unavailableOpen ? "Hide" : "Show"
    : control.kind === "unavailable"
    ? "Why"
    : control.kind === "item"
    ? menuItem(layer, control.id)?.label
    : undefined;
  if (model.filtering) {
    return {
      left: [
        ...enterHint(enter),
        { key: ["up", "down"], label: "Move" },
        { key: "escape", label: "Clear" },
      ],
    };
  }
  return {
    left: [
      ...enterHint(enter),
      { key: ["up", "down"], label: "Move" },
      ...(layer.lettersActivate === true
        ? [{ key: "Letters", label: "Run" }]
        : []),
      { key: "/", label: "Filter" },
      { key: "escape", label: model.query === "" ? "Close" : "Clear" },
    ],
  };
}

function paletteHints<A>(
  layer: ApplicationPalette<A>,
  model: TerminalApplicationLayerModel,
): KeyHints<A> {
  const item = paletteRows(layer, model.query).items.find((candidate) =>
    candidate.id === model.highlight
  );
  return {
    left: [
      ...enterHint(item?.label),
      { key: ["up", "down"], label: "Move" },
      { key: "Type", label: "to search" },
      { key: "escape", label: model.query === "" ? "Close" : "Clear" },
    ],
  };
}

function readerHints<A>(layer: ApplicationReader<A>): KeyHints<A> {
  return {
    left: [
      ...(layer.rows === undefined ? [] : [{ key: "enter", label: "Open" }]),
      {
        key: ["up", "down"],
        label: layer.rows === undefined ? "Scroll" : "Move",
      },
      ...(layer.keys ?? []),
      { key: "escape", label: "Back" },
    ],
  };
}

/** The key hints the top layer shows. */
export function layerHints<A>(
  layer: ApplicationLayer<A>,
  model: TerminalApplicationLayerModel,
  facts: LayerHintFacts,
): KeyHints<A> {
  switch (layer.kind) {
    case "sheet":
    case "form":
      return panelHints(layer, model, facts);
    case "menu":
      return menuHints(layer, model);
    case "palette":
      return paletteHints(layer, model);
    case "reader":
      return readerHints(layer);
  }
}
