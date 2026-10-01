/**
 * Grouped list rendering: row anatomy with aligned trailing columns, the
 * selection bar, group headers, fold and summary rows, edge scrolling with
 * a sticky header, and honest overflow markers.
 *
 * @module
 */

import { terminalGlyph } from "../../terminal-glyphs.ts";
import { measureText, padText } from "../../text.ts";
import type { TerminalSurfaceRole } from "../../theme.ts";
import {
  type ListRow,
  type ListRowKey,
  type ListRows,
  rowKey,
} from "./list-model.ts";
import {
  clip,
  fitLine,
  ink,
  overflowMarker,
  type PaintContext,
  runInk,
  runText,
  spread,
  styleGlyph,
} from "./paint.ts";
import {
  DEFAULT_LIST_MIN_TITLE,
  DEFAULT_LIST_SPACING,
  type GroupedList,
  type GroupedListItem,
  type InlineRun,
  type ListColumn,
  type ListGaps,
} from "./view.ts";

/** Cells before an item's title: selection bar, space, marker, space. */
export const LIST_GUTTER = 4;

/** The rows kept between the selection and the viewport's edge while scrolling. */
const SCROLL_MARGIN = 1;

/** Which columns a list row shows at one width, and the title's share. */
export interface ListColumnLayout {
  readonly title: number;
  readonly columns: readonly ListColumn[];
  readonly gaps: ListGaps;
}

/** Cells a row needs besides its title. */
function fixedCells(columns: readonly ListColumn[], gaps: ListGaps): number {
  if (columns.length === 0) return LIST_GUTTER + gaps.pad;
  return LIST_GUTTER + gaps.afterTitle +
    columns.reduce((total, column) => total + column.width, 0) +
    (columns.length - 1) * gaps.between + gaps.pad;
}

/** Gaps for a list: roomy beside a wide detail or at full width on a roomy terminal. */
export function listGaps<A>(list: GroupedList<A>, roomy: boolean): ListGaps {
  const spacing = list.spacing ?? DEFAULT_LIST_SPACING;
  return roomy ? spacing.roomy : spacing.tight;
}

/** Whether a full-width list on this terminal is roomy. */
export function fullWidthRoomy<A>(
  list: GroupedList<A>,
  columns: number,
): boolean {
  const spacing = list.spacing ?? DEFAULT_LIST_SPACING;
  return columns >=
    (spacing.tightBelowColumns ?? DEFAULT_LIST_SPACING.tightBelowColumns ?? 56);
}

/**
 * Drop columns, lowest priority first, while the title would be narrower
 * than the list's minimum; columns without a priority never drop.
 */
export function layoutListColumns<A>(
  list: GroupedList<A>,
  width: number,
  gaps: ListGaps,
): ListColumnLayout {
  let shown = [...(list.columns ?? [])];
  const minimum = list.minTitle ?? DEFAULT_LIST_MIN_TITLE;
  while (width - fixedCells(shown, gaps) < minimum) {
    let drop = -1;
    for (const [index, column] of shown.entries()) {
      if (column.priority === undefined) continue;
      const current = shown[drop]?.priority;
      if (drop < 0 || current === undefined || column.priority <= current) {
        drop = index;
      }
    }
    if (drop < 0) break;
    shown = shown.filter((_, index) => index !== drop);
  }
  return {
    title: Math.max(1, width - fixedCells(shown, gaps)),
    columns: shown,
    gaps,
  };
}

/**
 * The width at which no column drops and the longest title, capped at
 * `maxTitle`, fits whole.
 */
export function neededListWidth<A>(
  list: GroupedList<A>,
  gaps: ListGaps,
  maxTitle: number,
): number {
  let longest = 0;
  for (const group of list.groups) {
    for (const item of group.items) {
      longest = Math.max(
        longest,
        measureText(item.title) +
          (item.titleSuffix === undefined ? 0 : measureText(item.titleSuffix)),
      );
    }
  }
  return fixedCells(list.columns ?? [], gaps) + Math.min(longest, maxTitle);
}

/** The visible slice of a list's rows. */
export interface ListWindow {
  readonly scroll: number;
  /** A header shown on the first line for the group the slice starts inside. */
  readonly sticky?: number;
  /** Rows shown after any sticky header. */
  readonly count: number;
  /** Items hidden above and below, those inside fold rows included. */
  readonly above: number;
  readonly below: number;
}

/** The slice that starts at `scroll` in `height` lines. */
export function listWindow<A>(
  rows: ListRows<A>,
  height: number,
  scroll: number,
): ListWindow {
  const total = rows.rows.length;
  const header = rows.headerOf[scroll] ?? -1;
  // A viewport under three rows has no room for a sticky header and a row.
  const sticky = header >= 0 && header < scroll && height >= 3
    ? header
    : undefined;
  const available = Math.max(1, height - (sticky === undefined ? 0 : 1));
  const remaining = total - scroll;
  const count = remaining > available ? Math.max(1, available - 1) : remaining;
  const end = scroll + count;
  return {
    scroll,
    ...(sticky === undefined ? {} : { sticky }),
    count,
    above: rows.heldPrefix[scroll] ?? 0,
    below: (rows.heldPrefix[total] ?? 0) - (rows.heldPrefix[end] ?? 0),
  };
}

/**
 * Scroll so the selection stays visible with one row of margin, moving the
 * viewport only when the selection reaches its edge. An anchor keeps the
 * selection on the viewport line it occupied before a view change; a
 * reveal row, such as the end of a group just unfolded, scrolls into view
 * as far as the selection allows. A viewport too short to hold the margin
 * as well as the selection, its sticky header, and its overflow markers
 * gives up the margin, never the selection.
 */
export function fitListScroll<A>(
  rows: ListRows<A>,
  height: number,
  selected: number,
  previous: number,
  anchor?: number,
  reveal?: number,
): number {
  const total = rows.rows.length;
  let maxScroll = Math.max(0, total - height);
  while (
    maxScroll < total - 1 && listWindow(rows, height, maxScroll).below > 0
  ) {
    maxScroll += 1;
  }
  const clamp = (value: number) => Math.max(0, Math.min(maxScroll, value));
  if (selected < 0) return clamp(previous);
  let scroll = clamp(previous);
  if (anchor !== undefined) {
    scroll = clamp(selected - anchor);
    if (listWindow(rows, height, scroll).sticky !== undefined) {
      scroll = clamp(scroll + 1);
    }
  }
  const shows = (at: number) =>
    selected >= at && selected < at + listWindow(rows, height, at).count;
  const fit = (margin: number, from: number): number => {
    let next = from;
    const before = Math.min(margin, selected);
    const after = Math.min(margin, total - 1 - selected);
    if (selected - before < next) next = clamp(selected - before);
    const needed = selected + after;
    for (let guard = 0; guard <= total; guard += 1) {
      const window = listWindow(rows, height, next);
      if (needed < next + window.count || next >= maxScroll) break;
      next = clamp(Math.max(next + 1, needed - window.count + 1));
    }
    if (reveal !== undefined && reveal > selected) {
      const limit = clamp(selected - before);
      while (
        next < limit &&
        reveal >= next + listWindow(rows, height, next).count
      ) next += 1;
    }
    return next;
  };
  const margined = fit(SCROLL_MARGIN, scroll);
  return shows(margined) ? margined : fit(0, scroll);
}

interface RowPaint {
  readonly selected: boolean;
  readonly receded: boolean;
  readonly surface: TerminalSurfaceRole | undefined;
}

function rowPaint(selected: boolean, receded: boolean): RowPaint {
  return {
    selected,
    receded,
    surface: selected ? receded ? "selectionMuted" : "selection" : undefined,
  };
}

/** The selection bar cell: an accent bar, a faint one when receded, or blank. */
function bar(context: PaintContext, paint: RowPaint): string {
  if (!paint.selected) return " ";
  return ink(context, terminalGlyph("selection", context.capabilities), {
    tone: paint.receded ? "faint" : "accent",
  }, paint.surface);
}

/** Fit a cell's runs, dropping whole trailing runs before truncating the first. */
export function fitCell(
  context: PaintContext,
  runs: readonly InlineRun[],
  column: ListColumn,
  surface: TerminalSurfaceRole | undefined,
): string {
  const blank = (run: InlineRun | undefined) =>
    run !== undefined && runText(context, run).trim() === "";
  const kept = runs.filter((run) => runText(context, run) !== "");
  // Spacing that only separated runs which dropped out — such as an ASCII
  // form that removes a qualifier — must not shift the cell's alignment.
  while (kept.length > 0 && blank(kept.at(-1))) kept.pop();
  while (kept.length > 0 && blank(kept[0])) kept.shift();
  while (
    kept.length > 1 &&
    measureText(kept.map((run) => runText(context, run)).join("")) >
      column.width
  ) {
    kept.pop();
    while (kept.length > 1 && blank(kept.at(-1))) kept.pop();
  }
  let used = 0;
  const parts = kept.map((run) => {
    const text = clip(context, runText(context, run), column.width - used);
    used += measureText(text);
    return ink(context, text, runInk(run, "ink"), surface);
  });
  return padText(parts.join(""), column.width, column.align ?? "start");
}

function titleCell<A>(
  context: PaintContext,
  item: GroupedListItem<A>,
  width: number,
  paint: RowPaint,
): string {
  const suffix = item.titleSuffix === undefined
    ? ""
    : clip(context, item.titleSuffix, Math.floor(width / 2));
  const title = clip(context, item.title, width - measureText(suffix));
  return padText(
    `${
      ink(context, title, { tone: "ink", bold: paint.selected }, paint.surface)
    }${ink(context, suffix, { tone: "faint" }, paint.surface)}`,
    width,
  );
}

function itemLine<A>(
  context: PaintContext,
  item: GroupedListItem<A>,
  layout: ListColumnLayout,
  width: number,
  paint: RowPaint,
): string {
  const columns = layout.columns.map((column) =>
    fitCell(context, item.cells?.[column.id] ?? [], column, paint.surface)
  );
  const trailing = columns.length === 0
    ? ""
    : `${" ".repeat(layout.gaps.afterTitle)}${
      columns.join(" ".repeat(layout.gaps.between))
    }`;
  const content = `${bar(context, paint)} ${
    styleGlyph(context, item.marker, paint.surface)
  } ${titleCell(context, item, layout.title, paint)}${trailing}`;
  return fitLine(context, content, width, paint.surface);
}

function headerLine<A>(
  context: PaintContext,
  row: Extract<ListRow<A>, { kind: "header" }>,
  width: number,
  paint: RowPaint,
  marker: string,
): string {
  const lead = row.key === undefined
    ? "  "
    : `${bar(context, paint)} ${
      ink(context, terminalGlyph("unfolded", context.capabilities), {
        tone: "faint",
      }, paint.surface)
    } `;
  const aside = row.group.aside === undefined
    ? ""
    : `  ${
      row.group.aside.map((run) =>
        ink(context, runText(context, run), runInk(run, "faint"), paint.surface)
      ).join("")
    }`;
  const content = `${lead}${
    ink(context, row.group.title, { tone: "ink", bold: true }, paint.surface)
  }${ink(context, `  ${row.count}`, { tone: "faint" }, paint.surface)}${aside}`;
  return fitLine(
    context,
    spread(context, content, marker, width),
    width,
    paint.surface,
  );
}

function foldLine<A>(
  context: PaintContext,
  row: Extract<ListRow<A>, { kind: "fold" }>,
  width: number,
  paint: RowPaint,
  marker: string,
): string {
  const separator = ` ${terminalGlyph("separator", context.capabilities)} `;
  const part = (index: number) => {
    const folded = row.groups[index];
    if (folded === undefined) return "";
    return `${
      ink(
        context,
        folded.group.shortTitle ?? folded.group.title,
        { tone: "muted" },
        paint.surface,
      )
    }${ink(context, ` ${folded.count}`, { tone: "faint" }, paint.surface)}`;
  };
  const room = width - LIST_GUTTER - 1;
  let shown = row.groups.length;
  const compose = (count: number): string => {
    const parts = Array.from({ length: count }, (_, index) => part(index));
    const rest = row.groups.length - count;
    if (rest > 0) {
      parts.push(ink(context, `+${rest}`, { tone: "faint" }, paint.surface));
    }
    return parts.join(
      ink(context, separator, { tone: "faint" }, paint.surface),
    );
  };
  while (shown > 1 && measureText(compose(shown)) > room) shown -= 1;
  const [only] = row.groups;
  const aside = row.groups.length === 1 && only?.group.aside !== undefined
    ? `  ${
      only.group.aside.map((run) =>
        ink(context, runText(context, run), runInk(run, "faint"), paint.surface)
      ).join("")
    }`
    : "";
  const content = `${bar(context, paint)} ${
    ink(context, terminalGlyph("folded", context.capabilities), {
      tone: "faint",
    }, paint.surface)
  } ${compose(shown)}${aside}`;
  return fitLine(
    context,
    spread(context, content, marker, width),
    width,
    paint.surface,
  );
}

/**
 * Render one row at a width. A marker, such as an overflow count, sits
 * against the end of a header, fold, or blank row.
 */
export function renderListRow<A>(
  context: PaintContext,
  row: ListRow<A>,
  layout: ListColumnLayout,
  width: number,
  selected: boolean,
  receded = false,
  marker = "",
): string {
  const paint = rowPaint(selected, receded);
  switch (row.kind) {
    case "blank":
      return fitLine(context, spread(context, "", marker, width), width);
    case "header":
      return headerLine(context, row, width, paint, marker);
    case "item":
      return itemLine(context, row.item, layout, width, paint);
    case "fold":
      return foldLine(context, row, width, paint, marker);
  }
}

/** One rendered list viewport. */
export interface RenderedList {
  readonly lines: readonly string[];
  /** The selectable row each line shows, for clicks; undefined elsewhere. */
  readonly keys: readonly (ListRowKey | undefined)[];
  readonly scroll: number;
  /** The selection's line, when visible. */
  readonly line?: number;
}

/** Inputs for one list viewport. */
export interface ListViewport<A> {
  readonly rows: ListRows<A>;
  readonly list: GroupedList<A>;
  readonly layout: ListColumnLayout;
  readonly width: number;
  readonly height: number;
  readonly selected: number;
  readonly scroll: number;
  readonly anchor?: number;
  /** A row to bring into view as far as the selection allows. */
  readonly reveal?: number;
  readonly receded?: boolean;
  readonly filtering: boolean;
}

/** Render a list into exactly `height` lines. */
export function renderListViewport<A>(
  context: PaintContext,
  viewport: ListViewport<A>,
): RenderedList {
  const { rows, width, height, layout } = viewport;
  if (rows.rows.length === 0) {
    const empty = ink(
      context,
      viewport.filtering ? context.copy.noMatches : context.copy.noItems,
      { tone: "faint" },
    );
    return {
      lines: Array.from(
        { length: height },
        (_, index) => fitLine(context, index === 0 ? `  ${empty}` : "", width),
      ),
      keys: Array.from({ length: height }, () => undefined),
      scroll: 0,
    };
  }
  const scroll = fitListScroll(
    rows,
    height,
    viewport.selected,
    viewport.scroll,
    viewport.anchor,
    viewport.reveal,
  );
  const window = listWindow(rows, height, scroll);
  const lines: string[] = [];
  const keys: (ListRowKey | undefined)[] = [];
  let line: number | undefined;
  const marker = (direction: "up" | "down", count: number) =>
    count > 0
      ? `${
        ink(context, overflowMarker(context, direction, count), {
          tone: "faint",
        })
      }${" ".repeat(layout.gaps.pad)}`
      : "";
  const render = (index: number, trailing: string) => {
    const row = rows.rows[index];
    return row === undefined ? fitLine(context, "", width) : renderListRow(
      context,
      row,
      layout,
      width,
      index === viewport.selected,
      viewport.receded === true,
      trailing,
    );
  };
  const first = window.sticky ?? scroll;
  lines.push(render(first, marker("up", window.above)));
  keys.push(rowKey(rows.rows[first]));
  if (first === viewport.selected) line = 0;
  for (
    let index = scroll + (window.sticky === undefined ? 1 : 0);
    index < scroll + window.count;
    index += 1
  ) {
    if (index === viewport.selected) line = lines.length;
    lines.push(render(index, ""));
    keys.push(rowKey(rows.rows[index]));
  }
  if (window.below > 0) {
    lines.push(
      fitLine(
        context,
        spread(context, "", marker("down", window.below), width),
        width,
      ),
    );
    keys.push(undefined);
  }
  while (lines.length < height) {
    lines.push(fitLine(context, "", width));
    keys.push(undefined);
  }
  return {
    lines: lines.slice(0, height),
    keys: keys.slice(0, height),
    scroll,
    ...(line === undefined ? {} : { line }),
  };
}
