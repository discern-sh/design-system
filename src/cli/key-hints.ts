/**
 * Key hints: the one-line footer that names what each key does now, laid
 * out as a left cluster and a pinned right cluster that collapse through a
 * fixed, deterministic ladder as the terminal narrows.
 *
 * @module
 */

import { styleText, type TerminalTextStyle } from "./ansi.ts";
import { asciiSpelling } from "./ascii-text.ts";
import type { TerminalCapabilities } from "./capabilities.ts";
import { terminalGlyph, type TerminalGlyphName } from "./terminal-glyphs.ts";
import { measureText, truncateStyledText, truncateText } from "./text.ts";
import {
  resolveTerminalTheme,
  type TerminalAppearance,
  terminalTextToneColor,
  type TerminalThemeVariant,
} from "./theme.ts";

/**
 * One key or chord, spelled as the terminal key decoder names it —
 * `"enter"`, `"escape"`, `"space"`, `"tab"`, `"shift-tab"`, `"up"`,
 * `"shift-down"`, `"page-down"`, `"ctrl-k"`, `"f1"` — or as one printable
 * character such as `"."`, `"/"`, or `"D"`. Any other text renders
 * verbatim as a word, for hints such as "Letters" or "Type".
 */
export type KeyChord = string;

/**
 * One hint: the key, and what pressing it does now. A hint only names a
 * key; whatever runs when it is pressed is bound elsewhere.
 */
export interface KeyHint {
  /** One key, or several shown together such as `["up", "down"]`. */
  readonly key: KeyChord | readonly KeyChord[];
  readonly label?: string;
}

/** The complete footer: what the renderer is allowed to show and drop. */
export interface KeyHints {
  /** Primary first; hints drop from the end to fit, the first never. */
  readonly left: readonly KeyHint[];
  /**
   * Whether the first left hint is the primary action, its key drawn in the
   * accent; defaults to true. A cluster with no primary — keys whose Enter
   * does nothing, say — sets false, and every key draws in ink. The first
   * hint still never drops.
   */
  readonly primary?: boolean;
  /** Pinned to the right edge; below `compactBelowColumns` labels drop from the end. */
  readonly right?: readonly KeyHint[];
  /** Appended to the right cluster, in order, only while the left fits whole. */
  readonly extra?: readonly KeyHint[];
  /** Width below which gaps tighten and right labels may drop; defaults to 56. */
  readonly compactBelowColumns?: number;
}

/** Presentation inputs for key hints. */
export interface KeyHintsOptions {
  readonly theme?: TerminalThemeVariant;
  readonly appearance?: TerminalAppearance;
}

/** One hint as placed on the line, with its cell range for hit-testing. */
export interface PlacedKeyHint {
  readonly hint: KeyHint;
  readonly cluster: "left" | "right";
  /** First cell, zero-based, of the hint's key. */
  readonly start: number;
  /** Cell after the hint's last visible cell. */
  readonly end: number;
  readonly labelShown: boolean;
}

/** A laid-out footer line and where each surviving hint sits. */
export interface KeyHintsLayout {
  /** Exactly `width` cells. */
  readonly line: string;
  readonly placed: readonly PlacedKeyHint[];
}

/** Default width below which key hints tighten, as in a phone-width terminal. */
export const KEY_HINTS_COMPACT_BELOW_COLUMNS = 56;
const HINT_GAP = 3;
const COMPACT_HINT_GAP = 2;
const CLUSTER_GAP = 3;
const EXTRA_CLUSTER_GAP = 6;

/** Keys shown as their terminal glyph, falling back to a word without Unicode. */
const GLYPH_CHORDS: Readonly<Record<string, TerminalGlyphName>> = {
  enter: "enter",
  up: "up",
  down: "down",
  left: "left",
  right: "right",
};

/** Keys shown as a word in every repertoire. */
const WORD_CHORDS: Readonly<Record<string, string>> = {
  escape: "Esc",
  space: "Space",
  tab: "Tab",
  backspace: "Backspace",
  "option-backspace": "Alt+Backspace",
  delete: "Del",
  home: "Home",
  end: "End",
  "page-up": "PgUp",
  "page-down": "PgDn",
};

function namedChord(chord: string): boolean {
  return GLYPH_CHORDS[chord] !== undefined ||
    WORD_CHORDS[chord] !== undefined || /^f(?:[1-9]|1[0-2])$/u.test(chord);
}

const CHORD_ALIASES: Readonly<Record<string, string>> = {
  esc: "escape",
  return: "enter",
  pageup: "page-up",
  pagedown: "page-down",
  del: "delete",
};

/**
 * Normalise a chord to the key decoder's spelling: `ctrl+k` becomes
 * `ctrl-k`, `pageDown` becomes `page-down`, and `esc` becomes `escape`.
 * Single characters keep their case, so `D` stays distinct from `d`.
 */
export function normalizeKeyChord(chord: KeyChord): KeyChord {
  if ([...chord].length <= 1) return chord;
  const lowered = chord.replace(/([a-z])([A-Z])/gu, "$1-$2").toLowerCase();
  if (namedChord(lowered)) return lowered;
  const modifier = lowered.match(/^(ctrl|shift|alt|option)[+-](.+)$/u);
  if (modifier !== null) {
    const [, name = "", rest = ""] = modifier;
    const key = normalizeKeyChord(rest);
    return `${name === "option" ? "alt" : name}-${key}`;
  }
  return CHORD_ALIASES[lowered.replaceAll("-", "")] ??
    (namedChord(lowered) ? lowered : chord);
}

function formatOne(
  chord: KeyChord,
  capabilities: Pick<TerminalCapabilities, "unicode">,
): string {
  const normal = normalizeKeyChord(chord);
  const glyph = GLYPH_CHORDS[normal];
  if (glyph !== undefined) return terminalGlyph(glyph, capabilities);
  const word = WORD_CHORDS[normal];
  if (word !== undefined) return word;
  const ctrl = normal.match(/^ctrl-(.)$/u);
  if (ctrl !== null) return `^${(ctrl[1] ?? "").toUpperCase()}`;
  const shift = normal.match(/^shift-(.+)$/u);
  if (shift !== null) {
    return `${terminalGlyph("shift", capabilities)}${
      formatOne(shift[1] ?? "", capabilities)
    }`;
  }
  const alt = normal.match(/^alt-(.+)$/u);
  if (alt !== null) return `Alt+${formatOne(alt[1] ?? "", capabilities)}`;
  if (/^f(?:[1-9]|1[0-2])$/u.test(normal)) return normal.toUpperCase();
  return chord;
}

/**
 * Display one chord, or several shown as one hint. Arrows and Enter use
 * their terminal glyphs, falling back to names without Unicode; Ctrl
 * chords read `^K`; several one-cell keys join directly (`↑↓`), anything
 * wider joins with a slash (`Up/Down`).
 */
export function formatKeyChord(
  chord: KeyChord | readonly KeyChord[],
  capabilities: Pick<TerminalCapabilities, "unicode">,
): string {
  const chords = typeof chord === "string" ? [chord] : chord;
  const parts = chords.map((part) => formatOne(part, capabilities));
  return parts.every((part) => measureText(part) === 1)
    ? parts.join("")
    : parts.join("/");
}

interface Candidate {
  readonly hint: KeyHint;
  readonly key: string;
  readonly label: string;
  readonly primary: boolean;
}

interface Shown extends Candidate {
  readonly withLabel: boolean;
}

function hintWidth(hint: Shown): number {
  return measureText(hint.key) +
    (hint.withLabel && hint.label !== "" ? 1 + measureText(hint.label) : 0);
}

function clusterWidth(hints: readonly Shown[], gap: number): number {
  return hints.reduce((total, hint) => total + hintWidth(hint), 0) +
    Math.max(0, hints.length - 1) * gap;
}

function lineWidth(
  left: readonly Shown[],
  right: readonly Shown[],
  gap: number,
): number {
  const between = left.length > 0 && right.length > 0 ? CLUSTER_GAP : 0;
  return clusterWidth(left, gap) + between + clusterWidth(right, gap);
}

function validColumns(label: string, value: number, minimum: number): void {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new TypeError(
      `${label} must be a safe integer of at least ${minimum}; received ${value}`,
    );
  }
}

/**
 * Lay out key hints on one line of exactly `width` cells. The ladder is
 * fixed: extras join the right cluster in order while the whole left
 * cluster still leaves six cells between the clusters; left hints then
 * drop from the end, never the primary; below `compactBelowColumns` gaps
 * tighten from three cells to two and right labels drop from the end —
 * a hint whose key is one printable character drops whole instead, since
 * such a key says nothing alone; the primary label then shortens with an
 * ellipsis; any right label that is left drops; right hints drop from the
 * end; and finally the line clips.
 * The primary key is strong accent — unless `primary` is false — other
 * keys strong ink, and labels muted, so the key stays distinct from its
 * words; without colour the key keeps bold where the capabilities allow it.
 */
export function layoutKeyHintsCli(
  hints: KeyHints,
  width: number,
  capabilities: TerminalCapabilities,
  options: KeyHintsOptions = {},
): KeyHintsLayout {
  validColumns("key hints width", width, 0);
  const compactBelow = hints.compactBelowColumns ??
    KEY_HINTS_COMPACT_BELOW_COLUMNS;
  validColumns("compactBelowColumns", compactBelow, 0);
  const compact = width < compactBelow;
  const gap = compact ? COMPACT_HINT_GAP : HINT_GAP;
  const ellipsis = terminalGlyph("ellipsis", capabilities);
  const candidate = (hint: KeyHint, primary: boolean): Shown => ({
    hint,
    key: formatKeyChord(hint.key, capabilities),
    label: capabilities.unicode
      ? hint.label ?? ""
      : asciiSpelling(hint.label ?? ""),
    primary,
    withLabel: true,
  });
  let left = hints.left.map((hint, index) =>
    candidate(hint, index === 0 && hints.primary !== false)
  );
  let right = (hints.right ?? []).map((hint) => candidate(hint, false));
  const fits = () => lineWidth(left, right, gap) <= width;

  for (const extra of hints.extra ?? []) {
    const next = [...right, candidate(extra, false)];
    if (
      clusterWidth(left, gap) + EXTRA_CLUSTER_GAP + clusterWidth(next, gap) >
        width
    ) break;
    right = next;
  }
  while (!fits() && left.length > 1) left = left.slice(0, -1);
  // A key of one printable ASCII character, such as "." or "q", says
  // nothing on its own, so such a hint drops whole rather than its label.
  const bare = (hint: Shown): boolean => /^[!-~]$/u.test(hint.key);
  const dropRightLabel = (): boolean => {
    const index = right.findLastIndex((hint) =>
      hint.withLabel && hint.label !== ""
    );
    if (index < 0) return false;
    const target = right[index];
    right = target !== undefined && bare(target)
      ? right.filter((_, at) => at !== index)
      : right.map((hint, at) =>
        at === index ? { ...hint, withLabel: false } : hint
      );
    return true;
  };
  if (compact) { while (!fits() && dropRightLabel()); }
  const primary = left[0];
  if (!fits() && primary !== undefined && primary.label !== "") {
    const room = width - (lineWidth(left, right, gap) - hintWidth(primary)) -
      measureText(primary.key) - 1;
    left = room >= 1 + measureText(ellipsis)
      ? [{ ...primary, label: truncateText(primary.label, room, ellipsis) }]
      : [{ ...primary, withLabel: false }];
  }
  while (!fits() && dropRightLabel());
  while (!fits() && right.length > 0) right = right.slice(0, -1);

  return paint(left, right, gap, width, capabilities, options);
}

function paint(
  left: readonly Shown[],
  right: readonly Shown[],
  gap: number,
  width: number,
  capabilities: TerminalCapabilities,
  options: KeyHintsOptions,
): KeyHintsLayout {
  const theme = resolveTerminalTheme(options);
  const style = (hint: Shown): TerminalTextStyle => ({
    bold: true,
    color: terminalTextToneColor(theme, hint.primary ? "accent" : "ink"),
  });
  const labelStyle: TerminalTextStyle = {
    color: terminalTextToneColor(theme, "muted"),
  };
  const placed: PlacedKeyHint[] = [];
  const cluster = (
    hints: readonly Shown[],
    name: "left" | "right",
    origin: number,
  ): string => {
    let cursor = origin;
    return hints.map((hint, index) => {
      const lead = index === 0 ? 0 : gap;
      const start = cursor + lead;
      const label = hint.withLabel && hint.label !== ""
        ? ` ${styleText(hint.label, labelStyle, capabilities)}`
        : "";
      cursor = start + hintWidth(hint);
      placed.push({
        hint: hint.hint,
        cluster: name,
        start,
        end: cursor,
        labelShown: label !== "",
      });
      return `${" ".repeat(lead)}${
        styleText(hint.key, style(hint), capabilities)
      }${label}`;
    }).join("");
  };
  const leftText = cluster(left, "left", 0);
  const leftWidth = clusterWidth(left, gap);
  const rightWidth = clusterWidth(right, gap);
  const rightStart = Math.max(leftWidth, width - rightWidth);
  const rightText = cluster(right, "right", rightStart);
  const visible = placed.filter((hint) => hint.end <= width);
  const line = `${leftText}${" ".repeat(rightStart - leftWidth)}${rightText}`;
  const clipped = measureText(line) > width
    ? truncateStyledText(line, width, "")
    : line;
  return {
    line: `${clipped}${" ".repeat(Math.max(0, width - measureText(clipped)))}`,
    placed: visible,
  };
}

/** Render key hints on one line of exactly `width` cells. */
export function renderKeyHintsCli(
  hints: KeyHints,
  width: number,
  capabilities: TerminalCapabilities,
  options: KeyHintsOptions = {},
): string {
  return layoutKeyHintsCli(hints, width, capabilities, options).line;
}
