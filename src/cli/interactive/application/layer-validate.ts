/**
 * The layer rules as data: depth, identities, the one safe button, keys
 * only where letters can never confirm, disclosures one key from every
 * text field, and layers that leave the view once dismissed.
 *
 * @module
 */

import type { KeyChord } from "../../key-hints.ts";
import {
  decodableChord,
  EDITOR_RESERVED_CHORDS,
  fieldOwnsChord,
  TERMINAL_APPLICATION_LAYER_KEYS,
} from "./keymap.ts";
import { formTextFields, layerHasTextField } from "./layer-controls.ts";
import {
  APPLICATION_LAYER_DEPTH,
  type ApplicationForm,
  type ApplicationLayer,
  type ApplicationMenu,
  type ApplicationPalette,
  type ApplicationReader,
  type ApplicationSheet,
  type FormChoiceField,
  type FormTextField,
  type LayerDisclosure,
  type SheetButton,
} from "./layer-view.ts";
import {
  blocks,
  controlFree,
  type Issues,
  list,
  runs,
  text,
  tone,
} from "./validate-rules.ts";

/** Caller bindings scoped to one layer, by normalised chord. */
export type LayerBindings = ReadonlyMap<
  string,
  ReadonlyMap<KeyChord, { readonly inFields: boolean }>
>;

/** Facts from the running application that a view's layers must respect. */
export interface LayerRuleContext {
  /** Layer ids the application reported dismissed. */
  readonly dismissedLayers?: readonly string[];
  /** The caller's layer-scoped bindings. */
  readonly layerBindings?: LayerBindings;
  /** Ids of lists the body already shows; a reader's rows need their own. */
  readonly listIds?: readonly string[];
}

const ROLES: ReadonlySet<string> = new Set([
  "safe",
  "confirm",
  "destructive",
  "alternative",
]);
const SHEET_STATES: ReadonlySet<string> = new Set([
  "loading",
  "ready",
  "changed",
  "gone",
  "working",
  "failed",
]);
const STEP_STATES: ReadonlySet<string> = new Set([
  "pending",
  "active",
  "done",
  "failed",
  "skipped",
]);
const EDITOR_CHORDS: ReadonlySet<string> = new Set(EDITOR_RESERVED_CHORDS);

/** Keys one layer already gives meaning to, so nothing else may take them. */
class LayerKeys {
  readonly #taken = new Map<KeyChord, string>();
  constructor(
    readonly issues: Issues,
    readonly kind: ApplicationLayer<unknown>["kind"],
  ) {
    for (const key of TERMINAL_APPLICATION_LAYER_KEYS[kind]) {
      this.#taken.set(key, "the layer's navigation");
    }
  }

  /** Claim a key for `owner`; report undecodable or already-claimed keys. */
  claim(path: string, key: unknown, owner: string): KeyChord | undefined {
    text(this.issues, path, key);
    if (typeof key !== "string") return undefined;
    const chord = decodableChord(key);
    if (chord === undefined) {
      this.issues.push({ path, message: "names no terminal key" });
      return undefined;
    }
    const holder = this.#taken.get(chord);
    if (holder !== undefined) {
      this.issues.push({ path, message: `is already ${holder}` });
      return chord;
    }
    this.#taken.set(chord, owner);
    return chord;
  }

  has(chord: KeyChord): boolean {
    return this.#taken.has(chord);
  }
}

/** A chord a text field leaves free: non-printing and outside the editor's chords. */
function fieldChord(issues: Issues, path: string, chord: KeyChord): void {
  if (fieldOwnsChord(chord) || EDITOR_CHORDS.has(chord)) {
    issues.push({
      path,
      message: "must be a non-printing chord a text field leaves free",
    });
  }
}

function disclosures(
  issues: Issues,
  path: string,
  value: readonly LayerDisclosure[] | undefined,
  keys: LayerKeys,
  textFields: boolean,
): void {
  const ids = new Set<string>();
  for (const [index, disclosure] of (value ?? []).entries()) {
    const at = `${path}[${index}]`;
    text(issues, `${at}.id`, disclosure.id);
    if (ids.has(disclosure.id)) {
      issues.push({ path: `${at}.id`, message: "repeats a disclosure id" });
    }
    ids.add(disclosure.id);
    text(issues, `${at}.label`, disclosure.label);
    if (disclosure.hint !== undefined) {
      text(issues, `${at}.hint`, disclosure.hint);
    }
    keys.claim(`${at}.key`, disclosure.key, `disclosure ${disclosure.id}`);
    if (disclosure.fieldKey === undefined) {
      if (textFields) {
        issues.push({
          path: `${at}.fieldKey`,
          message:
            "is required while a text field can own focus, so the disclosure stays one key away",
        });
      }
    } else {
      const chord = keys.claim(
        `${at}.fieldKey`,
        disclosure.fieldKey,
        `disclosure ${disclosure.id}`,
      );
      if (chord !== undefined) fieldChord(issues, `${at}.fieldKey`, chord);
    }
    blocks(issues, `${at}.content`, disclosure.content);
  }
}

function buttons<A>(
  issues: Issues,
  path: string,
  value: readonly SheetButton<A>[],
  keys: LayerKeys,
  challenge: boolean,
): void {
  const ids = new Set<string>();
  let safe = 0;
  for (const [index, button] of value.entries()) {
    const at = `${path}[${index}]`;
    text(issues, `${at}.id`, button.id);
    if (ids.has(button.id)) {
      issues.push({ path: `${at}.id`, message: "repeats a button id" });
    }
    ids.add(button.id);
    text(issues, `${at}.label`, button.label);
    if (!ROLES.has(button.role)) {
      issues.push({ path: `${at}.role`, message: "is not a button role" });
    }
    if (button.role === "safe") safe += 1;
    else if (button.action === undefined) {
      issues.push({
        path: `${at}.action`,
        message: "is required; only the safe button dismisses without one",
      });
    }
    if (button.disabledReason !== undefined) {
      text(issues, `${at}.disabledReason`, button.disabledReason);
    }
    if (button.key !== undefined) {
      if (button.role !== "alternative") {
        issues.push({
          path: `${at}.key`,
          message: "belongs only to alternative buttons; letters never confirm",
        });
      } else keys.claim(`${at}.key`, button.key, `button ${button.id}`);
    }
    if (
      button.requiresChallenge === true &&
      (button.role !== "destructive" || !challenge)
    ) {
      issues.push({
        path: `${at}.requiresChallenge`,
        message: "needs a destructive button on a sheet with a challenge",
      });
    }
  }
  if (safe !== 1) {
    issues.push({
      path,
      message: `must hold exactly one safe button; found ${safe}`,
    });
  }
}

function sheet<A>(
  issues: Issues,
  path: string,
  layer: ApplicationSheet<A>,
  keys: LayerKeys,
): void {
  text(issues, `${path}.title`, layer.title);
  runs(issues, `${path}.aside`, layer.aside);
  if (!SHEET_STATES.has(layer.state)) {
    issues.push({ path: `${path}.state`, message: "is not a sheet state" });
  }
  if (layer.busy !== undefined) text(issues, `${path}.busy`, layer.busy);
  if (layer.banner !== undefined) {
    tone(issues, `${path}.banner.tone`, layer.banner.tone);
    runs(issues, `${path}.banner.runs`, layer.banner.runs);
  }
  blocks(issues, `${path}.body`, layer.body);
  if (layer.readHint !== undefined) {
    text(issues, `${path}.readHint`, layer.readHint);
  }
  const challenge = layer.challenge;
  if (challenge !== undefined) {
    text(issues, `${path}.challenge.fieldId`, challenge.fieldId);
    runs(issues, `${path}.challenge.label`, challenge.label);
    text(issues, `${path}.challenge.mustEqual`, challenge.mustEqual);
    runs(issues, `${path}.challenge.hint`, challenge.hint);
  }
  runs(issues, `${path}.footnote`, layer.footnote);
  disclosures(
    issues,
    `${path}.disclosures`,
    layer.disclosures,
    keys,
    layerHasTextField(layer),
  );
  buttons(
    issues,
    `${path}.buttons`,
    layer.buttons,
    keys,
    challenge !== undefined,
  );
  const activity = layer.activity;
  if (activity === undefined) return;
  const roles = layer.buttons.map((button) => button.role);
  if (
    roles.some((role) => role !== "safe" && role !== "destructive") ||
    roles.filter((role) => role === "destructive").length > 1
  ) {
    issues.push({
      path: `${path}.buttons`,
      message:
        "in progress mode holds the safe button and at most one destructive one",
    });
  }
  if (!Number.isFinite(activity.startedAt)) {
    issues.push({
      path: `${path}.activity.startedAt`,
      message: "must be finite",
    });
  }
  if (
    activity.typicalMs !== undefined &&
    !(Number.isFinite(activity.typicalMs) && activity.typicalMs > 0)
  ) {
    issues.push({
      path: `${path}.activity.typicalMs`,
      message: "must be positive",
    });
  }
  if (activity.typicalLabel !== undefined) {
    text(issues, `${path}.activity.typicalLabel`, activity.typicalLabel);
  }
  const steps = new Set<string>();
  for (const [index, step] of activity.steps.entries()) {
    const at = `${path}.activity.steps[${index}]`;
    text(issues, `${at}.id`, step.id);
    if (steps.has(step.id)) {
      issues.push({ path: `${at}.id`, message: "repeats a step id" });
    }
    steps.add(step.id);
    text(issues, `${at}.label`, step.label);
    if (!STEP_STATES.has(step.state)) {
      issues.push({ path: `${at}.state`, message: "is not a step state" });
    }
  }
  for (const [index, line] of (activity.waits ?? []).entries()) {
    runs(issues, `${path}.activity.waits[${index}]`, line);
  }
  for (const [index, line] of (activity.then ?? []).entries()) {
    runs(issues, `${path}.activity.then[${index}]`, line);
  }
}

function menu<A>(
  issues: Issues,
  path: string,
  layer: ApplicationMenu<A>,
  keys: LayerKeys,
): void {
  text(issues, `${path}.title`, layer.title);
  if (layer.aside !== undefined) text(issues, `${path}.aside`, layer.aside);
  if (
    layer.columns !== undefined && layer.columns !== 1 && layer.columns !== 2
  ) {
    issues.push({ path: `${path}.columns`, message: "must be 1 or 2" });
  }
  const ids = new Set<string>();
  const unique = (at: string, id: string) => {
    text(issues, `${at}.id`, id);
    if (ids.has(id)) {
      issues.push({
        path: `${at}.id`,
        message: "appears more than once in the menu",
      });
    }
    ids.add(id);
  };
  const available = new Set<string>();
  for (const [index, section] of layer.sections.entries()) {
    const at = `${path}.sections[${index}]`;
    text(issues, `${at}.title`, section.title);
    tone(issues, `${at}.tone`, section.tone);
    for (const [position, item] of section.items.entries()) {
      const where = `${at}.items[${position}]`;
      unique(where, item.id);
      available.add(item.id);
      text(issues, `${where}.label`, item.label);
      if (item.key !== undefined) {
        keys.claim(`${where}.key`, item.key, `item ${item.id}`);
      }
      if (item.tone !== undefined && item.tone !== "danger") {
        issues.push({ path: `${where}.tone`, message: 'must be "danger"' });
      }
      runs(issues, `${where}.detail`, item.detail);
      runs(issues, `${where}.description`, item.description);
    }
  }
  if (layer.unavailable !== undefined) {
    text(issues, `${path}.unavailable.title`, layer.unavailable.title);
    for (const [index, item] of layer.unavailable.items.entries()) {
      const at = `${path}.unavailable.items[${index}]`;
      unique(at, item.id);
      text(issues, `${at}.label`, item.label);
      text(issues, `${at}.sentence`, item.sentence);
      if (item.key !== undefined) {
        keys.claim(`${at}.key`, item.key, `item ${item.id}`);
      }
    }
  }
  if (
    layer.initialItemId !== undefined && !available.has(layer.initialItemId)
  ) {
    issues.push({
      path: `${path}.initialItemId`,
      message: "must name an available item",
    });
  }
}

function palette<A>(
  issues: Issues,
  path: string,
  layer: ApplicationPalette<A>,
): void {
  text(issues, `${path}.placeholder`, layer.placeholder);
  const ids = new Set<string>();
  for (const [index, section] of layer.sections.entries()) {
    const at = `${path}.sections[${index}]`;
    text(issues, `${at}.title`, section.title);
    for (const [position, item] of section.items.entries()) {
      const where = `${at}.items[${position}]`;
      text(issues, `${where}.id`, item.id);
      if (ids.has(item.id)) {
        issues.push({ path: `${where}.id`, message: "repeats an item id" });
      }
      ids.add(item.id);
      text(issues, `${where}.label`, item.label);
      if (item.context !== undefined) {
        text(issues, `${where}.context`, item.context);
      }
      runs(issues, `${where}.meta`, item.meta);
      if (item.key !== undefined) {
        text(issues, `${where}.key`, item.key);
        if (decodableChord(item.key) === undefined) {
          issues.push({
            path: `${where}.key`,
            message: "names no terminal key",
          });
        }
      }
      if (item.keywords !== undefined) {
        text(issues, `${where}.keywords`, item.keywords, true);
      }
    }
  }
}

function textField<A>(
  issues: Issues,
  path: string,
  field: FormTextField<A>,
  keys: LayerKeys,
): void {
  if (typeof field.initial !== "string") {
    issues.push({ path: `${path}.initial`, message: "must be a string" });
  } else if (
    !controlFree(
      field.multiline === true
        ? field.initial.replaceAll("\n", "")
        : field.initial,
    )
  ) {
    issues.push({
      path: `${path}.initial`,
      message: "must not contain control characters",
    });
  }
  runs(issues, `${path}.hint`, field.hint);
  if (field.editor === undefined) return;
  if (field.multiline !== true) {
    issues.push({
      path: `${path}.editor`,
      message: "belongs only to multi-line fields",
    });
  }
  const chord = keys.claim(
    `${path}.editor.key`,
    field.editor.key,
    `the editor of ${field.id}`,
  );
  if (chord !== undefined) fieldChord(issues, `${path}.editor.key`, chord);
  if (field.editor.label !== undefined) {
    text(issues, `${path}.editor.label`, field.editor.label);
  }
}

function choiceField(
  issues: Issues,
  path: string,
  field: FormChoiceField,
): void {
  const options = new Set<string>();
  for (const [index, option] of field.options.entries()) {
    text(issues, `${path}.options[${index}].id`, option.id);
    text(issues, `${path}.options[${index}].label`, option.label);
    if (option.disabledReason !== undefined) {
      text(
        issues,
        `${path}.options[${index}].disabledReason`,
        option.disabledReason,
      );
    }
    if (options.has(option.id)) {
      issues.push({
        path: `${path}.options[${index}].id`,
        message: "repeats an option id",
      });
    }
    options.add(option.id);
  }
  const initial = field.options.find((option) => option.id === field.initial);
  if (initial === undefined || initial.disabledReason !== undefined) {
    issues.push({
      path: `${path}.initial`,
      message: "must name an option that can be chosen",
    });
  }
}

function form<A>(
  issues: Issues,
  path: string,
  layer: ApplicationForm<A>,
  keys: LayerKeys,
): void {
  text(issues, `${path}.title`, layer.title);
  if (layer.aside !== undefined) text(issues, `${path}.aside`, layer.aside);
  const ids = new Set<string>();
  const field = (at: string, id: string, label: string) => {
    text(issues, `${at}.id`, id);
    text(issues, `${at}.label`, label);
    if (ids.has(id)) {
      issues.push({ path: `${at}.id`, message: "repeats a field id" });
    }
    ids.add(id);
  };
  for (const [index, entry] of layer.fields.entries()) {
    const at = `${path}.fields[${index}]`;
    field(at, entry.id, entry.label);
    if (entry.kind === "text") textField(issues, at, entry, keys);
    else if (entry.kind === "choice") choiceField(issues, at, entry);
    else if (entry.kind === "disclosure") {
      if (entry.summary !== undefined) {
        text(issues, `${at}.summary`, entry.summary);
      }
      if (entry.fields.length === 0) {
        issues.push({ path: `${at}.fields`, message: "must not be empty" });
      }
      for (const [position, inner] of entry.fields.entries()) {
        const where = `${at}.fields[${position}]`;
        field(where, inner.id, inner.label);
        if (inner.kind === "text") textField(issues, where, inner, keys);
        else if (inner.kind === "choice") choiceField(issues, where, inner);
        else {
          issues.push({
            path: `${where}.kind`,
            message: "field groups do not nest",
          });
        }
      }
    } else issues.push({ path: `${at}.kind`, message: "is not a form field" });
  }
  if (layer.preview !== undefined) {
    blocks(issues, `${path}.preview`, layer.preview);
  }
  runs(issues, `${path}.footnote`, layer.footnote);
  disclosures(
    issues,
    `${path}.disclosures`,
    layer.disclosures,
    keys,
    formTextFields(layer).length > 0,
  );
  buttons(issues, `${path}.buttons`, layer.buttons, keys, false);
}

function reader<A>(
  issues: Issues,
  path: string,
  layer: ApplicationReader<A>,
  keys: LayerKeys,
  lists: Set<string>,
): void {
  text(issues, `${path}.title`, layer.title);
  runs(issues, `${path}.aside`, layer.aside);
  blocks(issues, `${path}.blocks`, layer.blocks);
  if (layer.rows !== undefined) {
    list(issues, `${path}.rows`, layer.rows);
    // Selection is remembered by list id, so two lists may not share one.
    if (lists.has(layer.rows.id)) {
      issues.push({
        path: `${path}.rows.id`,
        message: "repeats the id of another list on screen",
      });
    }
    lists.add(layer.rows.id);
  }
  for (const [index, hint] of (layer.keys ?? []).entries()) {
    const at = `${path}.keys[${index}]`;
    if (typeof hint.key !== "string") {
      issues.push({ path: `${at}.key`, message: "must be one key" });
    } else keys.claim(`${at}.key`, hint.key, `reader key ${index}`);
    if (hint.label !== undefined) text(issues, `${at}.label`, hint.label);
    if (hint.action === undefined) {
      issues.push({ path: `${at}.action`, message: "is required" });
    }
  }
}

/** Check a view's layers and append every broken rule. */
export function layerRules<A>(
  issues: Issues,
  layers: readonly ApplicationLayer<A>[] | undefined,
  context: LayerRuleContext,
): void {
  if (layers === undefined) return;
  if (!Array.isArray(layers)) {
    issues.push({ path: "layers", message: "must be an array of layers" });
    return;
  }
  if (layers.length > APPLICATION_LAYER_DEPTH) {
    issues.push({
      path: "layers",
      message: `may hold at most ${APPLICATION_LAYER_DEPTH} layers`,
    });
  }
  const ids = new Set<string>();
  const lists = new Set(context.listIds ?? []);
  for (const [index, layer] of layers.entries()) {
    const path = `layers[${index}]`;
    text(issues, `${path}.id`, layer.id);
    if (ids.has(layer.id)) {
      issues.push({ path: `${path}.id`, message: "repeats a layer id" });
    }
    ids.add(layer.id);
    if (context.dismissedLayers?.includes(layer.id) === true) {
      issues.push({
        path: `${path}.id`,
        message:
          "was dismissed; the view that follows a dismissal must omit it",
      });
    }
    if (layer.scope !== "item" && layer.scope !== "global") {
      issues.push({ path: `${path}.scope`, message: "is not a layer scope" });
    }
    if (
      layer.anchor !== undefined &&
      !["detail", "bottom", "top", "full"].includes(layer.anchor)
    ) {
      issues.push({ path: `${path}.anchor`, message: "is not an anchor" });
    }
    const keys = new LayerKeys(issues, layer.kind);
    switch (layer.kind) {
      case "sheet":
        sheet(issues, path, layer, keys);
        break;
      case "menu":
        menu(issues, path, layer, keys);
        break;
      case "palette":
        palette(issues, path, layer);
        break;
      case "form":
        form(issues, path, layer, keys);
        break;
      case "reader":
        reader(issues, path, layer, keys, lists);
        break;
      default:
        issues.push({ path: `${path}.kind`, message: "is not a layer kind" });
        continue;
    }
    for (
      const [chord, binding] of context.layerBindings?.get(layer.id) ?? []
    ) {
      const at = `keymap.${layer.id}.${chord}`;
      if (keys.has(chord)) {
        issues.push({
          path: at,
          message: "collides with a key the layer already uses",
        });
      }
      if (
        layer.kind === "palette" && !binding.inFields
      ) {
        issues.push({
          path: at,
          message:
            "is unreachable: a palette's query owns input, so bind it in fields",
        });
      }
    }
  }
}
