/**
 * Caller key bindings over the keys the package reserves for navigation.
 * One key has one meaning in a scope: a binding that collides with a
 * reserved key or another binding throws before the terminal changes.
 *
 * @module
 */

import { type KeyChord, normalizeKeyChord } from "../../key-hints.ts";
import { isTerminalKeyName, type TerminalKey } from "../keys.ts";
import type { ApplicationLayer, ApplicationLayerKind } from "./layer-view.ts";
import { isApplicationMarkdown } from "./markdown-reading.ts";
import type { TerminalApplicationViewIssue } from "./validate-rules.ts";
import type {
  ApplicationBody,
  ApplicationKeyBinding,
  ApplicationList,
} from "./view.ts";

/**
 * Chords a text field keeps for editing, following readline conventions. An
 * `inFields` binding may not use them, so typing never runs an action.
 */
export const APPLICATION_EDITOR_KEYS: readonly KeyChord[] = Object.freeze([
  "ctrl-a",
  "ctrl-b",
  "ctrl-d",
  "ctrl-e",
  "ctrl-f",
  "ctrl-h",
  "ctrl-n",
  "ctrl-p",
  "ctrl-u",
  "ctrl-w",
]);

/** Keys a list moves through, whatever its body. */
const LIST_KEYS: readonly KeyChord[] = [
  "up",
  "down",
  "home",
  "end",
  "page-up",
  "page-down",
  "tab",
  "shift-tab",
  "enter",
];

/** Options for {@linkcode terminalApplicationReservedKeys}. */
export interface TerminalApplicationReservedKeyOptions {
  /** Whether j and k move as well. */
  readonly viKeys?: boolean;
}

/**
 * The keys the package handles in the base scope for one body, which a
 * caller binding may not take. A list moves with the arrows, Home, End,
 * the page keys, Tab, and Shift+Tab, and runs or folds with Enter; `/`
 * filters when the list declares a filter. A master-detail body adds
 * Shift+Up and Shift+Down to scroll its detail, Space to zoom, and Left to
 * leave zoom. A reading body scrolls with the arrows, page keys, Home, and
 * End; a Markdown one also moves between its links with Tab and Shift+Tab
 * and follows the focused link with Enter. An empty body runs its primary with Enter, and with a list below
 * keeps the list's keys, Up and Down moving between the primary and the
 * list. With `viKeys`, j and k move wherever a list or document does.
 * Escape is handled first by the package and reaches a binding only when
 * nothing is left to close; Ctrl+C cancels unless a base binding claims it.
 */
export function terminalApplicationReservedKeys<A>(
  body: ApplicationBody<A>,
  options: TerminalApplicationReservedKeyOptions = {},
): readonly KeyChord[] {
  const vi: readonly KeyChord[] = options.viKeys === true ? ["j", "k"] : [];
  const filter = (list: ApplicationList<A> | undefined): readonly KeyChord[] =>
    list?.filter === undefined ? [] : ["/"];
  switch (body.kind) {
    case "master-detail":
      return [
        ...LIST_KEYS,
        "shift-up",
        "shift-down",
        "space",
        "left",
        ...filter(body.list),
        ...vi,
      ];
    case "list":
      return [...LIST_KEYS, ...filter(body.list), ...vi];
    case "reading":
      return [
        "up",
        "down",
        "home",
        "end",
        "page-up",
        "page-down",
        ...(isApplicationMarkdown(body.content)
          ? ["tab", "shift-tab", "enter"]
          : []),
        ...vi,
      ];
    case "empty":
      return body.list === undefined
        ? ["enter"]
        : [...LIST_KEYS, ...filter(body.list), ...vi];
  }
}

/**
 * Keys the package handles in each kind of layer while focus is not in a
 * text field. Escape is the safe choice or Back in every layer. A palette's
 * query always owns input, so its bindings must be field bindings.
 */
const LAYER_KEYS: Readonly<
  Record<ApplicationLayerKind, readonly KeyChord[]>
> = Object.freeze({
  sheet: Object.freeze([
    "up",
    "down",
    "page-up",
    "page-down",
    "home",
    "end",
    "left",
    "right",
    "tab",
    "shift-tab",
    "enter",
    "space",
    "escape",
  ]),
  form: Object.freeze([
    "up",
    "down",
    "page-up",
    "page-down",
    "home",
    "end",
    "left",
    "right",
    "tab",
    "shift-tab",
    "enter",
    "space",
    "escape",
  ]),
  menu: Object.freeze([
    "up",
    "down",
    "page-up",
    "page-down",
    "home",
    "end",
    "left",
    "right",
    "tab",
    "shift-tab",
    "enter",
    "escape",
    "/",
  ]),
  palette: Object.freeze([
    "up",
    "down",
    "page-up",
    "page-down",
    "enter",
    "escape",
  ]),
  reader: Object.freeze([
    "up",
    "down",
    "page-up",
    "page-down",
    "home",
    "end",
    "left",
    "tab",
    "shift-tab",
    "enter",
    "escape",
  ]),
});

/**
 * The keys the package handles in one layer while focus is not in a text
 * field, which a layer binding may not take. Escape is the safe choice or
 * Back in every layer. Sheets and forms move, scroll, page, and choose with
 * the arrows, page keys, Home, End, Tab, Shift+Tab, Enter, and Space; menus
 * add Right and drop Space, and claim `/` unless `filter` is false; a
 * palette's query owns input, so it keeps only movement, Enter, and
 * Escape; readers move and scroll with the arrows, page keys, Home, End,
 * Tab, and Shift+Tab, open rows with Enter, and go back with Left.
 */
export function terminalApplicationLayerKeys<A>(
  layer: ApplicationLayer<A>,
): readonly KeyChord[] {
  const keys = LAYER_KEYS[layer.kind];
  return layer.kind === "menu" && layer.filter === false
    ? keys.filter((key) => key !== "/")
    : keys;
}

/** Named keys a focused text field uses for editing and leaving. */
const FIELD_KEYS: ReadonlySet<string> = new Set([
  "left",
  "right",
  "home",
  "end",
  "up",
  "down",
  "backspace",
  "delete",
  "option-backspace",
  "enter",
  "escape",
  "tab",
  "shift-tab",
  ...APPLICATION_EDITOR_KEYS,
]);

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** The chord a decoded key matches, or undefined for an unknown sequence. */
export function keyChordOf(key: TerminalKey): KeyChord | undefined {
  if (key.kind === "named") return key.name;
  if (key.kind === "text") return key.text === " " ? "space" : key.text;
  return undefined;
}

/** Normalise a chord, or undefined when no decoded key matches it. */
export function decodableChord(chord: KeyChord): KeyChord | undefined {
  const normal = normalizeKeyChord(chord);
  if (normal === " " || normal === "space") return "space";
  if (isTerminalKeyName(normal)) return normal;
  const graphemes = [...segmenter.segment(normal)];
  return graphemes.length === 1 && !/[\p{Cc}\p{Cf}]/u.test(normal)
    ? normal
    : undefined;
}

/** Normalise a bound chord, or throw when no key decodes to it. */
export function bindableChord(chord: KeyChord): KeyChord {
  const normal = decodableChord(chord);
  if (normal === undefined) {
    throw new TypeError(`no terminal key decodes to ${JSON.stringify(chord)}`);
  }
  return normal;
}

/** Whether a chord types text into a field. */
function printable(chord: KeyChord): boolean {
  return chord === "space" || !isTerminalKeyName(chord);
}

/** Whether a normalised chord types or edits text, so a field keeps it. */
export function fieldOwnsChord(chord: KeyChord): boolean {
  return printable(chord) || FIELD_KEYS.has(chord);
}

/** One resolved binding. */
export interface CompiledBinding<A> {
  readonly action: A;
  readonly inFields: boolean;
}

/** Validated bindings, ready to match decoded keys. */
export interface CompiledKeymap<A> {
  /** The entries as the caller wrote them, for checking each adopted view. */
  readonly entries: readonly ApplicationKeyBinding<A>[];
  readonly base: ReadonlyMap<KeyChord, CompiledBinding<A>>;
  readonly layers: ReadonlyMap<
    string,
    ReadonlyMap<KeyChord, CompiledBinding<A>>
  >;
  readonly viKeys: boolean;
}

/** The scope a keymap entry binds in: `base` or a layer id. */
export function entryScope<A>(
  entry: ApplicationKeyBinding<A>,
): string | undefined {
  const scope = entry.scope ?? "base";
  if (scope === "base") return "base";
  return typeof scope.layer === "string" && scope.layer !== ""
    ? scope.layer
    : undefined;
}

/**
 * The keymap rules that hold whatever the view: every key decodes, a scope
 * names its layer, a key means one thing per scope, an `inFields` binding
 * neither types nor edits text, and Ctrl+C is bound only in the base scope.
 * Each broken rule is an issue located by `keymap[index]`.
 */
export function keymapIssues<A>(
  entries: readonly ApplicationKeyBinding<A>[],
): readonly TerminalApplicationViewIssue[] {
  const issues: TerminalApplicationViewIssue[] = [];
  const seen = new Map<string, Set<KeyChord>>();
  for (const [index, entry] of entries.entries()) {
    const path = `keymap[${index}]`;
    const chord = typeof entry.key === "string"
      ? decodableChord(entry.key)
      : undefined;
    if (chord === undefined) {
      issues.push({
        path: `${path}.key`,
        message: `no terminal key decodes to ${JSON.stringify(entry.key)}`,
      });
      continue;
    }
    if (entry.inFields === true && fieldOwnsChord(chord)) {
      issues.push({
        path: `${path}.inFields`,
        message: `${JSON.stringify(entry.key)} types or edits text`,
      });
    }
    const scope = entryScope(entry);
    if (scope === undefined) {
      issues.push({ path: `${path}.scope`, message: "names no layer" });
      continue;
    }
    // Ctrl+C means one thing everywhere: a base binding applies beneath
    // every layer and at every size.
    if (scope !== "base" && chord === "ctrl-c") {
      issues.push({
        path: `${path}.scope`,
        message: '"ctrl-c" is bound in the base scope only',
      });
    }
    const chords = seen.get(scope) ?? new Set<KeyChord>();
    seen.set(scope, chords);
    if (chords.has(chord)) {
      issues.push({
        path: `${path}.key`,
        message: `${JSON.stringify(entry.key)} is bound twice in one scope`,
      });
    }
    chords.add(chord);
  }
  return issues;
}

/**
 * The rules a keymap keeps against one view: a base binding takes no key
 * the view's body reserves, and a layer binding takes no key its layer
 * already gives meaning to (checked with the layer rules).
 */
export function keymapViewIssues<A>(
  keymap: CompiledKeymap<A>,
  body: ApplicationBody<A>,
): readonly TerminalApplicationViewIssue[] {
  const reserved = new Set(
    terminalApplicationReservedKeys(body, { viKeys: keymap.viKeys }),
  );
  const issues: TerminalApplicationViewIssue[] = [];
  for (const [index, entry] of keymap.entries.entries()) {
    if (entryScope(entry) !== "base") continue;
    const chord = decodableChord(entry.key);
    if (chord !== undefined && reserved.has(chord)) {
      issues.push({
        path: `keymap[${index}].key`,
        message: `${
          JSON.stringify(entry.key)
        } is reserved for navigation in a ${body.kind} body`,
      });
    }
  }
  return issues;
}

/** Throw a `TypeError` naming every issue, when there are any. */
export function throwIssues(
  what: string,
  issues: readonly TerminalApplicationViewIssue[],
): void {
  if (issues.length === 0) return;
  throw new TypeError(
    `${what} breaks ${issues.length} rule${issues.length === 1 ? "" : "s"}: ${
      issues.slice(0, 5).map((issue) => `${issue.path} ${issue.message}`)
        .join("; ")
    }`,
  );
}

/**
 * Validate and index caller bindings. A broken keymap rule throws a
 * `TypeError` naming every issue; collisions with what a view reserves are
 * checked as each view is adopted.
 */
export function compileKeymap<A>(
  entries: readonly ApplicationKeyBinding<A>[] = [],
  viKeys = false,
): CompiledKeymap<A> {
  throwIssues("application keymap", keymapIssues(entries));
  const base = new Map<KeyChord, CompiledBinding<A>>();
  const layers = new Map<string, Map<KeyChord, CompiledBinding<A>>>();
  for (const entry of entries) {
    const chord = bindableChord(entry.key);
    const scope = entryScope(entry) ?? "base";
    const table = scope === "base" ? base : layers.get(scope) ?? new Map();
    if (scope !== "base") layers.set(scope, table);
    table.set(
      chord,
      Object.freeze({
        action: entry.action,
        inFields: entry.inFields === true,
      }),
    );
  }
  return Object.freeze({
    entries: Object.freeze([...entries]),
    base,
    layers,
    viKeys,
  });
}
