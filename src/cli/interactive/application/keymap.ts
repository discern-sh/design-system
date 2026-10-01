/**
 * Caller key bindings over the keys the package reserves for navigation.
 * One key has one meaning in a scope: a binding that collides with a
 * reserved key or another binding throws before the terminal changes.
 *
 * @module
 */

import { type KeyChord, normalizeKeyChord } from "../../key-hints.ts";
import { isTerminalKeyName, type TerminalKey } from "../keys.ts";
import type { KeymapEntry } from "./view.ts";

/**
 * Chords a text field keeps for editing, following readline conventions. An
 * `inFields` binding may not use them, so typing never runs an action.
 */
export const EDITOR_RESERVED_CHORDS: readonly KeyChord[] = Object.freeze([
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

/**
 * Keys the package always handles while a list owns input: moving the
 * selection, Home and End, group jumps, scrolling the detail, Enter, Space
 * for zoom, Left to leave zoom, and `/` to filter. Escape is handled first
 * by the package — clearing a filter, leaving zoom, dismissing a message —
 * and reaches a binding only when there is nothing to close.
 */
export const TERMINAL_APPLICATION_RESERVED_KEYS: readonly KeyChord[] = Object
  .freeze([
    "up",
    "down",
    "home",
    "end",
    "page-up",
    "page-down",
    "shift-up",
    "shift-down",
    "tab",
    "shift-tab",
    "enter",
    "space",
    "left",
    "/",
  ]);

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
  ...EDITOR_RESERVED_CHORDS,
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

/** One resolved binding. */
export interface CompiledBinding<A> {
  readonly action: A;
  readonly inFields: boolean;
}

/** Validated bindings, ready to match decoded keys. */
export interface CompiledKeymap<A> {
  readonly base: ReadonlyMap<KeyChord, CompiledBinding<A>>;
  readonly layers: ReadonlyMap<
    string,
    ReadonlyMap<KeyChord, CompiledBinding<A>>
  >;
  readonly viKeys: boolean;
}

/** The keys reserved in the base scope for this configuration. */
export function reservedBaseChords(viKeys: boolean): ReadonlySet<KeyChord> {
  return new Set([
    ...TERMINAL_APPLICATION_RESERVED_KEYS,
    ...(viKeys ? ["j", "k"] : []),
  ]);
}

/**
 * Validate and index caller bindings. Collisions with reserved keys or
 * another binding in the same scope, and `inFields` bindings on printing or
 * editing keys, throw a `TypeError`.
 */
export function compileKeymap<A>(
  entries: readonly KeymapEntry<A>[] = [],
  viKeys = false,
): CompiledKeymap<A> {
  const reserved = reservedBaseChords(viKeys);
  const base = new Map<KeyChord, CompiledBinding<A>>();
  const layers = new Map<string, Map<KeyChord, CompiledBinding<A>>>();
  for (const entry of entries) {
    const chord = bindableChord(entry.key);
    const inFields = entry.inFields === true;
    if (inFields && (printable(chord) || FIELD_KEYS.has(chord))) {
      throw new TypeError(
        `${
          JSON.stringify(entry.key)
        } cannot be bound in fields: it types or edits text`,
      );
    }
    const scope = entry.scope ?? "base";
    let table: Map<KeyChord, CompiledBinding<A>>;
    if (scope === "base") {
      if (reserved.has(chord)) {
        throw new TypeError(
          `${JSON.stringify(entry.key)} is reserved for application navigation`,
        );
      }
      table = base;
    } else {
      if (typeof scope.layer !== "string" || scope.layer === "") {
        throw new TypeError("a layer binding names its layer");
      }
      table = layers.get(scope.layer) ?? new Map();
      layers.set(scope.layer, table);
    }
    if (table.has(chord)) {
      throw new TypeError(
        `${JSON.stringify(entry.key)} is bound twice in one scope`,
      );
    }
    table.set(chord, Object.freeze({ action: entry.action, inFields }));
  }
  return Object.freeze({ base, layers, viKeys });
}
