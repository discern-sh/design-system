/**
 * The structural rules every view part shares: text, counts, tones, runs,
 * glyphs, key hints, lists, and detail blocks. Each rule appends issues
 * located by a path into the view.
 *
 * @module
 */

import { measureText } from "../../text.ts";
import { TERMINAL_TEXT_TONES } from "../../theme.ts";
import type { KeyHints } from "../../key-hints.ts";
import type {
  ApplicationGlyph,
  DetailBlock,
  GroupedList,
  InlineRun,
  ListGaps,
} from "./view.ts";

/** One broken view rule, located by a path into the view. */
export interface TerminalApplicationViewIssue {
  readonly path: string;
  readonly message: string;
}

/** Issues collected while checking one view. */
export type Issues = TerminalApplicationViewIssue[];

const TONES: ReadonlySet<string> = new Set(TERMINAL_TEXT_TONES);
const ROLES: ReadonlySet<string> = new Set([
  "title",
  "body",
  "label",
  "key",
  "code",
]);

/** Glyph forms already measured; a list repeats a handful of them. */
const cells = new Map<string, boolean>();

function oneCell(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const known = cells.get(value);
  if (known !== undefined) return known;
  const result = controlFree(value) && measureText(value) === 1;
  if (cells.size >= 1024) cells.clear();
  cells.set(value, result);
  return result;
}

/** Whether text holds no control or format characters. */
export function controlFree(value: string): boolean {
  return !/[\p{Cc}\p{Cf}]/u.test(value);
}

/** Cells a tab becomes in a multi-line field. */
const FIELD_TAB = "    ";

/**
 * Text a caller writes into a field, made safe to edit and paint: line
 * breaks become newlines in a multi-line field and spaces in a one-line
 * field, tabs become spaces, and every other control or format character
 * is dropped, keeping only the joiners that emoji and joined scripts need.
 */
export function fieldText(value: string, multiline: boolean): string {
  const lines = value.replace(/\r\n?/gu, "\n");
  const broken = multiline ? lines : lines.replaceAll("\n", " ");
  return broken
    .replaceAll("\t", multiline ? FIELD_TAB : " ")
    .replace(
      /[\p{Cc}\p{Cf}]/gu,
      (character) =>
        character === "\n" || character === "\u200c" || character === "\u200d"
          ? character
          : "",
    );
}

/** A control-free string, non-blank unless `empty` allows it. */
export function text(
  issues: Issues,
  path: string,
  value: unknown,
  empty = false,
): void {
  if (typeof value !== "string") {
    issues.push({ path, message: "must be a string" });
  } else if (!controlFree(value)) {
    issues.push({ path, message: "must not contain control characters" });
  } else if (!empty && value.trim() === "") {
    issues.push({ path, message: "must not be empty" });
  }
}

/** A safe integer of at least `minimum`. */
export function count(
  issues: Issues,
  path: string,
  value: unknown,
  minimum: number,
): void {
  if (
    typeof value !== "number" || !Number.isSafeInteger(value) ||
    value < minimum
  ) {
    issues.push({ path, message: `must be an integer of at least ${minimum}` });
  }
}

/** A known text tone, when present. */
export function tone(issues: Issues, path: string, value: unknown): void {
  if (value !== undefined && !TONES.has(String(value))) {
    issues.push({ path, message: `is not a text tone: ${String(value)}` });
  }
}

/** Inline runs with control-free text, known tones, and known roles. */
export function runs(
  issues: Issues,
  path: string,
  value: readonly InlineRun[] | undefined,
): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push({ path, message: "must be an array of runs" });
    return;
  }
  for (const [index, run] of value.entries()) {
    text(issues, `${path}[${index}].text`, run.text, true);
    if (run.ascii !== undefined) {
      text(issues, `${path}[${index}].ascii`, run.ascii, true);
    }
    tone(issues, `${path}[${index}].tone`, run.tone);
    if (run.role !== undefined && !ROLES.has(run.role)) {
      issues.push({ path: `${path}[${index}].role`, message: "is unknown" });
    }
  }
}

/** A present glyph whose Unicode and ASCII forms are one cell each. */
export function glyph(
  issues: Issues,
  path: string,
  value: ApplicationGlyph | undefined,
): void {
  if (value === undefined) {
    issues.push({ path, message: "is required" });
    return;
  }
  for (const form of ["unicode", "ascii"] as const) {
    if (!oneCell(value[form])) {
      issues.push({ path: `${path}.${form}`, message: "must be one cell" });
    }
  }
  tone(issues, `${path}.tone`, value.tone);
  if (value.animation !== undefined && value.animation !== "spinner") {
    issues.push({
      path: `${path}.animation`,
      message: 'must be "spinner"',
    });
  }
}

function gaps(issues: Issues, path: string, value: ListGaps): void {
  count(issues, `${path}.afterTitle`, value.afterTitle, 0);
  count(issues, `${path}.between`, value.between, 0);
  count(issues, `${path}.pad`, value.pad, 0);
}

/** Key hints whose keys and labels are non-empty text. */
export function hints<A>(
  issues: Issues,
  path: string,
  value: KeyHints<A> | undefined,
): void {
  if (value === undefined) return;
  for (const cluster of ["left", "right", "extra"] as const) {
    for (const [index, hint] of (value[cluster] ?? []).entries()) {
      const keys = typeof hint.key === "string" ? [hint.key] : hint.key;
      if (keys.length === 0) {
        issues.push({
          path: `${path}.${cluster}[${index}].key`,
          message: "must name a key",
        });
      }
      for (const key of keys) {
        text(issues, `${path}.${cluster}[${index}].key`, key);
      }
      if (hint.label !== undefined) {
        text(issues, `${path}.${cluster}[${index}].label`, hint.label, true);
      }
    }
  }
}

/** One list's structure, identities, and presentation numbers. */
export function list<A>(
  issues: Issues,
  path: string,
  value: GroupedList<A>,
): void {
  text(issues, `${path}.id`, value.id);
  const columns = new Set<string>();
  for (const [index, column] of (value.columns ?? []).entries()) {
    const at = `${path}.columns[${index}]`;
    text(issues, `${at}.id`, column.id);
    if (columns.has(column.id)) {
      issues.push({ path: `${at}.id`, message: "repeats a column id" });
    }
    columns.add(column.id);
    count(issues, `${at}.width`, column.width, 1);
    if (column.priority !== undefined && !Number.isFinite(column.priority)) {
      issues.push({ path: `${at}.priority`, message: "must be finite" });
    }
  }
  if (value.minTitle !== undefined) {
    count(issues, `${path}.minTitle`, value.minTitle, 1);
  }
  if (value.spacing !== undefined) {
    gaps(issues, `${path}.spacing.roomy`, value.spacing.roomy);
    gaps(issues, `${path}.spacing.tight`, value.spacing.tight);
    if (value.spacing.tightBelowColumns !== undefined) {
      count(
        issues,
        `${path}.spacing.tightBelowColumns`,
        value.spacing.tightBelowColumns,
        1,
      );
    }
  }
  if (value.settleMs !== undefined) {
    count(issues, `${path}.settleMs`, value.settleMs, 0);
  }
  if (value.filter !== undefined) {
    text(issues, `${path}.filter.placeholder`, value.filter.placeholder);
  }
  const groups = new Set<string>();
  const items = new Set<string>();
  for (const [index, group] of value.groups.entries()) {
    const at = `${path}.groups[${index}]`;
    text(issues, `${at}.id`, group.id);
    text(issues, `${at}.title`, group.title);
    if (group.shortTitle !== undefined) {
      text(issues, `${at}.shortTitle`, group.shortTitle);
    }
    if (groups.has(group.id)) {
      issues.push({ path: `${at}.id`, message: "repeats a group id" });
    }
    groups.add(group.id);
    if (group.count !== undefined) count(issues, `${at}.count`, group.count, 0);
    runs(issues, `${at}.aside`, group.aside);
    for (const [position, item] of group.items.entries()) {
      const where = `${at}.items[${position}]`;
      text(issues, `${where}.id`, item.id);
      text(issues, `${where}.title`, item.title);
      if (item.titleSuffix !== undefined) {
        text(issues, `${where}.titleSuffix`, item.titleSuffix);
      }
      if (items.has(item.id)) {
        issues.push({ path: `${where}.id`, message: "repeats an item id" });
      }
      items.add(item.id);
      glyph(issues, `${where}.marker`, item.marker);
      for (const [column, cell] of Object.entries(item.cells ?? {})) {
        if (!columns.has(column)) {
          issues.push({
            path: `${where}.cells.${column}`,
            message: "names no declared column",
          });
        }
        runs(issues, `${where}.cells.${column}`, cell);
      }
    }
  }
}

/** Detail blocks, with sections one level deep. */
export function blocks(
  issues: Issues,
  path: string,
  value: readonly DetailBlock[],
  depth = 0,
): void {
  for (const [index, block] of value.entries()) {
    const at = `${path}[${index}]`;
    switch (block.kind) {
      case "heading":
        text(issues, `${at}.title`, block.title);
        if (block.aside !== undefined) text(issues, `${at}.aside`, block.aside);
        if (block.subtitle !== undefined) {
          text(issues, `${at}.subtitle`, block.subtitle);
        }
        break;
      case "state":
        glyph(issues, `${at}.glyph`, block.glyph);
        text(issues, `${at}.label`, block.label);
        tone(issues, `${at}.tone`, block.tone);
        if (block.qualifier !== undefined) {
          text(issues, `${at}.qualifier`, block.qualifier);
        }
        break;
      case "text":
        runs(issues, `${at}.runs`, block.runs);
        break;
      case "facts":
        for (const [row, fact] of block.rows.entries()) {
          text(issues, `${at}.rows[${row}].label`, fact.label);
          for (const [line, value] of fact.value.entries()) {
            runs(issues, `${at}.rows[${row}].value[${line}]`, value);
          }
        }
        break;
      case "meter":
        if (!Number.isFinite(block.value)) {
          issues.push({ path: `${at}.value`, message: "must be finite" });
        }
        if (
          block.max !== undefined && (!Number.isFinite(block.max) ||
            block.max <= 0)
        ) {
          issues.push({ path: `${at}.max`, message: "must be positive" });
        }
        text(issues, `${at}.caption`, block.caption, true);
        break;
      case "marks":
        for (const [item, mark] of block.items.entries()) {
          glyph(issues, `${at}.items[${item}].mark`, mark.mark);
          runs(issues, `${at}.items[${item}].runs`, mark.runs);
        }
        break;
      case "hints":
        for (const [item, hint] of block.items.entries()) {
          text(issues, `${at}.items[${item}].label`, hint.label);
          if (hint.description !== undefined) {
            text(issues, `${at}.items[${item}].description`, hint.description);
          }
        }
        break;
      case "block":
        break;
      case "pending":
        text(issues, `${at}.label`, block.label);
        break;
      case "section":
        text(issues, `${at}.title`, block.title);
        if (block.count !== undefined) {
          count(issues, `${at}.count`, block.count, 0);
        }
        if (block.caption !== undefined) {
          text(issues, `${at}.caption`, block.caption);
        }
        if (depth > 0) {
          issues.push({ path: at, message: "sections do not nest" });
        } else blocks(issues, `${at}.blocks`, block.blocks, depth + 1);
        break;
      default:
        issues.push({ path: at, message: "is not a detail block" });
    }
  }
}
