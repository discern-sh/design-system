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
import { stripAnsi } from "../../ansi.ts";
import { renderCliBlock } from "../../block-composition.ts";
import { cliPresentationPassthrough } from "../../contracts.ts";
import {
  formatKeyChord,
  type KeyHint,
  type KeyHints,
  layoutKeyHintsCli,
} from "../../key-hints.ts";
import { terminalFrameGlyphs } from "../../box.ts";
import { TERMINAL_GLYPHS, terminalGlyph } from "../../terminal-glyphs.ts";
import {
  measureText,
  padText,
  truncateStyledText,
  wrapStyledText,
} from "../../text.ts";
import { applicationCopy, type TerminalApplicationCopy } from "./copy.ts";
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
  type DetailViewport,
  layoutDetailBlocks,
  renderDetailBlocks,
  renderStrip,
  scrollDetail,
  scrollToShow,
} from "./detail-render.ts";
import {
  isApplicationMarkdown,
  projectMarkdownReading,
  readingAnchor,
  type ReadingProjection,
  rowForReadingAnchor,
} from "./markdown-reading.ts";
import {
  markdownReadingId,
  type ReadingFrame,
  type ReadingLinkPosition,
} from "./reading-model.ts";
import { decodableChord } from "./keymap.ts";
import {
  decideListDensity,
  keyItemId,
  listLayoutKey,
  type ListRow,
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
  type ListModel,
  listModelRows,
  type ModelState,
  modelState,
  replaceLayer,
  sealModelState,
  snapshotModelState,
  type TerminalApplicationLayout,
  type TerminalApplicationModel,
  visibleLayers,
  visibleMessage,
} from "./model.ts";
import {
  fitLine,
  fitName,
  fitProse,
  ink,
  type PaintContext,
  paintContext,
  spread,
  styleGlyph,
  styleRuns,
  type TerminalApplicationMotion,
} from "./paint.ts";
import {
  type ApplicationDetailBlock,
  type ApplicationHeader,
  type ApplicationList,
  type ApplicationLivenessState,
  type ApplicationMasterDetailBody,
  type ApplicationRun,
  type ApplicationSplitRules,
  DEFAULT_APPLICATION_SPLIT_RULES,
} from "./view.ts";

/** Minimum geometry: a header, a list row with its state, a strip line, and key hints. */
export const TERMINAL_APPLICATION_MINIMUM: TerminalSize = Object.freeze({
  columns: 32,
  rows: 10,
});

/** Enter's key cap in each repertoire. */
const ENTER_UNICODE = formatKeyChord("enter", { unicode: true });
const ENTER_ASCII = formatKeyChord("enter", { unicode: false });

/**
 * Cells kept between the header's identity and its right side, so the two
 * never read as one phrase; the right side narrows before this gap does.
 */
const HEADER_CLUSTER_GAP = 4;
/** The gap the right side may close to at the smallest widths, before it narrows. */
const HEADER_TIGHT_GAP = 2;
/**
 * Cells the header's identity keeps while it shortens to leave the counts
 * and the liveness word on screen; only once those are gone does it shorten
 * further.
 */
const HEADER_IDENTITY_FLOOR = 8;

/** From this many rows a blank line separates the header from the body. */
const SPACIOUS_ROWS = 20;

/** One exact frame and the model fitted to it. */
export interface TerminalApplicationFrame<A> {
  readonly frame: string;
  /** The model with its density, width, and scroll fitted to this frame. */
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

/** A frame whose model is still unsealed state. Package-internal. */
export type RenderedFrame<A> =
  & Omit<TerminalApplicationFrame<A>, "model">
  & { readonly model: ModelState<A> };

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
  {
    readonly key: string;
    readonly lines: readonly string[];
    readonly projection?: ReadingProjection;
  }
>();

/**
 * The liveness the header shows: busy only once it has lasted its
 * `busyAfterMs`, idle until then.
 */
function shownLiveness<A>(
  model: ModelState<A>,
  now: number,
): ApplicationLivenessState | undefined {
  const liveness = model.view.header.liveness;
  if (liveness === undefined) return undefined;
  if (liveness.state !== "busy") return liveness.state;
  return now >= (model.busySince ?? now) + (liveness.busyAfterMs ?? 0)
    ? "busy"
    : "idle";
}

/** Whether detail blocks hold a `pending` block, inside sections too. */
function holdsPending(blocks: readonly ApplicationDetailBlock[]): boolean {
  return blocks.some((block) =>
    block.kind === "pending" ||
    (block.kind === "section" && holdsPending(block.blocks))
  );
}

/** Whether a layer waits on its caller: a loading sheet, or a pending block it shows. */
function layerPending<A>(layer: ApplicationLayer<A>): boolean {
  switch (layer.kind) {
    case "sheet":
      return layer.state === "loading" || holdsPending(layer.body);
    case "form":
      return holdsPending(layer.preview ?? []);
    case "reader":
      return holdsPending(layer.blocks);
    case "menu":
    case "palette":
      return false;
  }
}

/** The header line, with a hit for every chip that carries an action. */
function header<A>(
  context: FrameContext,
  model: ModelState<A>,
  bar: ApplicationHeader<A>,
  columns: number,
): { readonly line: string; readonly hits: readonly ApplicationHit[] } {
  const now = context.motion.now ?? 0;
  const listView = bodyList(model.view);
  const list = listView === undefined ? undefined : model.lists[listView.id];
  let leading = styleRuns(context, bar.leading, undefined);
  // The identity with its own wide gaps closed, as it reads when space runs short.
  let tightened = styleRuns(
    context,
    bar.leading.map((run) => ({
      ...run,
      text: run.text.replaceAll(/ {2,}/gu, " "),
      ...(run.ascii === undefined
        ? {}
        : { ascii: run.ascii.replaceAll(/ {2,}/gu, " ") }),
    })),
    undefined,
  );
  if (listView?.filter !== undefined && list?.filter !== undefined) {
    const rows = listModelRows(list);
    const cursor = list.filter.editing
      ? ink(context, terminalGlyph("cursor", context.capabilities), {
        tone: "accent",
      })
      : "";
    leading = `${ink(context, listView.filter.label, { tone: "faint" })}  ${
      ink(context, list.filter.query, { tone: "ink" })
    }${cursor}  ${
      ink(context, context.copy.count(rows.matched, rows.total), {
        tone: "faint",
      })
    }`;
    tightened = leading;
  }
  const liveness = bar.liveness;
  const state = shownLiveness(model, now);
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
  /**
   * The right side with the first `shown` chips, the trailing runs or not,
   * and the liveness word, and where each chip starts.
   */
  const compose = (shown: number, withTrailing: boolean, gap: number) => {
    const parts = [
      ...chips.slice(0, shown).map((text, index) => ({ text, index })),
      { text: withTrailing ? trailing : "", index: -1 },
    ].filter((part) => part.text !== "");
    const starts: { readonly index: number; readonly at: number }[] = [];
    let at = 0;
    for (const part of parts) {
      starts.push({ index: part.index, at });
      at += measureText(part.text) + gap;
    }
    const right = parts.map((part) => part.text).join(" ".repeat(gap));
    return {
      text: live === ""
        ? right
        : right === ""
        ? live
        : `${right}${" ".repeat(gap + 1)}${live}`,
      starts,
    };
  };
  /**
   * One rung of the fitting ladder: a right side, the gap kept before it,
   * and the identity beside it — whole as written, whole with its own gaps
   * closed, or shortened to no less than the floor.
   */
  interface Rung {
    readonly right: ReturnType<typeof compose>;
    readonly gap: number;
    readonly identity: "whole" | "tightened" | "floor";
  }
  const rung = (
    right: ReturnType<typeof compose>,
    gap: number,
    identity: Rung["identity"],
  ): Rung => ({ right, gap, identity });
  const floor = Math.min(HEADER_IDENTITY_FLOOR, measureText(tightened));
  /** The identity yielding beside one right side: its gaps, then its length. */
  const shortening = (right: ReturnType<typeof compose>): readonly Rung[] => [
    rung(right, HEADER_CLUSTER_GAP, "whole"),
    rung(right, HEADER_CLUSTER_GAP, "tightened"),
    rung(right, HEADER_CLUSTER_GAP, "floor"),
    rung(right, HEADER_TIGHT_GAP, "floor"),
  ];
  const counted = compose(0, true, 2);
  const uncounted = compose(0, false, 2);
  // Chips go first, from the end, while the identity stays whole. Then the
  // side that yields gives way — the identity closing its own gaps and
  // shortening to its floor, or the trailing counts — and the liveness
  // word, a state the person must see, goes last.
  const ladder: readonly Rung[] = [
    rung(compose(chips.length, true, 3), HEADER_CLUSTER_GAP, "whole"),
    ...chips.map((_, index) =>
      rung(
        compose(chips.length - index, true, 2),
        HEADER_CLUSTER_GAP,
        "whole",
      )
    ),
    ...(bar.yields === "trailing"
      ? [rung(counted, HEADER_CLUSTER_GAP, "whole"), ...shortening(uncounted)]
      : [...shortening(counted), ...shortening(uncounted).slice(2)]),
  ];
  const fits = ({ right, gap, identity }: Rung): boolean => {
    const width = measureText(right.text);
    const left = room - (width === 0 ? 0 : width + gap);
    return identity === "whole"
      ? measureText(leading) <= left
      : identity === "tightened"
      ? measureText(tightened) <= left
      : floor <= left;
  };
  const chosen = ladder.find(fits) ??
    rung({ text: "", starts: [] }, 0, "floor");
  const right = chosen.right;
  const separation = chosen.gap;
  const identity = chosen.identity === "whole" ? leading : tightened;
  const rightWidth = measureText(right.text);
  const left = fitName(
    context,
    identity,
    Math.max(0, room - (rightWidth === 0 ? 0 : rightWidth + separation)),
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
    line: fitLine(
      context,
      `  ${spread(context, left, right.text, room, Math.max(1, separation))}`,
      columns,
    ),
    hits,
  };
}

function footerHints<A>(
  model: ModelState<A>,
  copy: TerminalApplicationCopy,
): KeyHints {
  const view = model.view;
  const listView = bodyList(view);
  const list = listView === undefined ? undefined : model.lists[listView.id];
  if (list?.filter?.editing === true) {
    const keep = (hint: KeyHint) =>
      (typeof hint.key === "string" ? [hint.key] : hint.key).every((key) => {
        const chord = decodableChord(key);
        return chord !== undefined && chord !== "space" &&
          isTerminalKeyName(chord);
      });
    return {
      left: [
        { key: "enter", label: copy.done },
        { key: ["up", "down"], label: copy.move },
        { key: "escape", label: copy.clear },
      ],
      right: (view.footer.right ?? []).filter(keep),
    };
  }
  const rows = list === undefined ? undefined : listModelRows(list);
  const groupLabel = rows === undefined || list === undefined ||
      (view.body.kind === "empty" && model.primaryFocused)
    ? undefined
    : groupRowLabel(
      rows.rows[rowIndexForKey(rows.rows, list.selection)],
      copy,
    );
  if (groupLabel !== undefined && list?.zoomed !== true) {
    // A group row is no item: Enter folds or unfolds it, and item hints
    // would promise actions it does not take.
    return {
      left: [
        { key: "enter", label: groupLabel },
        { key: ["up", "down"], label: copy.move },
      ],
      ...(view.footer.right === undefined ? {} : { right: view.footer.right }),
    };
  }
  if (list?.zoomed === true && view.body.kind === "master-detail") {
    if (view.body.zoomFooter !== undefined) return view.body.zoomFooter;
    // Zoom gives Up, Down, Space, and Left their own meanings, so caller
    // hints for those keys would promise what they no longer do.
    const zoomKeys = new Set(["up", "down", "space", "left"]);
    const free = (hint: KeyHint) =>
      (typeof hint.key === "string" ? [hint.key] : hint.key).every((key) => {
        const chord = decodableChord(key);
        return chord === undefined || !zoomKeys.has(chord);
      });
    const [primary, ...rest] = view.footer.left;
    return {
      ...(view.footer.primary === undefined
        ? {}
        : { primary: view.footer.primary }),
      left: [
        ...(primary === undefined ? [] : [primary]),
        { key: ["up", "down"], label: copy.next },
        ...rest.filter(free),
      ],
      right: [
        { key: "left", label: copy.back },
        ...(view.footer.right ?? []).filter(free),
      ],
    };
  }
  const reading = markdownReadingId(model);
  if (reading !== undefined) {
    if (model.readingFocus[reading] !== undefined) {
      // A focused link owns Enter, Tab, and Escape, so caller hints for
      // those keys would promise what they no longer do.
      const linkKeys = new Set(["enter", "tab", "shift-tab", "escape"]);
      const free = (hint: KeyHint) =>
        (typeof hint.key === "string" ? [hint.key] : hint.key).every((key) => {
          const chord = decodableChord(key);
          return chord === undefined || !linkKeys.has(chord);
        });
      return {
        left: [
          { key: "enter", label: copy.open },
          { key: ["tab", "shift-tab"], label: copy.next },
        ],
        right: [
          { key: "escape", label: copy.done },
          ...(view.footer.right ?? []).filter(free),
        ],
      };
    }
    if (model.reading?.id === reading && model.reading.order.length > 0) {
      return {
        ...view.footer,
        left: [...view.footer.left, { key: "tab", label: copy.links }],
      };
    }
  }
  return view.footer;
}

/** A footer line and a hit for every single-key hint it shows. */
function footer(
  context: FrameContext,
  hints: KeyHints,
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
  model: ModelState<A>,
  columns: number,
): string | undefined {
  const message = visibleMessage(model);
  if (message === undefined) {
    if (model.mouseHintSince === undefined) return undefined;
    const hint = styleRuns(
      context,
      model.view.input?.selectionHint ?? context.copy.selectionHint,
      undefined,
      "muted",
    );
    return fitLine(
      context,
      `  ${fitProse(context, hint, columns - 4)}`,
      columns,
    );
  }
  const left = styleRuns(
    context,
    message.runs,
    undefined,
    message.tone ?? "muted",
  );
  const right = styleRuns(context, message.trailing, undefined, "faint");
  return fitLine(
    context,
    `  ${spread(context, left, right, columns - 4, 2, "word")}`,
    columns,
  );
}

/** The width tier a master-detail body uses at this many columns. */
function splitTier(
  split: ApplicationSplitRules,
  columns: number,
): "wide" | "standard" | "strip" {
  if (columns >= split.wideAtColumns) return "wide";
  return columns >= split.collapseBelowColumns ? "standard" : "strip";
}

function contentListWidth<A>(
  list: ApplicationList<A>,
  split: ApplicationSplitRules,
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
  list: ListModel<A>,
  available: number,
  geometry: string,
  width: (display: ApplicationList<A>) => number | undefined,
): ListModel<A> {
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
  readonly list: ListModel<A>;
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
  model: ModelState<A>,
  view: ApplicationList<A>,
  list: ListModel<A>,
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

/** What Enter does on a selected group row: show folded groups or hide an open one. */
function groupRowLabel<A>(
  row: ListRow<A> | undefined,
  copy: TerminalApplicationCopy,
): string | undefined {
  if (row?.kind === "fold") return copy.show;
  return row?.kind === "header" && row.key !== undefined
    ? copy.hide
    : undefined;
}

/**
 * The detail a selected group row shows: each group it stands for with its
 * count and aside, and what Enter does.
 */
function groupBlocks<A>(
  row: ListRow<A>,
  copy: TerminalApplicationCopy,
): readonly ApplicationDetailBlock[] {
  const label = groupRowLabel(row, copy);
  if (label === undefined) return [];
  const groups = row.kind === "fold"
    ? row.groups.map((folded) => ({ group: folded.group, count: folded.count }))
    : row.kind === "header"
    ? [{ group: row.group, count: row.count }]
    : [];
  const folded = row.kind === "fold";
  const glyph = TERMINAL_GLYPHS[folded ? "folded" : "unfolded"];
  return [
    {
      kind: "marks",
      items: groups.map(({ group, count }) => ({
        mark: { unicode: glyph.unicode, ascii: glyph.ascii, tone: "faint" },
        runs: [
          { text: group.title, role: "title" as const },
          { text: `  ${count}`, tone: "faint" as const },
          ...(group.aside === undefined ? [] : [
            { text: "  " },
            ...group.aside.map((run) => ({
              ...run,
              tone: run.tone ?? "faint" as const,
            })),
          ]),
        ],
      })),
    },
    {
      kind: "text",
      runs: [
        { text: ENTER_UNICODE, ascii: ENTER_ASCII, role: "key" },
        { text: ` ${label}`, tone: "muted" },
      ],
    },
  ];
}

function detailBlocks<A>(
  body: ApplicationMasterDetailBody<A>,
  itemId: string | undefined,
  row: ListRow<A> | undefined,
  copy: TerminalApplicationCopy,
): readonly ApplicationDetailBlock[] {
  if (itemId === undefined) {
    return row === undefined ? [] : groupBlocks(row, copy);
  }
  return body.detail.content[itemId] ??
    [{ kind: "pending", label: body.detail.pending ?? copy.loading }];
}

function crumb<A>(
  context: FrameContext,
  body: ApplicationMasterDetailBody<A>,
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
  // The position counts the items Up and Down walk in zoom: those a filter
  // matched, less those folded away, so every count is one step away.
  const position = row?.kind === "item"
    ? ink(
      context,
      context.copy.count(
        (rows.itemPrefix[selected] ?? 0) + 1,
        rows.itemPrefix.at(-1) ?? 0,
      ),
      { tone: "faint" },
      "surface",
    )
    : "";
  return spread(context, left, position, width);
}

/** A selected group row's strip line: its groups, counts, and what Enter does. */
function groupStripTitle<A>(
  row: ListRow<A>,
  label: string,
): readonly ApplicationRun[] {
  const groups = row.kind === "fold"
    ? row.groups.map((folded) => ({
      title: folded.group.shortTitle ?? folded.group.title,
      count: folded.count,
    }))
    : row.kind === "header"
    ? [{ title: row.group.title, count: row.count }]
    : [];
  return [
    ...groups.flatMap(({ title, count }, index) => [
      ...(index === 0
        ? []
        : [{ text: " · ", ascii: " - ", tone: "faint" as const }]),
      { text: title, role: "title" as const },
      { text: ` ${count}`, tone: "faint" as const },
    ]),
    { text: "   " },
    { text: ENTER_UNICODE, ascii: ENTER_ASCII, role: "key" as const },
    { text: ` ${label}`, tone: "muted" as const },
  ];
}

interface BodyResult<A> {
  readonly lines: readonly string[];
  readonly model: ModelState<A>;
  readonly layout: TerminalApplicationLayout;
  readonly listRows: number;
  readonly detailRows: number;
  readonly readingRows: number;
  /** Clickable and scrollable regions, rows counted from the body's top. */
  readonly hits: readonly ApplicationHit[];
}

function withList<A>(
  model: ModelState<A>,
  id: string,
  list: ListModel<A>,
): ModelState<A> {
  return { ...model, lists: { ...model.lists, [id]: list } };
}

function scrolled<A>(
  model: ModelState<A>,
  itemId: string | undefined,
  scroll: number,
): ModelState<A> {
  if (itemId === undefined || (model.detailScroll[itemId] ?? 0) === scroll) {
    return model;
  }
  return {
    ...model,
    detailScroll: { ...model.detailScroll, [itemId]: scroll },
  };
}

/**
 * A detail viewport beneath a layer that covers its first `cover` rows. The
 * rows of a block that began under the layer stay blank, so what shows below
 * the layer starts at a block's first line — a section's title, say — never
 * part-way through one; with no block beginning below it, nothing shows.
 */
function beneathCover(
  viewport: DetailViewport,
  starts: readonly number[],
  cover: number,
): readonly string[] {
  if (cover <= 0) return viewport.lines;
  const begins = new Set(starts);
  const shown = [...viewport.lines];
  for (let row = cover; row < shown.length; row += 1) {
    const line = row - viewport.offset;
    if (
      line >= 0 && line < viewport.shown && begins.has(viewport.first + line)
    ) break;
    shown[row] = "";
  }
  return shown;
}

function masterDetail<A>(
  context: FrameContext,
  model: ModelState<A>,
  body: ApplicationMasterDetailBody<A>,
  size: TerminalSize,
  region: Region,
  short: boolean,
  covered: boolean,
  cover: number,
): BodyResult<A> {
  const { columns } = size;
  const split = body.split ?? DEFAULT_APPLICATION_SPLIT_RULES;
  const listModel = model.lists[body.list.id];
  if (listModel === undefined) throw new TypeError("list model is missing");
  const tier = splitTier(split, columns);
  // A layer across the bottom covers the strip, so the list takes its rows.
  const stripLines = covered
    ? 0
    : short || size.rows < split.strip.shortBelowRows
    ? 1
    : 2;
  // Without fills a rule introduces a two-line strip; a one-line strip on
  // a short screen gives that row to the list instead.
  const rule = context.painted || covered || stripLines === 1 ? 0 : 1;
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
  const blocks = detailBlocks(
    body,
    itemId,
    rows.rows[selected],
    context.copy,
  );
  if (fitted.zoomed && itemId !== undefined) {
    const [left] = split.detailPadding.standard;
    const width = Math.max(1, columns - 2 * left);
    const pad = short ? 0 : 1;
    // Zoom gives the detail the whole width, so it lays out as roomily as
    // the wide tier, but shows hints only at that tier, as the split does:
    // zooming in shows the same blocks larger, never more of them.
    const lines = renderDetailBlocks(context, blocks, {
      width,
      wide: true,
      hints: tier === "wide",
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
    const top = [
      crumb(context, body, rows, selected, width),
    ];
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
    const group = groupRowLabel(row, context.copy);
    const fallback: readonly ApplicationRun[] = row?.kind === "item"
      ? [
        {
          text: row.item.marker.unicode,
          ascii: row.item.marker.ascii,
          tone: row.item.marker.tone ?? "ink",
        },
        { text: " " },
        { text: row.item.title, role: "title" as const },
      ]
      : group === undefined || row === undefined
      ? []
      : groupStripTitle(row, group);
    const strip = stripLines === 0 ? [] : renderStrip(
      context,
      itemId === undefined ? undefined : body.detail.strip?.[itemId],
      fallback,
      columns,
      stripLines === 1 ? 1 : 2,
      "surface",
      itemId !== undefined,
    ).map((line) =>
      fitLine(
        context,
        itemId === undefined && group === undefined ? "" : line,
        columns,
        "surface",
      )
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
  const { lines, starts } = layoutDetailBlocks(context, blocks, {
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
  const detailLines = beneathCover(viewport, starts, cover);
  // Without fills nothing tints the detail, so a faint rule parts it from
  // the list instead.
  const inset = context.painted || left < 1 ? " ".repeat(left) : `${
    ink(
      context,
      terminalFrameGlyphs("light", context.capabilities.unicode).vertical,
      { tone: "faint" },
    )
  }${" ".repeat(left - 1)}`;
  return {
    lines: painted.lines.map((line, index) =>
      `${line}${
        fitLine(
          context,
          `${inset}${detailLines[index] ?? ""}`,
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
  model: ModelState<A>,
  view: ApplicationList<A>,
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

/** The lines of a reading body at a width, and its Markdown projection. */
function readingLines<A>(
  context: FrameContext,
  model: ModelState<A>,
  body: Extract<ModelState<A>["view"]["body"], { kind: "reading" }>,
  width: number,
): {
  readonly lines: readonly string[];
  readonly projection?: ReadingProjection;
} {
  const capabilities = { ...context.capabilities, columns: width };
  const receded = context.recede === true;
  const focus = model.readingFocus[body.id];
  const key = JSON.stringify([
    capabilities,
    cliPresentationPassthrough(context.presentation),
    receded,
    focus ?? null,
  ]);
  const cached = readingCache.get(body.content);
  if (cached?.key === key) return cached;
  const markdown = isApplicationMarkdown(body.content)
    ? projectMarkdownReading(
      body.content,
      width,
      capabilities,
      context.presentation,
      focus,
    )
    : undefined;
  const lines = markdown?.lines ?? renderCliBlock(
    body.content as Exclude<typeof body.content, { kind: "markdown" }>,
    capabilities,
    context.presentation,
  ).split("\n");
  // Beneath a layer the document recedes like every other base region.
  const result = {
    key,
    lines: receded
      ? lines.map((line) => ink(context, stripAnsi(line), { tone: "faint" }))
      : lines,
    ...(markdown === undefined ? {} : { projection: markdown }),
  };
  readingCache.set(body.content, result);
  context.renderCalls += 1;
  return result;
}

function linkPosition(
  start: number,
  end: number,
  first: number,
  shown: number,
): ReadingLinkPosition {
  if (end < first) return "above";
  return start >= first + shown ? "below" : "visible";
}

function reading<A>(
  context: FrameContext,
  model: ModelState<A>,
  body: Extract<
    ModelState<A>["view"]["body"],
    { kind: "reading" }
  >,
  size: TerminalSize,
  region: Region,
): BodyResult<A> {
  const id = body.id;
  const width = Math.max(1, size.columns - 4);
  const { lines, projection } = readingLines(context, model, body, width);
  let requested = model.readingScroll[id] ?? 0;
  // A new width rewraps the document, so the line that was on top is found
  // again by its text.
  const place = model.readingAt[id];
  if (place !== undefined && place.width !== width) {
    const fallback = place.lines <= 1
      ? 0
      : Math.round(requested * lines.length / place.lines);
    const row = rowForReadingAnchor(lines, place.anchor, fallback);
    requested = scrollToShow(lines.length, region.height, row, false, row);
  }
  const heading = model.readingTargets[id]?.heading;
  const headingRow = heading === undefined
    ? undefined
    : projection?.headings.get(heading);
  if (headingRow !== undefined) {
    requested = scrollToShow(
      lines.length,
      region.height,
      headingRow,
      false,
      headingRow,
    );
  }
  // A focused link is always on screen.
  const focus = model.readingFocus[id];
  const focused = focus === undefined
    ? undefined
    : projection?.links.find((link) => link.id === focus.link);
  if (focused !== undefined) {
    requested = scrollToShow(
      lines.length,
      region.height,
      requested,
      false,
      focused.startRow,
      focused.endRow,
    );
  }
  const viewport = scrollDetail(
    context,
    lines,
    region.height,
    requested,
    width,
    false,
  );
  const hits: ApplicationHit[] = [
    ...areaHits(region.height, 0, 0, size.columns, { kind: "reading" }),
  ];
  const positions: Record<string, ReadingLinkPosition> = {};
  for (const link of projection?.links ?? []) {
    positions[link.id] = linkPosition(
      link.startRow,
      link.endRow,
      viewport.first,
      viewport.shown,
    );
    for (const cells of link.regions) {
      if (
        cells.row < viewport.first ||
        cells.row >= viewport.first + viewport.shown
      ) continue;
      hits.push({
        row: viewport.offset + cells.row - viewport.first,
        start: 2 + cells.start,
        end: 2 + cells.end,
        target: { kind: "link", readingId: id, linkId: link.id },
      });
    }
  }
  const frame: ReadingFrame | undefined = projection === undefined
    ? undefined
    : {
      id,
      order: projection.links.map((link) => link.id),
      destinations: Object.fromEntries(
        projection.links.map((link) => [link.id, link.destination]),
      ),
      positions,
      headings: [...projection.headings.keys()],
    };
  const anchor = readingAnchor(lines, viewport.first);
  const at = model.readingAt[id];
  const { [id]: _done, ...targets } = model.readingTargets;
  const { [id]: _stale, ...focusRest } = model.readingFocus;
  const fitted: ModelState<A> = {
    ...model,
    readingScroll: (model.readingScroll[id] ?? 0) === viewport.scroll
      ? model.readingScroll
      : { ...model.readingScroll, [id]: viewport.scroll },
    readingAt: at?.width === width && at.lines === lines.length &&
        at.anchor === anchor
      ? model.readingAt
      : {
        ...model.readingAt,
        [id]: {
          width,
          lines: lines.length,
          ...(anchor === undefined ? {} : { anchor }),
        },
      },
    readingTargets: model.readingTargets[id] === undefined
      ? model.readingTargets
      : targets,
    // A focused link the document no longer holds loses focus.
    readingFocus: focus !== undefined && focused === undefined &&
        projection !== undefined
      ? focusRest
      : model.readingFocus,
  };
  const { reading: _previous, ...withoutFrame } = fitted;
  return {
    lines: viewport.lines.map((line) =>
      fitLine(context, `  ${line}`, size.columns)
    ),
    model: frame === undefined ? withoutFrame : { ...fitted, reading: frame },
    layout: "reading",
    listRows: 0,
    detailRows: 0,
    readingRows: region.height,
    hits,
  };
}

function empty<A>(
  context: FrameContext,
  model: ModelState<A>,
  body: Extract<ModelState<A>["view"]["body"], { kind: "empty" }>,
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
    Math.max(1, region.height - 7),
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
  // A receded selection keeps its muted fill, as a list row's does.
  const focus = !model.primaryFocused
    ? undefined
    : context.recede === true
    ? "selectionMuted"
    : "selection";
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
  // Secondary keys sit under the primary's key, past its bar and space.
  const secondary = (body.secondary ?? []).map((hint, index) =>
    `  ${
      ink(context, padText(keys[index + 1] ?? "", keyWidth), {
        tone: "ink",
        bold: true,
      })
    } ${ink(context, label(hint.label), { tone: "muted" })}`
  );
  // The hints centre as one block, so their keys share a left edge.
  const hintWidth = Math.max(
    measureText(primary),
    ...secondary.map(measureText),
  );
  const block = [
    ink(context, body.title, { tone: "ink", bold: true }),
    "",
    ...wrapped,
    "",
    padText(primary, hintWidth),
    ...(secondary.length === 0
      ? []
      : ["", ...secondary.map((line) => padText(line, hintWidth))]),
  ];
  // A list keeps a blank row above it and one between it and the footer.
  const above = Math.max(0, region.height - listRows - (listRows > 0 ? 2 : 0));
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
  model: ModelState<A>,
  size: TerminalSize,
): RenderedFrame<A> {
  const times = terminalGlyph("times", context.capabilities);
  const inset = size.columns >= 24 ? "  " : "";
  const needs = context.copy.needs(
    TERMINAL_APPLICATION_MINIMUM.columns,
    TERMINAL_APPLICATION_MINIMUM.rows,
    times,
  );
  const now = context.copy.now(size.columns, size.rows, times);
  // One line when it fits; otherwise the need and the current size apart.
  const sizes = measureText(`${needs}; ${now}`) <= size.columns - inset.length
    ? [`${needs}; ${now}`]
    : [needs, now];
  const hints = model.view.tooSmallHints ?? [];
  const notice = [
    ink(context, context.copy.tooSmall, { tone: "ink", bold: true }),
    ...sizes.map((line) => ink(context, line, { tone: "muted" })),
    ...(hints.length === 0 ? [] : [
      "",
      layoutKeyHintsCli(
        // Enter does nothing here, so no key takes its accent.
        { left: hints, primary: false },
        Math.max(1, size.columns - inset.length),
        context.capabilities,
        cliPresentationPassthrough(context.presentation),
      ).line,
    ]),
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
    report: terminalApplicationStateReport(model, context.motion.now ?? 0),
  };
}

/**
 * The navigation identities an application reports — the top layer, the
 * focused control, the body's list and selected item, and whether its
 * detail is zoomed — and what still waits on the caller: the top layer, the
 * selected item's detail, the message line, and the header's liveness, as
 * the screen shows them at `now`.
 */
export function terminalApplicationStateReport<A>(
  model: ModelState<A>,
  now = 0,
): TerminalApplicationStateReport {
  const state = snapshotModelState(model);
  const view = model.view;
  const list = bodyList(view);
  const listState = list === undefined ? undefined : state.lists[list.id];
  const selected = listState?.selectedId === undefined || model.primaryFocused
    ? undefined
    : listState.selectedId;
  const top = visibleLayers(model).at(-1);
  const message = visibleMessage(model);
  const liveness = shownLiveness(model, now);
  const detail = view.body.kind === "master-detail" && selected !== undefined
    ? view.body.detail.content[selected]
    : undefined;
  return {
    ...(top === undefined ? {} : {
      topLayerId: top.id,
      ...(top.kind === "sheet" ? { topLayerState: top.state } : {}),
      topLayerPending: layerPending(top),
    }),
    ...(state.focusedControlId === undefined
      ? {}
      : { focusedControlId: state.focusedControlId }),
    ...(list === undefined ? {} : { listId: list.id }),
    ...(selected === undefined ? {} : { selectedItemId: selected }),
    ...(listState === undefined ? {} : { zoomed: listState.zoomed }),
    ...(view.body.kind === "master-detail" && selected !== undefined
      ? { detailPending: detail === undefined || holdsPending(detail) }
      : {}),
    ...(message === undefined ? {} : { messageId: message.id }),
    ...(liveness === undefined ? {} : { liveness }),
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
  const frame = renderModelState(
    modelState(model),
    size,
    capabilities,
    presentation,
    motion,
  );
  return { ...frame, model: sealModelState(frame.model) };
}

/** Render one frame from model state. Package-internal. */
export function renderModelState<A>(
  model: ModelState<A>,
  size: TerminalSize,
  capabilities: TerminalCapabilities,
  presentation: CliPresentationOptions = {},
  motion: TerminalApplicationMotion = { phase: 0 },
): RenderedFrame<A> {
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
    ...paintContext(
      capabilities,
      presentation,
      motion,
      applicationCopy(model.view.copy),
    ),
    renderCalls: 0,
  };
  if (
    size.columns < TERMINAL_APPLICATION_MINIMUM.columns ||
    size.rows < TERMINAL_APPLICATION_MINIMUM.rows
  ) return tooSmall(context, model, size);
  const { columns, rows } = size;
  const view = model.view;
  const shortBelow = view.body.kind === "master-detail"
    ? (view.body.split ?? DEFAULT_APPLICATION_SPLIT_RULES).strip.shortBelowRows
    : DEFAULT_APPLICATION_SPLIT_RULES.strip.shortBelowRows;
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
  let fitted: ModelState<A>;
  let bodyLines: readonly string[];
  let layout: TerminalApplicationLayout;
  let hits: readonly ApplicationHit[];
  let hints: KeyHints;
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
    hints = footerHints(fitted, context.copy);
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
    report: terminalApplicationStateReport(fitted, context.motion.now ?? 0),
  };
}

/** Render the body for a region; `covered` hides the strip beneath a bottom layer. */
function renderBody<A>(
  context: FrameContext,
  model: ModelState<A>,
  size: TerminalSize,
  region: Region,
  short: boolean,
  covered: boolean,
  cover = 0,
): BodyResult<A> {
  const body = model.view.body;
  return body.kind === "master-detail"
    ? masterDetail(context, model, body, size, region, short, covered, cover)
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
  model: ModelState<A>,
  size: TerminalSize,
  region: Region,
): number | undefined {
  const body = model.view.body;
  if (body.kind !== "master-detail") return undefined;
  const split = body.split ?? DEFAULT_APPLICATION_SPLIT_RULES;
  if (splitTier(split, size.columns) !== "wide") return undefined;
  const list = model.lists[body.list.id];
  if (list === undefined || list.zoomed) return undefined;
  const width = (display: ApplicationList<A>) =>
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
  model: ModelState<A>,
  list: ApplicationList<A>,
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
  readonly model: ModelState<A>;
  readonly layout: TerminalApplicationLayout;
  /** Hits in screen rows: the top layer's controls only. */
  readonly hits: readonly ApplicationHit[];
  readonly hints: KeyHints;
}

/**
 * Paint the open layers over a receded body. The body keeps every decision
 * it made without them — density, width, scroll — so closing a layer
 * restores it exactly; beneath a bottom layer it shows the rows above, so
 * the selected item stays in view. Only the top layer takes clicks.
 */
function renderLayers<A>(
  context: FrameContext,
  model: ModelState<A>,
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
  // Rows a layer covers from the top of the detail column.
  const cover = Math.max(
    0,
    ...painted.filter((entry) => entry.place.anchor === "detail").map((
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
    cover,
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
    ? footerHints(next, context.copy)
    : layerHints(last.layer, state, {
      unread: last.layer.kind === "sheet" && requiresFullRead(last.layer) &&
        !state.fullyRead && last.paint.hiddenBelow > 0,
    }, context.copy);
  return { lines, model: next, layout: base.layout, hits, hints };
}
