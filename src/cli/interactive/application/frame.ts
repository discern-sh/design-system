/**
 * One application frame: the header bar, the body laid out for the
 * terminal's width and height tier, the message line, and key hints. The
 * renderer also settles the geometry-dependent decisions the model defers —
 * density, list width, and scroll — and returns the model it fitted.
 *
 * @module
 */

import type { TerminalCapabilities } from "../../capabilities.ts";
import type { CliPresentationOptions } from "../../contracts.ts";
import { renderCliBlock } from "../../block-composition.ts";
import { cliPresentationPassthrough } from "../../contracts.ts";
import {
  formatKeyChord,
  type KeyHint,
  type KeyHints,
  layoutKeyHintsCli,
} from "../../key-hints.ts";
import { terminalFrameGlyphs } from "../../box.ts";
import { terminalGlyph } from "../../terminal-glyphs.ts";
import {
  measureText,
  padText,
  truncateStyledText,
  wrapStyledText,
} from "../../text.ts";
import type { TerminalSize } from "../io.ts";
import { isTerminalKeyName } from "../keys.ts";
import type { TerminalApplicationStateReport } from "../state-report.ts";
import {
  renderDetailBlocks,
  renderStrip,
  scrollDetail,
} from "./detail-render.ts";
import { decodableChord } from "./keymap.ts";
import {
  decideListDensity,
  keyItemId,
  listLayoutKey,
  type ListRows,
  rowGroupIds,
  rowIndexForKey,
} from "./list-model.ts";
import {
  fullWidthRoomy,
  layoutListColumns,
  listGaps,
  neededListWidth,
  renderListViewport,
} from "./list-render.ts";
import {
  bodyList,
  listModelRows,
  type TerminalApplicationLayout,
  type TerminalApplicationListModel,
  type TerminalApplicationModel,
  terminalApplicationState,
  visibleMessage,
} from "./model.ts";
import {
  fitLine,
  ink,
  type PaintContext,
  paintContext,
  spread,
  styleGlyph,
  styleRuns,
  type TerminalApplicationMotion,
} from "./paint.ts";
import {
  DEFAULT_SPLIT_RULES,
  type DetailBlock,
  type GroupedList,
  type HeaderBar,
  type MasterDetailBody,
  type SplitRules,
} from "./view.ts";

/** Minimum geometry: a header, a list row with its state, a strip line, and key hints. */
export const TERMINAL_APPLICATION_MINIMUM: TerminalSize = Object.freeze({
  columns: 32,
  rows: 10,
});

/** From this many rows a blank line separates the header from the body. */
const SPACIOUS_ROWS = 20;

/** One exact frame and the model fitted to it. */
export interface TerminalApplicationFrame<A> {
  readonly frame: string;
  readonly model: TerminalApplicationModel<A>;
  readonly layout: TerminalApplicationLayout;
  /** Caller blocks rendered for this frame; cached blocks are not counted. */
  readonly renderCalls: number;
  /** Whether a visible glyph moves, so the animation tick should keep running. */
  readonly animated: boolean;
  /** The window title the view asks for. */
  readonly windowTitle?: string;
  /** The navigation identities a state report announces. */
  readonly report: TerminalApplicationStateReport;
}

interface Region {
  readonly top: number;
  readonly height: number;
  /**
   * Rows a message line borrows from the body. Density is decided as if the
   * message were absent, so a passing message never folds or unfolds groups;
   * the list scrolls instead.
   */
  readonly borrowed: number;
}

interface FrameContext extends PaintContext {
  renderCalls: number;
}

const readingCache = new WeakMap<
  object,
  { readonly key: string; readonly lines: readonly string[] }
>();

function header<A>(
  context: FrameContext,
  model: TerminalApplicationModel<A>,
  bar: HeaderBar<A>,
  columns: number,
): string {
  const now = context.motion.now ?? 0;
  const listView = bodyList(model.view);
  const list = listView === undefined ? undefined : model.lists[listView.id];
  let leading = styleRuns(context, bar.leading, undefined);
  if (listView?.filter !== undefined && list?.filter !== undefined) {
    const rows = listModelRows(list);
    const cursor = list.filter.editing
      ? ink(context, terminalGlyph("cursor", context.capabilities), {
        tone: "accent",
      })
      : "";
    leading = `${
      ink(context, listView.filter.placeholder, { tone: "faint" })
    }  ${ink(context, list.filter.query, { tone: "ink" })}${cursor}  ${
      ink(context, `${rows.matched} of ${rows.total}`, { tone: "faint" })
    }`;
  }
  const liveness = bar.liveness;
  const busyShown = liveness?.state === "busy" &&
    now >= (model.busySince ?? now) + (liveness.busyAfterMs ?? 0);
  const state = liveness === undefined
    ? undefined
    : liveness.state === "busy" && !busyShown
    ? "idle"
    : liveness.state;
  const live = liveness === undefined || state === undefined
    ? ""
    : state === "busy"
    ? `${
      styleGlyph(context, {
        unicode: "◐",
        ascii: "@",
        tone: "accent",
        animation: "spinner",
      }, undefined)
    } ${ink(context, liveness.labels.busy, { tone: "muted" })}`
    : state === "stale"
    ? ink(
      context,
      `${
        terminalGlyph("attention", context.capabilities)
      } ${liveness.labels.stale}`,
      { tone: "warning" },
    )
    : ink(context, liveness.labels[state], { tone: "faint" });
  const chips = (bar.chips ?? []).map((chip) =>
    styleRuns(context, chip.runs, undefined)
  );
  const trailing = styleRuns(context, bar.trailing, undefined);
  const room = columns - 4;
  const compose = (
    parts: readonly string[],
    withLive: boolean,
    gap: number,
  ): string => {
    const right = parts.filter((part) => part !== "").join(" ".repeat(gap));
    return withLive && live !== ""
      ? right === "" ? live : `${right}${" ".repeat(gap + 1)}${live}`
      : right;
  };
  const leadWidth = measureText(leading);
  const ladder: (() => string)[] = [
    () => compose([...chips, trailing], true, 3),
    () => compose([...chips, trailing], true, 2),
    ...chips.map((_, index) => () =>
      compose([...chips.slice(0, chips.length - index - 1), trailing], true, 2)
    ),
    () => compose([trailing], false, 2),
    () => "",
  ];
  let right = "";
  for (const step of ladder) {
    right = step();
    if (right === "" || leadWidth + 2 + measureText(right) <= room) break;
  }
  const rightWidth = measureText(right);
  const left = truncateStyledText(
    leading,
    Math.max(0, room - (rightWidth === 0 ? 0 : rightWidth + 2)),
    terminalGlyph("ellipsis", context.capabilities),
  );
  return fitLine(context, `  ${spread(left, right, room)}`, columns);
}

function footerHints<A>(
  model: TerminalApplicationModel<A>,
): KeyHints<A> {
  const view = model.view;
  const listView = bodyList(view);
  const list = listView === undefined ? undefined : model.lists[listView.id];
  if (list?.filter?.editing === true) {
    const keep = (hint: KeyHint<A>) =>
      (typeof hint.key === "string" ? [hint.key] : hint.key).every((key) => {
        const chord = decodableChord(key);
        return chord !== undefined && chord !== "space" &&
          isTerminalKeyName(chord);
      });
    return {
      left: [
        { key: "enter", label: "Done" },
        { key: ["up", "down"], label: "Move" },
        { key: "escape", label: "Clear" },
      ],
      right: (view.footer.right ?? []).filter(keep),
    };
  }
  if (list?.zoomed === true && view.body.kind === "master-detail") {
    if (view.body.zoomFooter !== undefined) return view.body.zoomFooter;
    const [primary, ...rest] = view.footer.left;
    return {
      left: [
        ...(primary === undefined ? [] : [primary]),
        { key: ["up", "down"], label: "Next" },
        ...rest,
      ],
      right: [{ key: "left", label: "Back" }, ...(view.footer.right ?? [])],
    };
  }
  return view.footer;
}

function footer<A>(
  context: FrameContext,
  model: TerminalApplicationModel<A>,
  columns: number,
): string {
  const layout = layoutKeyHintsCli(
    footerHints(model),
    Math.max(0, columns - 4),
    context.capabilities,
    cliPresentationPassthrough(context.presentation),
  );
  return fitLine(context, `  ${layout.line}`, columns);
}

function messageLine<A>(
  context: FrameContext,
  model: TerminalApplicationModel<A>,
  columns: number,
): string | undefined {
  const message = visibleMessage(model);
  if (message === undefined) return undefined;
  const left = styleRuns(
    context,
    message.runs,
    undefined,
    message.tone ?? "muted",
  );
  const right = styleRuns(context, message.trailing, undefined, "faint");
  return fitLine(context, `  ${spread(left, right, columns - 4)}`, columns);
}

/** The width tier a master-detail body uses at this many columns. */
function splitTier(
  split: SplitRules,
  columns: number,
): "wide" | "standard" | "strip" {
  if (columns >= split.wideAtColumns) return "wide";
  return columns >= split.collapseBelowColumns ? "standard" : "strip";
}

function contentListWidth<A>(
  list: GroupedList<A>,
  split: SplitRules,
  tier: "wide" | "standard",
  columns: number,
): number {
  const detailMin = split.detailMin[tier];
  const sizing = split.list;
  const preferred = sizing.sizing === "content"
    ? Math.max(
      sizing.min,
      neededListWidth(list, listGaps(list, tier === "wide"), sizing.maxTitle),
    )
    : Math.max(
      sizing.min,
      Math.min(sizing.max, Math.round(columns * sizing.share)),
    );
  return Math.max(1, Math.min(preferred, columns - detailMin));
}

/**
 * Settle density and width for this geometry and membership; the decision
 * stands until either changes, so pressing keys never refolds the list.
 */
function fitDensity<A>(
  list: TerminalApplicationListModel<A>,
  available: number,
  geometry: string,
  width: (display: GroupedList<A>) => number | undefined,
): TerminalApplicationListModel<A> {
  const key = `${geometry}|${listLayoutKey(list.display)}`;
  if (list.density?.key === key) return list;
  const base = {
    ...list,
    density: { key, separators: true, densityFolds: [] },
  };
  const rows = listModelRows(base);
  const selected = rows.rows[rowIndexForKey(rows.rows, list.selection)];
  const decision = decideListDensity(
    list.display,
    new Set(list.folds),
    available,
    rowGroupIds(selected),
  );
  const fitted = width(list.display);
  return {
    ...list,
    density: {
      key,
      ...decision,
      ...(fitted === undefined ? {} : { width: fitted }),
    },
  };
}

interface ListPaint<A> {
  readonly lines: readonly string[];
  readonly list: TerminalApplicationListModel<A>;
}

function paintList<A>(
  context: FrameContext,
  model: TerminalApplicationModel<A>,
  view: GroupedList<A>,
  list: TerminalApplicationListModel<A>,
  width: number,
  height: number,
  roomy: boolean,
  receded = false,
): ListPaint<A> {
  const rows = listModelRows(list);
  const selected = model.view.body.kind === "empty" && model.primaryFocused
    ? -1
    : rowIndexForKey(rows.rows, list.selection);
  const reveal = list.reveal === undefined
    ? -1
    : rows.rows.findLastIndex((row) =>
      rowGroupIds(row).some((id) => list.reveal?.includes(id) === true)
    );
  const rendered = renderListViewport(context, {
    rows,
    list: view,
    layout: layoutListColumns(view, width, listGaps(view, roomy)),
    width,
    height,
    selected,
    scroll: list.scroll,
    ...(list.anchor === undefined ? {} : { anchor: list.anchor }),
    ...(reveal < 0 ? {} : { reveal }),
    receded,
    filtering: list.filter !== undefined,
  });
  const { anchor: _anchor, line: _line, reveal: _reveal, ...rest } = list;
  return {
    lines: rendered.lines,
    list: {
      ...rest,
      scroll: rendered.scroll,
      ...(rendered.line === undefined ? {} : { line: rendered.line }),
    },
  };
}

function detailBlocks<A>(
  body: MasterDetailBody<A>,
  itemId: string | undefined,
): readonly DetailBlock[] {
  if (itemId === undefined) return [];
  return body.detail.content[itemId] ??
    [{ kind: "pending", label: body.detail.pending ?? "Loading…" }];
}

function crumb<A>(
  context: FrameContext,
  body: MasterDetailBody<A>,
  rows: ListRows<A>,
  selected: number,
  width: number,
): string {
  const row = rows.rows[selected];
  const itemId = row?.kind === "item" ? row.item.id : undefined;
  const custom = itemId === undefined
    ? undefined
    : body.detail.breadcrumb?.[itemId];
  const separator = `  ${terminalGlyph("crumb", context.capabilities)}  `;
  const left = custom !== undefined
    ? styleRuns(context, custom, "surface", "muted")
    : row?.kind === "item"
    ? `${ink(context, row.group.title, { tone: "faint" }, "surface")}${
      ink(context, separator, { tone: "faint" }, "surface")
    }${ink(context, row.item.title, { tone: "muted" }, "surface")}`
    : "";
  const position = row?.kind === "item"
    ? ink(
      context,
      `${(rows.itemPrefix[selected] ?? 0) + 1} of ${
        rows.itemPrefix.at(-1) ?? 0
      }`,
      { tone: "faint" },
      "surface",
    )
    : "";
  return spread(left, position, width);
}

interface BodyResult<A> {
  readonly lines: readonly string[];
  readonly model: TerminalApplicationModel<A>;
  readonly layout: TerminalApplicationLayout;
  readonly listRows: number;
  readonly detailRows: number;
  readonly readingRows: number;
}

function withList<A>(
  model: TerminalApplicationModel<A>,
  id: string,
  list: TerminalApplicationListModel<A>,
): TerminalApplicationModel<A> {
  return { ...model, lists: { ...model.lists, [id]: list } };
}

function scrolled<A>(
  model: TerminalApplicationModel<A>,
  itemId: string | undefined,
  scroll: number,
): TerminalApplicationModel<A> {
  if (itemId === undefined || (model.detailScroll[itemId] ?? 0) === scroll) {
    return model;
  }
  return {
    ...model,
    detailScroll: { ...model.detailScroll, [itemId]: scroll },
  };
}

function masterDetail<A>(
  context: FrameContext,
  model: TerminalApplicationModel<A>,
  body: MasterDetailBody<A>,
  size: TerminalSize,
  region: Region,
  short: boolean,
): BodyResult<A> {
  const { columns } = size;
  const split = body.split ?? DEFAULT_SPLIT_RULES;
  const listModel = model.lists[body.list.id];
  if (listModel === undefined) throw new TypeError("list model is missing");
  const tier = splitTier(split, columns);
  const stripLines = short || size.rows < split.strip.shortBelowRows ? 1 : 2;
  const rule = context.painted ? 0 : 1;
  const listHeight = tier === "strip"
    ? Math.max(1, region.height - stripLines - rule)
    : region.height;
  const fitted = fitDensity(
    listModel,
    listHeight + region.borrowed,
    `${columns}x${size.rows}`,
    (display) =>
      tier === "strip"
        ? undefined
        : contentListWidth(display, split, tier, columns),
  );
  const rows = listModelRows(fitted);
  const selected = rowIndexForKey(rows.rows, fitted.selection);
  const itemId = keyItemId(fitted.selection);
  const blocks = detailBlocks(body, itemId);
  if (fitted.zoomed && itemId !== undefined) {
    const [left] = split.detailPadding.standard;
    const width = Math.max(1, columns - 2 * left);
    const pad = short ? 0 : 1;
    const lines = renderDetailBlocks(context, blocks, {
      width,
      wide: true,
      surface: "surface",
    });
    const viewport = scrollDetail(
      context,
      lines,
      Math.max(1, region.height - 1 - pad),
      model.detailScroll[itemId] ?? 0,
      width,
      false,
    );
    const inset = " ".repeat(left);
    const top = [crumb(context, body, rows, selected, width)];
    if (pad > 0) top.push("");
    const shown = [...top, ...viewport.lines].slice(0, region.height);
    return {
      lines: shown.map((line) =>
        fitLine(context, `${inset}${line}`, columns, "surface")
      ),
      model: scrolled(
        withList(model, body.list.id, fitted),
        itemId,
        viewport.scroll,
      ),
      layout: "zoom",
      listRows: listHeight,
      detailRows: region.height,
      readingRows: 0,
    };
  }
  if (tier === "strip") {
    const painted = paintList(
      context,
      model,
      body.list,
      fitted,
      columns,
      listHeight,
      fullWidthRoomy(body.list, columns),
    );
    const row = rows.rows[selected];
    const fallback = row?.kind === "item"
      ? [
        {
          text: row.item.marker.unicode,
          ascii: row.item.marker.ascii,
          tone: row.item.marker.tone ?? "ink",
        },
        { text: " " },
        { text: row.item.title, role: "title" as const },
      ]
      : [];
    const strip = renderStrip(
      context,
      itemId === undefined ? undefined : body.detail.strip?.[itemId],
      fallback,
      columns,
      stripLines,
      "surface",
    ).map((line) =>
      fitLine(context, itemId === undefined ? "" : line, columns, "surface")
    );
    const ruled = rule === 0 ? [] : [
      fitLine(
        context,
        `  ${
          ink(
            context,
            terminalFrameGlyphs("light", context.capabilities.unicode)
              .horizontal.repeat(Math.max(0, columns - 4)),
            { tone: "faint" },
          )
        }`,
        columns,
      ),
    ];
    return {
      lines: [...painted.lines, ...ruled, ...strip].slice(0, region.height),
      model: withList(model, body.list.id, painted.list),
      layout: "strip",
      listRows: listHeight,
      detailRows: 0,
      readingRows: 0,
    };
  }
  const listWidth = fitted.density?.width ??
    contentListWidth(fitted.display, split, tier, columns);
  const painted = paintList(
    context,
    model,
    body.list,
    fitted,
    listWidth,
    region.height,
    tier === "wide",
  );
  const detailWidth = columns - listWidth;
  const [left, right] = split.detailPadding[tier];
  const contentWidth = Math.max(1, detailWidth - left - right);
  const lines = renderDetailBlocks(context, blocks, {
    width: contentWidth,
    wide: tier === "wide",
    surface: "surface",
  });
  const viewport = scrollDetail(
    context,
    lines,
    region.height,
    itemId === undefined ? 0 : model.detailScroll[itemId] ?? 0,
    contentWidth,
    !short,
  );
  const inset = " ".repeat(left);
  return {
    lines: painted.lines.map((line, index) =>
      `${line}${
        fitLine(
          context,
          `${inset}${viewport.lines[index] ?? ""}`,
          detailWidth,
          "surface",
        )
      }`
    ),
    model: scrolled(
      withList(model, body.list.id, painted.list),
      itemId,
      viewport.scroll,
    ),
    layout: "split",
    listRows: region.height,
    detailRows: region.height,
    readingRows: 0,
  };
}

function listOnly<A>(
  context: FrameContext,
  model: TerminalApplicationModel<A>,
  view: GroupedList<A>,
  size: TerminalSize,
  region: Region,
): BodyResult<A> {
  const listModel = model.lists[view.id];
  if (listModel === undefined) throw new TypeError("list model is missing");
  const fitted = fitDensity(
    listModel,
    region.height + region.borrowed,
    `${size.columns}x${size.rows}`,
    () => undefined,
  );
  const painted = paintList(
    context,
    model,
    view,
    fitted,
    size.columns,
    region.height,
    fullWidthRoomy(view, size.columns),
  );
  return {
    lines: painted.lines,
    model: withList(model, view.id, painted.list),
    layout: "list",
    listRows: region.height,
    detailRows: 0,
    readingRows: 0,
  };
}

function reading<A>(
  context: FrameContext,
  model: TerminalApplicationModel<A>,
  body: Extract<
    TerminalApplicationModel<A>["view"]["body"],
    { kind: "reading" }
  >,
  size: TerminalSize,
  region: Region,
): BodyResult<A> {
  const width = Math.max(1, size.columns - 4);
  const capabilities = { ...context.capabilities, columns: width };
  const key = JSON.stringify([
    capabilities,
    cliPresentationPassthrough(context.presentation),
  ]);
  let cached = readingCache.get(body.content);
  if (cached?.key !== key) {
    cached = {
      key,
      lines: renderCliBlock(body.content, capabilities, context.presentation)
        .split("\n"),
    };
    readingCache.set(body.content, cached);
    context.renderCalls += 1;
  }
  const viewport = scrollDetail(
    context,
    cached.lines,
    region.height,
    model.readingScroll[body.id] ?? 0,
    width,
    false,
  );
  return {
    lines: viewport.lines.map((line) =>
      fitLine(context, `  ${line}`, size.columns)
    ),
    model: (model.readingScroll[body.id] ?? 0) === viewport.scroll ? model : {
      ...model,
      readingScroll: { ...model.readingScroll, [body.id]: viewport.scroll },
    },
    layout: "reading",
    listRows: 0,
    detailRows: 0,
    readingRows: region.height,
  };
}

function empty<A>(
  context: FrameContext,
  model: TerminalApplicationModel<A>,
  body: Extract<TerminalApplicationModel<A>["view"]["body"], { kind: "empty" }>,
  size: TerminalSize,
  region: Region,
): BodyResult<A> {
  const { columns } = size;
  const width = Math.max(1, Math.min(columns - 8, 64));
  const center = (line: string) =>
    fitLine(context, padText(line, columns, "center"), columns);
  const listModel = body.list === undefined
    ? undefined
    : model.lists[body.list.id];
  const listRows = listModel === undefined ? 0 : Math.min(
    listModelRows(listModel).rows.length,
    Math.max(1, region.height - 6),
  );
  const wrapped = wrapStyledText(
    styleRuns(context, body.body, undefined, "muted"),
    width,
  );
  const label = (text: string | undefined) =>
    context.capabilities.unicode ? text ?? "" : (text ?? "").replaceAll(
      "…",
      terminalGlyph("ellipsis", context.capabilities),
    );
  const focus = model.primaryFocused ? "selection" : undefined;
  const keys = [body.primary, ...(body.secondary ?? [])].map((hint) =>
    formatKeyChord(hint.key, context.capabilities)
  );
  const keyWidth = Math.max(3, ...keys.map(measureText));
  const primaryText = label(body.primary.label);
  const primary = fitLine(
    context,
    `${
      model.primaryFocused
        ? ink(context, terminalGlyph("selection", context.capabilities), {
          tone: "accent",
        }, focus)
        : " "
    } ${
      ink(context, padText(keys[0] ?? "", keyWidth), {
        tone: "accent",
        bold: true,
      }, focus)
    } ${
      ink(
        context,
        primaryText,
        { tone: "ink", bold: model.primaryFocused },
        focus,
      )
    }`,
    keyWidth + Math.max(12, measureText(primaryText)) + 6,
    focus,
  );
  const secondary = (body.secondary ?? []).map((hint, index) =>
    `${
      ink(context, padText(keys[index + 1] ?? "", keyWidth), {
        tone: "ink",
        bold: true,
      })
    } ${ink(context, label(hint.label), { tone: "muted" })}`
  );
  const block = [
    ink(context, body.title, { tone: "ink", bold: true }),
    "",
    ...wrapped,
    "",
    primary,
    ...(secondary.length === 0 ? [] : ["", ...secondary]),
  ];
  const above = Math.max(0, region.height - listRows - (listRows > 0 ? 1 : 0));
  const offset = Math.max(0, Math.floor((above - block.length) / 2));
  const lines = Array.from(
    { length: above },
    (_, index) => center(block[index - offset] ?? ""),
  );
  let next = model;
  if (body.list !== undefined && listModel !== undefined && listRows > 0) {
    const painted = paintList(
      context,
      model,
      body.list,
      listModel,
      columns,
      listRows,
      fullWidthRoomy(body.list, columns),
    );
    lines.push(fitLine(context, "", columns), ...painted.lines);
    next = withList(model, body.list.id, painted.list);
  }
  while (lines.length < region.height) {
    lines.push(fitLine(context, "", columns));
  }
  return {
    lines: lines.slice(0, region.height),
    model: next,
    layout: "empty",
    listRows,
    detailRows: 0,
    readingRows: 0,
  };
}

function tooSmall<A>(
  context: FrameContext,
  model: TerminalApplicationModel<A>,
  size: TerminalSize,
): TerminalApplicationFrame<A> {
  const times = terminalGlyph("times", context.capabilities);
  const inset = size.columns >= 24 ? "  " : "";
  const needs =
    `Needs ${TERMINAL_APPLICATION_MINIMUM.columns} ${times} ${TERMINAL_APPLICATION_MINIMUM.rows}`;
  const now = `now ${size.columns} ${times} ${size.rows}`;
  // One line when it fits; otherwise the need and the current size apart.
  const sizes = measureText(`${needs}; ${now}`) <= size.columns - inset.length
    ? [`${needs}; ${now}`]
    : [needs, now];
  const notice = [
    ink(context, "Too small", { tone: "ink", bold: true }),
    ...sizes.map((line) => ink(context, line, { tone: "muted" })),
  ];
  const top = Math.max(0, Math.floor((size.rows - notice.length) / 2));
  return {
    frame: Array.from(
      { length: size.rows },
      (_, row) =>
        fitLine(context, `${inset}${notice[row - top] ?? ""}`, size.columns),
    ).join("\n"),
    model,
    layout: "too-small",
    renderCalls: 0,
    animated: false,
    report: terminalApplicationStateReport(model),
  };
}

/**
 * The navigation identities an application reports: the focused control,
 * the body's list and selected item, and whether its detail is zoomed.
 */
export function terminalApplicationStateReport<A>(
  model: TerminalApplicationModel<A>,
): TerminalApplicationStateReport {
  const state = terminalApplicationState(model);
  const list = bodyList(model.view);
  const listState = list === undefined ? undefined : state.lists[list.id];
  return {
    ...(state.topLayerId === undefined ? {} : { topLayerId: state.topLayerId }),
    ...(state.focusedControlId === undefined
      ? {}
      : { focusedControlId: state.focusedControlId }),
    ...(list === undefined ? {} : { listId: list.id }),
    ...(listState?.selectedId === undefined || model.primaryFocused
      ? {}
      : { selectedItemId: listState.selectedId }),
    ...(listState === undefined ? {} : { zoomed: listState.zoomed }),
  };
}

/**
 * Render one exact frame — every line exactly the terminal's width — and
 * return the model with its density, width, and scroll fitted to it.
 */
export function renderTerminalApplication<A>(
  model: TerminalApplicationModel<A>,
  size: TerminalSize,
  capabilities: TerminalCapabilities,
  presentation: CliPresentationOptions = {},
  motion: TerminalApplicationMotion = { phase: 0 },
): TerminalApplicationFrame<A> {
  for (const dimension of [size.columns, size.rows]) {
    if (!Number.isSafeInteger(dimension) || dimension < 1) {
      throw new TypeError(
        "application geometry must be positive safe integers",
      );
    }
  }
  if (capabilities.columns !== size.columns) {
    throw new TypeError("application width must match terminal capabilities");
  }
  const context: FrameContext = {
    ...paintContext(capabilities, presentation, motion),
    renderCalls: 0,
  };
  if (
    size.columns < TERMINAL_APPLICATION_MINIMUM.columns ||
    size.rows < TERMINAL_APPLICATION_MINIMUM.rows
  ) return tooSmall(context, model, size);
  const { columns, rows } = size;
  const view = model.view;
  const shortBelow = view.body.kind === "master-detail"
    ? (view.body.split ?? DEFAULT_SPLIT_RULES).strip.shortBelowRows
    : DEFAULT_SPLIT_RULES.strip.shortBelowRows;
  const short = rows < shortBelow;
  const message = messageLine(context, model, columns);
  const messageRow = message !== undefined && !short;
  const top = 1 + (rows >= SPACIOUS_ROWS ? 1 : 0);
  const bottom = rows - 1 - (messageRow ? 1 : 0);
  const region = {
    top,
    height: Math.max(1, bottom - top),
    borrowed: messageRow ? 1 : 0,
  };
  const body = view.body;
  const result = body.kind === "master-detail"
    ? masterDetail(context, model, body, size, region, short)
    : body.kind === "list"
    ? listOnly(context, model, body.list, size, region)
    : body.kind === "reading"
    ? reading(context, model, body, size, region)
    : empty(context, model, body, size, region);
  const fitted: TerminalApplicationModel<A> = {
    ...result.model,
    geometry: {
      layout: result.layout,
      listRows: result.listRows,
      detailRows: result.detailRows,
      readingRows: result.readingRows,
    },
  };
  const headerLine = header(context, fitted, view.header, columns);
  const lines = [
    headerLine,
    ...(top > 1 ? [fitLine(context, "", columns)] : []),
    ...result.lines,
    ...(messageRow && message !== undefined ? [message] : []),
    message !== undefined && short ? message : footer(context, fitted, columns),
  ];
  return {
    frame: lines.join("\n"),
    model: fitted,
    layout: result.layout,
    renderCalls: context.renderCalls,
    animated: context.animated,
    ...(view.windowTitle === undefined
      ? {}
      : { windowTitle: view.windowTitle }),
    report: terminalApplicationStateReport(fitted),
  };
}
