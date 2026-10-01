/**
 * The key hints a layer shows in place of the view's footer: one cluster
 * that names what Enter does now first, then the layer's own keys, and the
 * safe choice last — or first, without the accent, when Enter does nothing.
 * While a text field has focus, field chords replace the letter keys.
 *
 * @module
 */

import type { KeyHint, KeyHints } from "../../key-hints.ts";
import type { TerminalApplicationCopy } from "./copy.ts";
import {
  buttonRowShown,
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

function enterHint(label: string | undefined): readonly KeyHint[] {
  return label === undefined ? [] : [{ key: "enter", label }];
}

function focusedLabel<A>(
  layer: ApplicationSheet<A> | ApplicationForm<A>,
  model: TerminalApplicationLayerModel,
  control: LayerControl,
  copy: TerminalApplicationCopy,
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
      return copy.buttons;
    case "disclosure":
    case "group":
      return model.open[id] === true ? copy.hide : copy.show;
    default:
      return undefined;
  }
}

function panelHints<A>(
  layer: ApplicationSheet<A> | ApplicationForm<A>,
  model: TerminalApplicationLayerModel,
  facts: LayerHintFacts,
  copy: TerminalApplicationCopy,
): KeyHints {
  const inField = isTextControl(layer, model.focus);
  const shown = buttonRowShown(layer);
  const onButton = shown && parseControl(model.focus).kind === "button";
  const field = layer.kind === "form"
    ? formField(layer, parseControl(model.focus).id)
    : undefined;
  const fields = layer.kind === "form" ? layer.fields.length : 0;
  const safe = safeButton(layer);
  const hints: KeyHint[] = [
    ...enterHint(
      shown || parseControl(model.focus).kind !== "button"
        ? focusedLabel(layer, model, model.focus, copy)
        : undefined,
    ),
    ...(onButton && layer.buttons.length > 1
      ? [{ key: ["left", "right"], label: copy.choose }]
      : []),
    ...(inField && fields > 1 ? [{ key: "tab", label: copy.nextField }] : []),
    ...(facts.unread ? [{ key: "page-down", label: copy.readMore }] : []),
    ...(field?.kind === "text" && field.editor !== undefined
      ? [{ key: field.editor.key, label: field.editor.label ?? copy.editor }]
      : []),
    ...(layer.disclosures ?? []).flatMap((disclosure) => {
      const key = inField ? disclosure.fieldKey : disclosure.key;
      const closed = disclosure.hint ?? disclosure.label;
      const label = model.open[disclosure.id] === true
        ? disclosure.openHint ?? closed
        : closed;
      return key === undefined ? [] : [{ key, label }];
    }),
    ...(inField
      ? []
      : layer.buttons.flatMap((button) =>
        button.role === "alternative" && button.key !== undefined
          ? [{ key: button.key, label: button.label }]
          : []
      )),
    ...(layer.hints ?? []),
    ...escapeHint(layer, safe?.label),
  ];
  return { left: hints };
}

/** Escape's hint: the layer's own word, else the given default. */
function escapeHint<A>(
  layer: ApplicationLayer<A>,
  fallback: string | undefined,
): readonly KeyHint[] {
  const label = layer.escapeLabel ?? fallback;
  return label === undefined ? [] : [{ key: "escape", label }];
}

function menuHints<A>(
  layer: ApplicationMenu<A>,
  model: TerminalApplicationLayerModel,
  copy: TerminalApplicationCopy,
): KeyHints {
  const control = parseControl(model.focus);
  const enter = model.focus === UNAVAILABLE_SECTION
    ? model.unavailableOpen ? copy.hide : copy.show
    : control.kind === "unavailable"
    ? copy.why
    : control.kind === "item"
    ? layer.enterLabel ?? menuItem(layer, control.id)?.label
    : undefined;
  if (model.filtering) {
    return {
      left: [
        ...enterHint(enter),
        { key: ["up", "down"], label: copy.move },
        { key: "escape", label: copy.clear },
      ],
    };
  }
  return {
    left: [
      ...enterHint(enter),
      { key: ["up", "down"], label: copy.move },
      ...(layer.lettersActivate === true
        ? [{ key: copy.letters, label: copy.run }]
        : []),
      ...(layer.filter === false ? [] : [{ key: "/", label: copy.filter }]),
      ...(layer.hints ?? []),
      ...(model.query === ""
        ? escapeHint(layer, copy.close)
        : [{ key: "escape", label: copy.clear }]),
    ],
  };
}

function paletteHints<A>(
  layer: ApplicationPalette<A>,
  model: TerminalApplicationLayerModel,
  copy: TerminalApplicationCopy,
): KeyHints {
  const item = paletteRows(layer, model.query).items.find((candidate) =>
    candidate.id === model.highlight
  );
  return {
    left: [
      ...enterHint(item?.label),
      { key: ["up", "down"], label: copy.move },
      { key: copy.type, label: copy.toSearch },
      ...(layer.hints ?? []),
      ...(model.query === ""
        ? escapeHint(layer, copy.close)
        : [{ key: "escape", label: copy.clear }]),
    ],
  };
}

function readerHints<A>(
  layer: ApplicationReader<A>,
  copy: TerminalApplicationCopy,
): KeyHints {
  return {
    left: [
      ...(layer.rows === undefined ? [] : [{ key: "enter", label: copy.open }]),
      {
        key: ["up", "down"],
        label: layer.rows === undefined ? copy.scroll : copy.move,
      },
      ...(layer.keys ?? []),
      ...(layer.hints ?? []),
      ...escapeHint(layer, copy.back),
    ],
  };
}

/**
 * A layer's primary is what Enter does. When Enter does nothing — no
 * button row, a disabled button focused, nothing highlighted — the footer
 * has no primary: no key takes the accent Enter's hint owns, and Escape's
 * hint leads, so the way out is the last hint to drop.
 */
function withPrimary(hints: KeyHints): KeyHints {
  if (hints.left[0]?.key === "enter") return hints;
  const escape = hints.left.find((hint) => hint.key === "escape");
  return {
    ...hints,
    primary: false,
    left: escape === undefined
      ? hints.left
      : [escape, ...hints.left.filter((hint) => hint !== escape)],
  };
}

/** The key hints the top layer shows. */
export function layerHints<A>(
  layer: ApplicationLayer<A>,
  model: TerminalApplicationLayerModel,
  facts: LayerHintFacts,
  copy: TerminalApplicationCopy,
): KeyHints {
  switch (layer.kind) {
    case "sheet":
    case "form":
      return withPrimary(panelHints(layer, model, facts, copy));
    case "menu":
      return withPrimary(menuHints(layer, model, copy));
    case "palette":
      return withPrimary(paletteHints(layer, model, copy));
    case "reader":
      return withPrimary(readerHints(layer, copy));
  }
}
