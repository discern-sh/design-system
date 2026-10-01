/**
 * The view rules as data. Every issue is a caller error: the runtime refuses
 * a view with issues before it reaches the screen.
 *
 * @module
 */

import { measureText } from "../../text.ts";
import { TERMINAL_TEXT_TONES } from "../../theme.ts";
import type { KeyHints } from "../../key-hints.ts";
import { decodableChord } from "./keymap.ts";
import type {
  ApplicationGlyph,
  DetailBlock,
  GroupedList,
  InlineRun,
  ListGaps,
  SplitRules,
  TerminalApplicationView,
} from "./view.ts";

/** One broken view rule, located by a path into the view. */
export interface TerminalApplicationViewIssue {
  readonly path: string;
  readonly message: string;
}

/** Facts from the running application that a new view must respect. */
export interface TerminalApplicationViewContext {
  /** Message ids the application reported dismissed; the view must omit them. */
  readonly dismissedMessages?: readonly string[];
}

type Issues = TerminalApplicationViewIssue[];

const TONES: ReadonlySet<string> = new Set(TERMINAL_TEXT_TONES);
const ROLES: ReadonlySet<string> = new Set([
  "title",
  "body",
  "label",
  "key",
  "code",
]);

function controlFree(value: string): boolean {
  return !/[\p{Cc}\p{Cf}]/u.test(value);
}

function text(issues: Issues, path: string, value: unknown, empty = false) {
  if (typeof value !== "string") {
    issues.push({ path, message: "must be a string" });
  } else if (!controlFree(value)) {
    issues.push({ path, message: "must not contain control characters" });
  } else if (!empty && value.trim() === "") {
    issues.push({ path, message: "must not be empty" });
  }
}

function count(
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

function tone(issues: Issues, path: string, value: unknown): void {
  if (value !== undefined && !TONES.has(String(value))) {
    issues.push({ path, message: `is not a text tone: ${String(value)}` });
  }
}

function runs(
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

function glyph(
  issues: Issues,
  path: string,
  value: ApplicationGlyph | undefined,
): void {
  if (value === undefined) {
    issues.push({ path, message: "is required" });
    return;
  }
  for (const form of ["unicode", "ascii"] as const) {
    const cell = value[form];
    if (
      typeof cell !== "string" || !controlFree(cell) || measureText(cell) !== 1
    ) {
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

function hints<A>(
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

/** Validate one list's structure, identities, and presentation numbers. */
function list<A>(issues: Issues, path: string, value: GroupedList<A>): void {
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

function blocks(
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

function split(issues: Issues, path: string, value: SplitRules): void {
  count(issues, `${path}.wideAtColumns`, value.wideAtColumns, 1);
  count(issues, `${path}.collapseBelowColumns`, value.collapseBelowColumns, 1);
  if (value.wideAtColumns < value.collapseBelowColumns) {
    issues.push({
      path: `${path}.wideAtColumns`,
      message: "must be at least collapseBelowColumns",
    });
  }
  count(issues, `${path}.list.min`, value.list.min, 1);
  if (value.list.sizing === "content") {
    count(issues, `${path}.list.maxTitle`, value.list.maxTitle, 1);
  } else if (
    !(value.list.share > 0 && value.list.share < 1) ||
    value.list.max < value.list.min
  ) {
    issues.push({
      path: `${path}.list`,
      message: "share must lie between 0 and 1, with max at least min",
    });
  }
  count(issues, `${path}.detailMin.standard`, value.detailMin.standard, 1);
  count(issues, `${path}.detailMin.wide`, value.detailMin.wide, 1);
  for (const tier of ["standard", "wide"] as const) {
    for (const [side, cells] of value.detailPadding[tier].entries()) {
      count(issues, `${path}.detailPadding.${tier}[${side}]`, cells, 0);
    }
  }
  count(issues, `${path}.strip.shortBelowRows`, value.strip.shortBelowRows, 1);
}

/**
 * Check a view against the application rules and return every broken rule.
 * An empty result means the view may be shown.
 */
export function validateTerminalApplicationView<A>(
  view: TerminalApplicationView<A>,
  context: TerminalApplicationViewContext = {},
): readonly TerminalApplicationViewIssue[] {
  const issues: Issues = [];
  runs(issues, "header.leading", view.header.leading);
  runs(issues, "header.trailing", view.header.trailing);
  for (const [index, chip] of (view.header.chips ?? []).entries()) {
    runs(issues, `header.chips[${index}].runs`, chip.runs);
  }
  const liveness = view.header.liveness;
  if (liveness !== undefined) {
    for (const state of ["idle", "busy", "retrying", "stale"] as const) {
      text(issues, `header.liveness.labels.${state}`, liveness.labels[state]);
    }
    if (!["idle", "busy", "retrying", "stale"].includes(liveness.state)) {
      issues.push({ path: "header.liveness.state", message: "is unknown" });
    }
    if (liveness.busyAfterMs !== undefined) {
      count(issues, "header.liveness.busyAfterMs", liveness.busyAfterMs, 0);
    }
  }
  const body = view.body;
  switch (body.kind) {
    case "master-detail":
      list(issues, "body.list", body.list);
      if (body.detail.follows !== body.list.id) {
        issues.push({
          path: "body.detail.follows",
          message: "must name the body's list",
        });
      }
      for (const [id, content] of Object.entries(body.detail.content)) {
        blocks(issues, `body.detail.content.${id}`, content);
      }
      for (const [id, strip] of Object.entries(body.detail.strip ?? {})) {
        runs(issues, `body.detail.strip.${id}.title`, strip.title);
        for (const [index, fact] of strip.facts.entries()) {
          runs(issues, `body.detail.strip.${id}.facts[${index}]`, fact);
        }
      }
      for (const [id, crumb] of Object.entries(body.detail.breadcrumb ?? {})) {
        runs(issues, `body.detail.breadcrumb.${id}`, crumb);
      }
      if (body.detail.pending !== undefined) {
        text(issues, "body.detail.pending", body.detail.pending);
      }
      if (body.split !== undefined) split(issues, "body.split", body.split);
      hints(issues, "body.zoomFooter", body.zoomFooter);
      break;
    case "list":
      list(issues, "body.list", body.list);
      break;
    case "reading":
      text(issues, "body.id", body.id);
      break;
    case "empty":
      text(issues, "body.title", body.title);
      runs(issues, "body.body", body.body);
      hints(issues, "body.primary", { left: [body.primary] });
      hints(issues, "body.secondary", { left: body.secondary ?? [] });
      if (body.list !== undefined) list(issues, "body.list", body.list);
      break;
    default:
      issues.push({ path: "body.kind", message: "is not a body kind" });
  }
  const message = view.message;
  if (message !== undefined) {
    text(issues, "message.id", message.id);
    tone(issues, "message.tone", message.tone);
    runs(issues, "message.runs", message.runs);
    runs(issues, "message.trailing", message.trailing);
    if (message.dismiss?.afterMs !== undefined) {
      count(issues, "message.dismiss.afterMs", message.dismiss.afterMs, 1);
    }
    if (context.dismissedMessages?.includes(message.id) === true) {
      issues.push({
        path: "message.id",
        message:
          "was dismissed; the view that follows a dismissal must omit it",
      });
    }
  }
  hints(issues, "footer", view.footer);
  for (const [cluster, value] of Object.entries(view.footer)) {
    if (!Array.isArray(value)) continue;
    for (const [index, hint] of value.entries()) {
      const keys = typeof hint.key === "string" ? [hint.key] : hint.key;
      for (const key of keys) {
        // A hint may name a word such as "Letters" instead of one key.
        if (
          decodableChord(key) === undefined && !/^[\p{L}\p{N} ]+$/u.test(key)
        ) {
          issues.push({
            path: `footer.${cluster}[${index}].key`,
            message: "is neither a key nor a word",
          });
        }
      }
    }
  }
  if (view.windowTitle !== undefined) {
    text(issues, "windowTitle", view.windowTitle, true);
  }
  if (
    view.input?.mouse !== undefined && typeof view.input.mouse !== "boolean"
  ) {
    issues.push({ path: "input.mouse", message: "must be a boolean" });
  }
  return issues;
}

/** Throw a `TypeError` naming every broken rule. */
export function assertTerminalApplicationView<A>(
  view: TerminalApplicationView<A>,
  context: TerminalApplicationViewContext = {},
): void {
  const issues = validateTerminalApplicationView(view, context);
  if (issues.length === 0) return;
  throw new TypeError(
    `application view breaks ${issues.length} rule${
      issues.length === 1 ? "" : "s"
    }: ${
      issues.slice(0, 5).map((issue) => `${issue.path} ${issue.message}`)
        .join("; ")
    }`,
  );
}
