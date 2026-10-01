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
import type { ApplicationHit } from "./hits.ts";
import { layerHints } from "./layer-hints.ts";
import { requiresFullRead } from "./layer-model.ts";
import {
  type LayerBox,
  layerContentWidth,
  type LayerPaint,
  type ReaderRows,
  renderLayer,
} from "./layer-render.ts";
import type { ApplicationLayer } from "./layer-view.ts";
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
  type ListRowKey,
  type ListRows,
  rowGroupIds,
  rowIndexForKey,
  rowKey,
} from "./list-model.ts";
import {
  fullWidthRoomy,
  layoutListColumns,
  listGaps,
  neededListWidth,
  renderListRow,
  renderListViewport,
} from "./list-render.ts";
import {
  bodyList,
  listModelRows,
  replaceLayer,
  type TerminalApplicationLayout,
  type TerminalApplicationListModel,
  type TerminalApplicationModel,
  terminalApplicationState,
  visibleLayers,
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
  type InlineRun,
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
  /** How the body is laid out, beneath any layers. */
  readonly layout: TerminalApplicationLayout;
  /**
   * The frame's composition: its layout and the ids of open layers. A
   * change of composition paints a keyframe.
   */
  readonly composition: string;
  /** Caller blocks rendered for this frame; cached blocks are not counted. */
  readonly renderCalls: number;
  /** Whether a visible glyph moves, so the animation tick should keep running. */
  readonly animated: boolean;
  /** Whether a visible clock, such as a running step's time, should tick each second. */
  readonly clock: boolean;
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

/** The selection hint shown once when mouse input turns on. */
const SELECTION_HINT: readonly InlineRun[] = [
  { text: "Shift-drag", role: "key" },
  { text: " to select text" },
];

const readingCache = new WeakMap<
  object,
  { readonly key: string; readonly lines: readonly string[] }
>();

/** The header line, with a hit for every chip that carries an action. */
function header<A>(
  context: FrameContext,
  model: TerminalApplicationModel<A>,
  bar: HeaderBar<A>,
  columns: number,
): { readonly line: string; readonly hits: readonly ApplicationHit[] } {
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
  /** The right side for the first `shown` chips, and where each chip starts. */
  const compose = (shown: number, withLive: boolean, gap: number) => {
    const parts = [
      ...chips.slice(0, shown).map((text, index) => ({ text, index })),
      { text: trailing, index: -1 },
    ].filter((part) => part.text !== "");
    const starts: { readonly index: number; readonly at: number }[] = [];
    let at = 0;
    for (const part of parts) {
      starts.push({ index: part.index, at });
      at += measureText(part.text) + gap;
    }
    const right = parts.map((part) => part.text).join(" ".repeat(gap));
    return {
      text: withLive && live !== ""
        ? right === "" ? live : `${right}${" ".repeat(gap + 1)}${live}`
        : right,
      starts,
    };
  };
  const leadWidth = measureText(leading);
  const ladder = [
    () => compose(chips.length, true, 3),
    () => compose(chips.length, true, 2),
    ...chips.map((_, index) => () =>
      compose(chips.length - index - 1, true, 2)
    ),
    () => compose(0, false, 2),
    () => ({ text: "", starts: [] }),
  ];
  let right: ReturnType<typeof compose> = { text: "", starts: [] };
  for (const step of ladder) {
    right = step();
    if (
      right.text === "" || leadWidth + 2 + measureText(right.text) <= room
    ) break;
  }
  const rightWidth = measureText(right.text);
  const left = truncateStyledText(
    leading,
    Math.max(0, room - (rightWidth === 0 ? 0 : rightWidth + 2)),
    terminalGlyph("ellipsis", context.capabilities),
  );
  const origin = 2 + room - rightWidth;
  const hits: ApplicationHit[] = right.starts.flatMap(({ index, at }) => {
    const chip = bar.chips?.[index];
    const text = chips[index];
    return chip?.action === undefined || text === undefined ? [] : [{
      row: 0,
      start: origin + at,
      end: origin + at + measureText(text),
      target: { kind: "chip" as const, index },
    }];
  });
  return {
    line: fitLine(context, `  ${spread(left, right.text, room)}`, columns),
    hits,
  };
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

/** A footer line and a hit for every single-key hint it shows. */
function footer<A>(
  context: FrameContext,
  hints: KeyHints<A>,
  columns: number,
  row: number,
): { readonly line: string; readonly hits: readonly ApplicationHit[] } {
  const layout = layoutKeyHintsCli(
    hints,
    Math.max(0, columns - 4),
    context.capabilities,
    cliPresentationPassthrough(context.presentation),
  );
  return {
    line: fitLine(context, `  ${layout.line}`, columns),
    hits: layout.placed.flatMap((placed) =>
      typeof placed.hint.key === "string"
        ? [{
          row,
          start: 2 + placed.start,
          end: 2 + placed.end,
          target: { kind: "hint" as const, chord: placed.hint.key },
        }]
        : []
    ),
  };
}

function messageLine<A>(
  context: FrameContext,
  model: TerminalApplicationModel<A>,
  columns: number,
): string | undefined {
  const message = visibleMessage(model);
  if (message === undefined) {
    if (model.mouseHintSince === undefined) return undefined;
    const hint = styleRuns(
      context,
      model.view.input?.selectionHint ?? SELECTION_HINT,
      undefined,
      "muted",
    );
    return fitLine(context, `  ${hint}`, columns);
  }
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
  /** The selectable row each line shows. */
  readonly keys: readonly (ListRowKey | undefined)[];
  readonly list: TerminalApplicationListModel<A>;
}

/** Hits for a list's lines: the viewport for the wheel, each row for clicks. */
function listHits(
  listId: string,
  keys: readonly (ListRowKey | undefined)[],
  top: number,
  start: number,
  end: number,
): readonly ApplicationHit[] {
  return keys.flatMap((key, index) => [
    {
      row: top + index,
      start,
      end,
      target: { kind: "list" as const, listId },
    },
    ...(key === undefined ? [] : [{
      row: top + index,
      start,
      end,
      target: { kind: "row" as const, listId, key },
    }]),
  ]);
}

/** Hits covering whole rows of one region. */
function areaHits(
  rows: number,
  top: number,
  start: number,
  end: number,
  target: ApplicationHit["target"],
): readonly ApplicationHit[] {
  return Array.from(
    { length: rows },
    (_, index) => ({ row: top + index, start, end, target }),
  );
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
    receded: receded || context.recede === true,
    filtering: list.filter !== undefined,
  });
  const { anchor: _anchor, line: _line, reveal: _reveal, ...rest } = list;
  return {
    lines: rendered.lines,
    keys: rendered.keys,
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
  /** Clickable and scrollable regions, rows counted from the body's top. */
  readonly hits: readonly ApplicationHit[];
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
  covered: boolean,
): BodyResult<A> {
  const { columns } = size;
  const split = body.split ?? DEFAULT_SPLIT_RULES;
  const listModel = model.lists[body.list.id];
  if (listModel === undefined) throw new TypeError("list model is missing");
  const tier = splitTier(split, columns);
  // A layer across the bottom covers the strip, so the list takes its rows.
  const stripLines = covered
    ? 0
    : short || size.rows < split.strip.shortBelowRows
    ? 1
    : 2;
  const rule = context.painted || covered ? 0 : 1;
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
      hits: areaHits(region.height, 0, 0, columns, { kind: "detail" }),
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
    const strip = stripLines === 0 ? [] : renderStrip(
      context,
      itemId === undefined ? undefined : body.detail.strip?.[itemId],
      fallback,
      columns,
      stripLines === 1 ? 1 : 2,
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
      hits: listHits(body.list.id, painted.keys, 0, 0, columns),
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
    hits: [
      ...listHits(body.list.id, painted.keys, 0, 0, listWidth),
      ...areaHits(region.height, 0, listWidth, columns, { kind: "detail" }),
    ],
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
    hits: listHits(view.id, painted.keys, 0, 0, size.columns),
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
    hits: areaHits(region.height, 0, 0, size.columns, { kind: "reading" }),
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
  let hits: readonly ApplicationHit[] = [];
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
    lines.push(fitLine(context, "", columns));
    hits = listHits(body.list.id, painted.keys, lines.length, 0, columns);
    lines.push(...painted.lines);
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
    hits,
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
    composition: "too-small",
    renderCalls: 0,
    animated: false,
    clock: false,
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
  const layers = visibleLayers(model);
  let fitted: TerminalApplicationModel<A>;
  let bodyLines: readonly string[];
  let layout: TerminalApplicationLayout;
  let hits: readonly ApplicationHit[];
  let hints: KeyHints<A>;
  if (layers.length === 0) {
    const result = renderBody(context, model, size, region, short, false);
    fitted = {
      ...result.model,
      geometry: {
        layout: result.layout,
        listRows: result.listRows,
        detailRows: result.detailRows,
        readingRows: result.readingRows,
      },
    };
    bodyLines = result.lines;
    layout = result.layout;
    hits = result.hits.map((hit) => ({ ...hit, row: hit.row + region.top }));
    hints = footerHints(fitted);
  } else {
    const result = renderLayers(context, model, layers, size, region, short);
    fitted = result.model;
    bodyLines = result.lines;
    layout = result.layout;
    hits = result.hits;
    hints = result.hints;
  }
  const head = header(context, fitted, view.header, columns);
  const replaced = message !== undefined && short;
  const foot = footer(context, hints, columns, rows - 1);
  const lines = [
    head.line,
    ...(top > 1 ? [fitLine(context, "", columns)] : []),
    ...bodyLines,
    ...(messageRow && message !== undefined ? [message] : []),
    replaced ? message : foot.line,
  ];
  fitted = {
    ...fitted,
    hits: [...head.hits, ...hits, ...(replaced ? [] : foot.hits)],
  };
  return {
    frame: lines.join("\n"),
    model: fitted,
    layout,
    composition: layers.length === 0
      ? layout
      : `${layout}+${layers.map((layer) => layer.id).join("+")}`,
    renderCalls: context.renderCalls,
    animated: context.animated,
    clock: context.clock,
    ...(view.windowTitle === undefined
      ? {}
      : { windowTitle: view.windowTitle }),
    report: terminalApplicationStateReport(fitted),
  };
}

/** Render the body for a region; `covered` hides the strip beneath a bottom layer. */
function renderBody<A>(
  context: FrameContext,
  model: TerminalApplicationModel<A>,
  size: TerminalSize,
  region: Region,
  short: boolean,
  covered: boolean,
): BodyResult<A> {
  const body = model.view.body;
  return body.kind === "master-detail"
    ? masterDetail(context, model, body, size, region, short, covered)
    : body.kind === "list"
    ? listOnly(context, model, body.list, size, region)
    : body.kind === "reading"
    ? reading(context, model, body, size, region)
    : empty(context, model, body, size, region);
}

/** Where a layer sits on screen and the box it may fill. */
interface LayerPlacement {
  readonly anchor: "detail" | "bottom" | "top" | "full";
  /** The first column, inside the body region. */
  readonly left: number;
  readonly box: LayerBox;
}

/** Columns below which every layer takes the whole body. */
const NARROW_LAYER_COLUMNS = 56;

/**
 * The column a wide master-detail body's detail starts at, when the detail
 * sits beside the list; layers anchored to the detail occupy it.
 */
function detailColumn<A>(
  model: TerminalApplicationModel<A>,
  size: TerminalSize,
  region: Region,
): number | undefined {
  const body = model.view.body;
  if (body.kind !== "master-detail") return undefined;
  const split = body.split ?? DEFAULT_SPLIT_RULES;
  if (splitTier(split, size.columns) !== "wide") return undefined;
  const list = model.lists[body.list.id];
  if (list === undefined || list.zoomed) return undefined;
  const width = (display: GroupedList<A>) =>
    contentListWidth(display, split, "wide", size.columns);
  const fitted = fitDensity(
    list,
    region.height + region.borrowed,
    `${size.columns}x${size.rows}`,
    width,
  );
  return fitted.density?.width ?? width(fitted.display);
}

/**
 * Place a layer. Beside a wide detail every layer occupies the detail
 * column unless it asks for another anchor; elsewhere sheets, menus, and
 * forms sit at the bottom, a palette at the top, and a reader takes the
 * body. Below 56 columns every layer takes the body. An item layer at the
 * bottom leaves one row so the selected item stays in view.
 */
function placeLayer<A>(
  layer: ApplicationLayer<A>,
  size: TerminalSize,
  region: Region,
  column: number | undefined,
): LayerPlacement {
  const narrow = size.columns < NARROW_LAYER_COLUMNS;
  const stretch = layer.kind === "reader" || layer.kind === "palette";
  const fallback = layer.kind === "palette"
    ? "top"
    : layer.kind === "reader"
    ? "full"
    : "bottom";
  const wanted = layer.anchor ?? "detail";
  const anchor = narrow
    ? "full"
    : wanted === "detail"
    ? column === undefined ? fallback : "detail"
    : wanted;
  if (anchor === "detail" && column !== undefined) {
    return {
      anchor,
      left: column,
      box: {
        width: size.columns - column,
        height: region.height,
        stretch,
        narrow: false,
      },
    };
  }
  const height = anchor === "bottom" && layer.scope === "item"
    ? Math.max(3, region.height - 1)
    : region.height;
  return {
    anchor,
    left: 0,
    box: {
      width: size.columns,
      height,
      stretch: anchor === "full" || stretch,
      narrow,
    },
  };
}

/** A reader's focusable rows, each rendered at the layer's content width. */
function readerRows<A>(
  context: FrameContext,
  model: TerminalApplicationModel<A>,
  list: GroupedList<A>,
  width: number,
): ReaderRows | undefined {
  const listModel = model.lists[list.id];
  if (listModel === undefined) return undefined;
  const rows = listModelRows(listModel);
  const selected = rowIndexForKey(rows.rows, listModel.selection);
  const layout = layoutListColumns(
    list,
    width,
    listGaps(list, fullWidthRoomy(list, width)),
  );
  return {
    listId: list.id,
    lines: rows.rows.map((row, index) =>
      renderListRow(
        context,
        row,
        layout,
        width,
        index === selected,
        context.recede === true,
      )
    ),
    keys: rows.rows.map(rowKey),
    ...(selected < 0 ? {} : { selected }),
  };
}

interface LayeredBody<A> {
  readonly lines: readonly string[];
  readonly model: TerminalApplicationModel<A>;
  readonly layout: TerminalApplicationLayout;
  /** Hits in screen rows: the top layer's controls only. */
  readonly hits: readonly ApplicationHit[];
  readonly hints: KeyHints<A>;
}

/**
 * Paint the open layers over a receded body. The body keeps every decision
 * it made without them — density, width, scroll — so closing a layer
 * restores it exactly; beneath a bottom layer it shows the rows above, so
 * the selected item stays in view. Only the top layer takes clicks.
 */
function renderLayers<A>(
  context: FrameContext,
  model: TerminalApplicationModel<A>,
  layers: readonly ApplicationLayer<A>[],
  size: TerminalSize,
  region: Region,
  short: boolean,
): LayeredBody<A> {
  const column = detailColumn(model, size, region);
  let next = model;
  const painted: {
    readonly layer: ApplicationLayer<A>;
    readonly place: LayerPlacement;
    readonly paint: LayerPaint;
  }[] = [];
  for (const [index, layer] of layers.entries()) {
    const state = next.layers[layer.id];
    if (state === undefined) continue;
    const place = placeLayer(layer, size, region, column);
    const inner: FrameContext = {
      ...context,
      ground: "raised",
      recede: index < layers.length - 1,
      animated: false,
      clock: false,
    };
    const rows = layer.kind === "reader" && layer.rows !== undefined
      ? readerRows(inner, next, layer.rows, layerContentWidth(place.box))
      : undefined;
    const paint = renderLayer(
      inner,
      layer,
      state,
      place.box,
      rows,
      index === layers.length - 1,
    );
    context.animated ||= inner.animated;
    context.clock ||= inner.clock;
    context.renderCalls = inner.renderCalls;
    next = replaceLayer(next, paint.model);
    painted.push({ layer, place, paint });
  }
  const covered = Math.max(
    0,
    ...painted.filter((entry) => entry.place.anchor === "bottom").map((
      entry,
    ) => entry.paint.lines.length),
  );
  const receded: FrameContext = {
    ...context,
    recede: true,
    animated: false,
    clock: false,
  };
  const base = renderBody(
    receded,
    model,
    size,
    covered > 0
      ? {
        top: region.top,
        height: Math.max(1, region.height - covered),
        borrowed: region.borrowed + covered,
      }
      : region,
    short,
    covered > 0,
  );
  context.animated ||= receded.animated;
  context.renderCalls = receded.renderCalls;
  const lines = [...base.lines.slice(0, region.height)];
  while (lines.length < region.height) {
    lines.push(fitLine(context, "", size.columns));
  }
  let hits: readonly ApplicationHit[] = [];
  for (const [index, entry] of painted.entries()) {
    const top = entry.place.anchor === "bottom"
      ? region.height - entry.paint.lines.length
      : 0;
    for (const [offset, line] of entry.paint.lines.entries()) {
      const row = top + offset;
      const current = lines[row];
      if (current === undefined) continue;
      lines[row] = entry.place.left === 0 ? line : `${
        padText(
          truncateStyledText(current, entry.place.left, ""),
          entry.place.left,
        )
      }${line}`;
    }
    if (index === painted.length - 1) {
      hits = entry.paint.hits.map((hit) => ({
        ...hit,
        row: hit.row + region.top + top,
        start: hit.start + entry.place.left,
        end: hit.end + entry.place.left,
      }));
    }
  }
  const last = painted.at(-1);
  const state = last === undefined ? undefined : next.layers[last.layer.id];
  const hints = last === undefined || state === undefined
    ? footerHints(next)
    : layerHints(last.layer, state, {
      unread: last.layer.kind === "sheet" && requiresFullRead(last.layer) &&
        !state.fullyRead && last.paint.hiddenBelow > 0,
    });
  return { lines, model: next, layout: base.layout, hits, hints };
}
