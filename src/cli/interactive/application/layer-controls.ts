/**
 * The structure of a layer's controls: their identities, the order Tab
 * visits them in, which ones are text fields, and where focus starts.
 *
 * @module
 */

import type {
  ApplicationForm,
  ApplicationLayer,
  ApplicationSheet,
  FormChoiceField,
  FormTextField,
  SheetButton,
} from "./layer-view.ts";

/**
 * A control inside a layer: `button:<id>`, `field:<id>`, `disclosure:<id>`,
 * `group:<id>` for a form's field group, `item:<id>` for a menu row,
 * `unavailable` for a menu's folded section and `unavailable:<id>` for its
 * rows, `input` for a palette's query, `rows` for a reader's focusable rows,
 * and `body` for a reader without them.
 */
export type LayerControl = string;

/** The control id of a button. */
export function buttonControl(id: string): LayerControl {
  return `button:${id}`;
}

/** The control id of a text or choice field. */
export function fieldControl(id: string): LayerControl {
  return `field:${id}`;
}

/** The control id of a disclosure row. */
export function disclosureControl(id: string): LayerControl {
  return `disclosure:${id}`;
}

/** The control id of a form's field group row. */
export function groupControl(id: string): LayerControl {
  return `group:${id}`;
}

/** The control id of a menu item. */
export function itemControl(id: string): LayerControl {
  return `item:${id}`;
}

/** The control id of an unavailable menu item. */
export function unavailableControl(id: string): LayerControl {
  return `unavailable:${id}`;
}

/** The folded section of unavailable menu items. */
export const UNAVAILABLE_SECTION: LayerControl = "unavailable";

/** A palette's query field. */
export const PALETTE_INPUT: LayerControl = "input";

/** A reader's focusable rows. */
export const READER_ROWS: LayerControl = "rows";

/** A reader without focusable rows. */
export const READER_BODY: LayerControl = "body";

/** The kind and target of a control id. */
export function parseControl(
  control: LayerControl,
): { readonly kind: string; readonly id: string } {
  const at = control.indexOf(":");
  return at < 0
    ? { kind: control, id: "" }
    : { kind: control.slice(0, at), id: control.slice(at + 1) };
}

/** A form's fields with groups flattened, keeping only open groups' fields. */
export function visibleFormFields<A>(
  form: ApplicationForm<A>,
  open: (groupId: string) => boolean,
): readonly (
  | FormTextField<A>
  | FormChoiceField
  | { readonly kind: "disclosure"; readonly id: string }
)[] {
  return form.fields.flatMap((field) =>
    field.kind === "disclosure"
      ? [field, ...(open(field.id) ? field.fields : [])]
      : [field]
  );
}

/** Every text field a form declares, inside groups too. */
export function formTextFields<A>(
  form: ApplicationForm<A>,
): readonly FormTextField<A>[] {
  return form.fields.flatMap((field) =>
    field.kind === "text"
      ? [field]
      : field.kind === "disclosure"
      ? field.fields.filter((inner): inner is FormTextField<A> =>
        inner.kind === "text"
      )
      : []
  );
}

/** The buttons a sheet or form shows. */
export function layerButtons<A>(
  layer: ApplicationLayer<A>,
): readonly SheetButton<A>[] {
  return layer.kind === "sheet" || layer.kind === "form" ? layer.buttons : [];
}

/** The safe button of a sheet or form. */
export function safeButton<A>(
  layer: ApplicationLayer<A>,
): SheetButton<A> | undefined {
  return layerButtons(layer).find((button) => button.role === "safe");
}

/** Whether a sheet shows its challenge field: it has one and is not in progress mode. */
export function sheetChallengeShown<A>(sheet: ApplicationSheet<A>): boolean {
  return sheet.challenge !== undefined && sheet.activity === undefined;
}

/**
 * The controls Tab visits in a sheet or form, in order: fields, disclosure
 * rows, then buttons. Menus, palettes, and readers have no Tab order.
 */
export function tabOrder<A>(
  layer: ApplicationLayer<A>,
  open: (id: string) => boolean,
): readonly LayerControl[] {
  if (layer.kind !== "sheet" && layer.kind !== "form") return [];
  const fields = layer.kind === "sheet"
    ? sheetChallengeShown(layer) && layer.challenge !== undefined
      ? [fieldControl(layer.challenge.fieldId)]
      : []
    : visibleFormFields(layer, open).map((field) =>
      field.kind === "disclosure"
        ? groupControl(field.id)
        : fieldControl(field.id)
    );
  return [
    ...fields,
    ...(layer.disclosures ?? []).map((disclosure) =>
      disclosureControl(disclosure.id)
    ),
    ...layer.buttons.map((button) => buttonControl(button.id)),
  ];
}

/** Whether a control in a layer edits text: a text field, a challenge, or a palette's query. */
export function isTextControl<A>(
  layer: ApplicationLayer<A>,
  control: LayerControl,
): boolean {
  const { kind, id } = parseControl(control);
  if (layer.kind === "palette") return control === PALETTE_INPUT;
  if (kind !== "field") return false;
  if (layer.kind === "sheet") return layer.challenge?.fieldId === id;
  if (layer.kind !== "form") return false;
  return formTextFields(layer).some((field) => field.id === id);
}

/** Whether any control of the layer can edit text. */
export function layerHasTextField<A>(layer: ApplicationLayer<A>): boolean {
  if (layer.kind === "palette") return true;
  if (layer.kind === "sheet") return sheetChallengeShown(layer);
  return layer.kind === "form" && formTextFields(layer).length > 0;
}

/**
 * Where focus starts: a sheet's challenge or a form's first visible text
 * field, else the safe button; a menu's initial or first item; a palette's
 * query; a reader's rows or its body.
 */
export function initialControl<A>(
  layer: ApplicationLayer<A>,
  open: (id: string) => boolean,
): LayerControl {
  switch (layer.kind) {
    case "sheet":
    case "form": {
      const text = tabOrder(layer, open).find((control) =>
        isTextControl(layer, control)
      );
      const safe = safeButton(layer);
      return text ??
        (safe === undefined ? READER_BODY : buttonControl(safe.id));
    }
    case "menu": {
      const items = layer.sections.flatMap((section) => section.items);
      const initial = items.find((item) => item.id === layer.initialItemId) ??
        items[0];
      if (initial !== undefined) return itemControl(initial.id);
      return layer.unavailable === undefined
        ? READER_BODY
        : UNAVAILABLE_SECTION;
    }
    case "palette":
      return PALETTE_INPUT;
    case "reader":
      return layer.rows === undefined ? READER_BODY : READER_ROWS;
  }
}
