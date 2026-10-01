/**
 * Layer rendering: every layer is a panel on the raised surface — pinned
 * head rows, a scrolling body with honest overflow markers, and pinned foot
 * rows — framed by fill where surfaces paint and by a rounded box where
 * they do not, with identical geometry. Sheets add button rows and read
 * progress, forms add fields, menus add columns, palettes a query, readers
 * focusable rows.
 *
 * @module
 */

import { terminalFrameGlyphs } from "../../box.ts";
import { formatKeyChord, type KeyChord } from "../../key-hints.ts";
import { TERMINAL_GLYPHS, terminalGlyph } from "../../terminal-glyphs.ts";
import {
  measureText,
  padText,
  truncateStyledText,
  wrapStyledText,
} from "../../text.ts";
import type { TerminalSurfaceRole, TerminalTextTone } from "../../theme.ts";
import { hintsKeyWidth, renderDetailBlocks } from "./detail-render.ts";
import type { ApplicationHit, ApplicationHitTarget } from "./hits.ts";
import {
  buttonControl,
  buttonRowShown,
  disclosureControl,
  fieldControl,
  groupControl,
  isTextControl,
  itemControl,
  type LayerControl,
  parseControl,
  sheetChallengeShown,
  UNAVAILABLE_SECTION,
  unavailableControl,
  visibleFormFields,
} from "./layer-controls.ts";
import {
  buttonEnabled,
  requiresFullRead,
  sheetUnderReview,
  type TerminalApplicationLayerModel,
} from "./layer-model.ts";
import { menuRows, paletteRows, unavailableMenuItem } from "./layer-search.ts";
import type {
  ApplicationActivity,
  ApplicationActivityStep,
  ApplicationChoiceField,
  ApplicationDisclosure,
  ApplicationForm,
  ApplicationLayer,
  ApplicationMenu,
  ApplicationPalette,
  ApplicationReader,
  ApplicationSheet,
  ApplicationTextField,
  ApplicationUnavailableItem,
} from "./layer-view.ts";
import type { ApplicationDetailBlock } from "./view.ts";
import {
  clip,
  fitLine,
  ink,
  overflowMarker,
  type PaintContext,
  runsWidth,
  spread,
  styleGlyph,
  styleRuns,
} from "./paint.ts";
import type { ApplicationRun } from "./view.ts";

/** Where a layer may draw and how its height behaves. */
export interface LayerBox {
  readonly width: number;
  /** The most rows the layer may take. */
  readonly height: number;
  /** Fill every row of `height` instead of sizing to content. */
  readonly stretch: boolean;
  /** Below 56 columns the side padding narrows to one cell. */
  readonly narrow: boolean;
}

/** One painted layer, its hits relative to its first cell, and its fitted state. */
export interface LayerPaint {
  readonly lines: readonly string[];
  readonly hits: readonly ApplicationHit[];
  readonly model: TerminalApplicationLayerModel;
  /** Non-blank body rows hidden below the viewport. */
  readonly hiddenBelow: number;
}

/** Rendered rows for a reader's focusable list, supplied by the frame. */
export interface ReaderRows {
  /** One row per list row, each exactly the content width. */
  readonly lines: readonly string[];
  /** The selected row's index, when one is selected. */
  readonly selected?: number;
  /** The list row key each line holds, for clicks. */
  readonly keys: readonly (string | undefined)[];
  readonly listId: string;
}

/** A region of a panel row, relative to the row's content start. */
interface RowHit {
  readonly start: number;
  readonly end: number;
  readonly target: ApplicationHitTarget;
}

/** One content row: styled text no wider than the panel's content width. */
interface PanelRow {
  /**
   * The row's styled text, or a function that styles it, so a long body
   * such as a palette's results styles only the rows that reach the screen.
   */
  readonly text: string | (() => string);
  readonly hits?: readonly RowHit[];
  /** Draw the selection bar in the cell before the content. */
  readonly bar?: boolean;
  /** The control this row shows, for scrolling it into view. */
  readonly control?: LayerControl;
  /** Further controls sharing the row, such as closed disclosures in one flow. */
  readonly controls?: readonly LayerControl[];
}

/** Whether a row shows a control. */
function holds(row: PanelRow, control: LayerControl): boolean {
  return row.control === control || row.controls?.includes(control) === true;
}

/** Everything a panel shows, before it is fitted to a height. */
interface Panel {
  readonly head: readonly PanelRow[];
  readonly body: readonly PanelRow[];
  /** Body rows, from the top, that must pass through view before confirming. */
  readonly read: number;
  /**
   * The pinned foot, given how many body rows are hidden below, the body
   * rows this frame shows, and whether the footnote moved into the body. A
   * panel whose foot names what is hidden sets `footOverflow`.
   */
  readonly foot: (
    hidden: number,
    shown: BodySpan,
    moved: boolean,
  ) => readonly PanelRow[];
  readonly footOverflow: boolean;
  /** A footnote that moves into the body when the body cannot fit. */
  readonly footnote?: readonly PanelRow[];
  /** Keep the body row holding this control in view. */
  readonly follow?: LayerControl;
  /** What overflow markers count: lines of text (the default), or choices. */
  readonly counts?: "lines" | "choices";
}

/** Body rows a frame shows, from `start` up to but not including `end`. */
interface BodySpan {
  readonly start: number;
  readonly end: number;
}

const NOTHING_SHOWN: BodySpan = { start: 0, end: 0 };

const BLANK: PanelRow = { text: "" };
const RAISED: TerminalSurfaceRole = "raised";

function controlHit(
  layerId: string,
  control: LayerControl,
): ApplicationHitTarget {
  return { kind: "control", layerId, control };
}

/** Plain text in a tone on the raised surface. */
function raised(
  context: PaintContext,
  text: string,
  tone: TerminalTextTone,
  bold = false,
): string {
  return ink(context, text, { tone, bold }, RAISED);
}

/** Wrap styled runs to a width, keeping short lines' spacing. */
function wrapRuns(
  context: PaintContext,
  runs: readonly ApplicationRun[],
  width: number,
  fallback: TerminalTextTone,
): readonly string[] {
  const styled = styleRuns(context, runs, RAISED, fallback);
  if (styled === "") return [""];
  if (measureText(styled) <= width) return [styled];
  return wrapStyledText(styled, Math.max(1, width));
}

/** A key as its hint shows it, such as `^T` or `d`. */
function keyText(context: PaintContext, key: KeyChord): string {
  return formatKeyChord(key, context.capabilities);
}

/** Minutes and seconds, as a clock: `0:41`, `12:05`. */
export function clockText(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** A step's duration: seconds under a minute, else a clock. */
function durationText(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return seconds < 60 ? `${seconds}s` : clockText(ms);
}

function ellipsis(context: PaintContext): string {
  return terminalGlyph("ellipsis", context.capabilities);
}

/** A title on the raised surface, wrapped to two lines, then truncated. */
function titleLines(
  context: PaintContext,
  title: string,
  width: number,
): readonly string[] {
  const lines = wrapStyledText(raised(context, title, "ink", true), width);
  if (lines.length <= 2) return lines;
  return [
    lines[0] ?? "",
    truncateStyledText(
      `${lines[1] ?? ""} ${lines.slice(2).join(" ")}`,
      width,
      ellipsis(context),
    ),
  ];
}

/**
 * The title row: the title, and an aside against the end when both fit on
 * one row. The title never wraps to make room for the aside; when they do
 * not fit together the aside takes its own row beneath the title.
 */
function headRows(
  context: PaintContext,
  title: string,
  aside: string,
  width: number,
): readonly PanelRow[] {
  const lines = titleLines(context, title, width);
  const [first] = lines;
  if (aside === "") return lines.map((text) => ({ text }));
  if (
    lines.length === 1 && first !== undefined &&
    measureText(first) + 2 + measureText(aside) <= width
  ) return [{ text: spread(context, first, aside, width) }];
  return [
    ...lines.map((text) => ({ text })),
    { text: truncateStyledText(aside, width, ellipsis(context)) },
  ];
}

// ── Buttons ──────────────────────────────────────────────────────────────

/** How a button looks now. */
export type ButtonPosture =
  | "focused"
  | "resting"
  | "disabled"
  | "focused-disabled";

/**
 * A padded word of constant width, so focus never moves the row. Focus
 * carries `›` `‹` at every colour depth. Where fills paint, focused,
 * resting, and disabled buttons take the focus (or danger), control, and
 * surface fills; otherwise focus is bold, resting `[ ]`, and disabled `( )`.
 * A focused button that cannot run keeps its markers around a faint label
 * on the surface fill, or `›(Label)‹` without fills, so focus never reads
 * as permission.
 */
export function renderButton(
  context: PaintContext,
  label: string,
  posture: ButtonPosture,
  danger: boolean,
): string {
  const capabilities = context.capabilities;
  const focused = posture === "focused" || posture === "focused-disabled";
  const disabled = posture === "disabled" || posture === "focused-disabled";
  const start = terminalGlyph("focusStart", capabilities);
  const end = terminalGlyph("focusEnd", capabilities);
  const text = posture === "focused"
    ? `${start} ${label} ${end}`
    : posture === "focused-disabled"
    ? context.painted ? `${start} ${label} ${end}` : `${start}(${label})${end}`
    : context.painted
    ? `  ${label}  `
    : posture === "resting"
    ? `[ ${label} ]`
    : `( ${label} )`;
  const surface: TerminalSurfaceRole = posture === "focused"
    ? danger ? "dangerFill" : "focusFill"
    : posture === "resting"
    ? "control"
    : "surface";
  const tone: TerminalTextTone = disabled ? "faint" : danger ? "danger" : "ink";
  const weight = { tone, bold: focused && !disabled };
  if (!context.painted) {
    return ink(context, text, { tone, bold: focused });
  }
  return fitLine(
    context,
    ink(context, text, weight, surface),
    measureText(text),
    surface,
  );
}

/**
 * Lay out buttons right-aligned after a left text, which takes its own row
 * when it does not fit beside them; buttons that do not fit one row wrap.
 */
function buttonRows<A>(
  context: PaintContext,
  layer: ApplicationSheet<A> | ApplicationForm<A>,
  model: TerminalApplicationLayerModel,
  left: string,
  width: number,
): readonly PanelRow[] {
  const gap = 2;
  const render = () =>
    layer.buttons.map((button) => {
      const enabled = buttonEnabled(layer, model, button);
      const focused = model.focus === buttonControl(button.id);
      const text = renderButton(
        context,
        button.label,
        focused
          ? enabled ? "focused" : "focused-disabled"
          : enabled
          ? "resting"
          : "disabled",
        button.role === "destructive",
      );
      return { button, text, width: measureText(text) };
    });
  const pack = (parts: ReturnType<typeof render>) => {
    const rows: (typeof parts)[] = [];
    let current: typeof parts = [];
    let used = 0;
    for (const part of parts) {
      const extra = current.length === 0 ? part.width : part.width + gap;
      if (current.length > 0 && used + extra > width) {
        rows.push(current);
        current = [];
        used = 0;
      }
      current.push(part);
      used += current.length === 1 ? part.width : part.width + gap;
    }
    if (current.length > 0) rows.push(current);
    return rows;
  };
  const rows = pack(render());
  const lines: PanelRow[] = [];
  const leftWidth = measureText(left);
  const lastContent = rows.at(-1)?.map((part) => part.text).join(
    " ".repeat(gap),
  ) ?? "";
  const lastStart = Math.max(0, width - measureText(lastContent));
  // The left text sits beside a single button row when it fits; otherwise
  // it takes its own row above the whole block, never between its rows.
  const beside = rows.length === 1 && left !== "" &&
    leftWidth + 2 <= lastStart;
  if (left !== "" && !beside) {
    lines.push({ text: truncateStyledText(left, width, ellipsis(context)) });
  }
  for (const [index, row] of rows.entries()) {
    // Filled buttons on touching rows would merge into one slab, so a
    // blank row parts wrapped rows where fills paint.
    if (index > 0 && context.painted) lines.push(BLANK);
    const content = row.map((part) => part.text).join(" ".repeat(gap));
    const start = Math.max(0, width - measureText(content));
    const hits: RowHit[] = [];
    let at = start;
    for (const part of row) {
      hits.push({
        start: at,
        end: at + part.width,
        target: controlHit(layer.id, buttonControl(part.button.id)),
      });
      at += part.width + gap;
    }
    lines.push({
      text: beside
        ? `${left}${" ".repeat(start - leftWidth)}${content}`
        : `${" ".repeat(start)}${content}`,
      hits,
    });
  }
  return lines;
}

/** The focused button's disabled reason, which replaces the footnote while focused. */
function disabledReason<A>(
  layer: ApplicationSheet<A> | ApplicationForm<A>,
  model: TerminalApplicationLayerModel,
): string | undefined {
  const button = layer.buttons.find((candidate) =>
    buttonControl(candidate.id) === model.focus
  );
  return button !== undefined && !buttonEnabled(layer, model, button)
    ? button.disabledReason
    : undefined;
}

// ── Fields ───────────────────────────────────────────────────────────────

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/**
 * A one-line field: its text on the surface fill, scrolled so the cursor
 * stays visible, with the cursor glyph while focused. Without fills the
 * field sits in brackets of the same width.
 */
function fieldBox(
  context: PaintContext,
  value: string,
  cursor: number,
  focused: boolean,
  width: number,
  placeholder = "",
): string {
  const inner = Math.max(1, width - 2);
  const parts = [...graphemes.segment(value)].map((part) => part.segment);
  const at = Math.max(0, Math.min(cursor, parts.length));
  const cursorGlyph = focused
    ? ink(context, terminalGlyph("cursor", context.capabilities), {
      tone: "accent",
    }, "surface")
    : "";
  const room = Math.max(1, inner - (focused ? 1 : 0));
  let start = 0;
  while (measureText(parts.slice(start, at).join("")) > room && start < at) {
    start += 1;
  }
  let end = at;
  while (
    end < parts.length &&
    measureText(parts.slice(start, end + 1).join("")) <= room
  ) end += 1;
  const text = value === "" && placeholder !== ""
    ? `${cursorGlyph}${
      ink(
        context,
        clip(context, placeholder, room),
        { tone: "faint" },
        "surface",
      )
    }`
    : `${
      ink(context, parts.slice(start, at).join(""), { tone: "ink" }, "surface")
    }${cursorGlyph}${
      ink(context, parts.slice(at, end).join(""), { tone: "ink" }, "surface")
    }`;
  if (!context.painted) {
    return `${ink(context, "[", { tone: "faint" })}${padText(text, inner)}${
      ink(context, "]", { tone: "faint" })
    }`;
  }
  return fitLine(context, ` ${text}`, width, "surface");
}

/** A multi-line field: each line of its value on the surface fill. */
function fieldArea(
  context: PaintContext,
  value: string,
  cursor: number,
  focused: boolean,
  width: number,
): readonly string[] {
  const lines = value.split("\n");
  const rows = Math.max(3, Math.min(6, lines.length));
  let offset = 0;
  const cursorLine = (() => {
    let remaining = cursor;
    for (const [index, line] of lines.entries()) {
      const length = [...graphemes.segment(line)].length;
      if (remaining <= length) return { line: index, column: remaining };
      remaining -= length + 1;
    }
    return { line: lines.length - 1, column: 0 };
  })();
  if (cursorLine.line >= rows) offset = cursorLine.line - rows + 1;
  return Array.from({ length: rows }, (_, index) => {
    const line = lines[offset + index] ?? "";
    const here = focused && cursorLine.line === offset + index;
    return fieldBox(
      context,
      line,
      here ? cursorLine.column : [...graphemes.segment(line)].length,
      here,
      width,
    );
  });
}

// ── Disclosures ──────────────────────────────────────────────────────────

/**
 * Closed disclosures flow along rows, three cells apart; an open one takes
 * its own row with its key against the end, followed by its content. The
 * key shown is the field chord while a text field has focus.
 */
function disclosureRows(
  context: PaintContext,
  layerId: string,
  disclosures: readonly ApplicationDisclosure[],
  model: TerminalApplicationLayerModel,
  inField: boolean,
  width: number,
): readonly PanelRow[] {
  const rows: PanelRow[] = [];
  let flow:
    | { text: string; hits: RowHit[]; width: number; controls: LayerControl[] }
    | undefined;
  const flush = () => {
    if (flow !== undefined) {
      rows.push({ text: flow.text, hits: flow.hits, controls: flow.controls });
    }
    flow = undefined;
  };
  for (const [index, disclosure] of disclosures.entries()) {
    const control = disclosureControl(disclosure.id);
    const open = model.open[disclosure.id] === true;
    const focused = model.focus === control;
    const key = inField
      ? disclosure.fieldKey === undefined
        ? ""
        : keyText(context, disclosure.fieldKey)
      : keyText(context, disclosure.key);
    const surface: TerminalSurfaceRole = focused ? "selection" : RAISED;
    const marker = ink(
      context,
      terminalGlyph(open ? "unfolded" : "folded", context.capabilities),
      { tone: "faint" },
      surface,
    );
    const label = ink(
      context,
      clip(context, disclosure.label, Math.max(4, width - 8)),
      { tone: open ? "ink" : "muted", bold: focused },
      surface,
    );
    const keyed = key === ""
      ? ""
      : ink(context, key, { tone: "ink", bold: true }, surface);
    if (open) {
      flush();
      const line = spread(context, `${marker} ${label}`, keyed, width);
      rows.push({
        text: focused ? fitLine(context, line, width, "selection") : line,
        hits: [{ start: 0, end: width, target: controlHit(layerId, control) }],
        control,
      });
      const content = renderDetailBlocks(context, disclosure.content, {
        width,
        wide: true,
        surface: RAISED,
      });
      rows.push(...content.map((text) => ({ text })));
      // Open content ends with a blank row before the next disclosure.
      if (index < disclosures.length - 1) rows.push(BLANK);
      continue;
    }
    let segment = `${marker} ${label}${keyed === "" ? "" : `  ${keyed}`}`;
    if (focused) {
      segment = fitLine(context, segment, measureText(segment), "selection");
    }
    const segmentWidth = measureText(segment);
    if (flow !== undefined && flow.width + 3 + segmentWidth > width) flush();
    if (flow === undefined) {
      flow = {
        text: segment,
        hits: [{
          start: 0,
          end: segmentWidth,
          target: controlHit(layerId, control),
        }],
        width: segmentWidth,
        controls: [control],
      };
    } else {
      flow.controls.push(control);
      flow.hits.push({
        start: flow.width + 3,
        end: flow.width + 3 + segmentWidth,
        target: controlHit(layerId, control),
      });
      flow.text = `${flow.text}   ${segment}`;
      flow.width += 3 + segmentWidth;
    }
  }
  flush();
  return rows;
}

// ── Panels ───────────────────────────────────────────────────────────────

/**
 * Cells between the frame and the content on the left: the selection bar's
 * cell and one more, so a bar never touches its label.
 */
const LEFT_PADDING = 2;

/** Cells between the content and the frame on the right; one when narrow. */
function rightPadding(box: LayerBox): number {
  return box.narrow ? 1 : 2;
}

/** The selection bar's cell, on the selection fill like the row it marks. */
function selectionBar(context: PaintContext): string {
  return fitLine(
    context,
    ink(context, terminalGlyph("selection", context.capabilities), {
      tone: "accent",
    }, "selection"),
    1,
    "selection",
  );
}

/** The content width a layer's rows may use. */
export function layerContentWidth(box: LayerBox): number {
  return Math.max(1, box.width - 2 - LEFT_PADDING - rightPadding(box));
}

/** A panel fitted to its box. */
interface Fitted {
  readonly lines: readonly string[];
  readonly hits: readonly ApplicationHit[];
  readonly scroll: number;
  /** The body rows this frame shows. */
  readonly shown: BodySpan;
  /** Body rows visible at once. */
  readonly page: number;
  /** Non-blank body rows hidden below. */
  readonly hidden: number;
}

function visibleRows(rows: readonly PanelRow[]): number {
  return rows.filter((row) =>
    typeof row.text === "function" || row.text.trim() !== ""
  ).length;
}

/** The choices among rows: what a menu's or palette's markers count. */
function choiceRows(rows: readonly PanelRow[]): number {
  return rows.reduce(
    (total, row) =>
      total + (row.controls?.length ?? (row.control === undefined ? 0 : 1)),
    0,
  );
}

/**
 * Fit a panel to its box: a frame, the pinned head and foot, and the body
 * scrolled to `requested`, to the control a focus change revealed (an
 * opening disclosure comes to the top), or to the row the panel follows.
 * Blank rows go first when height is short; the body keeps at least one row.
 */
function composePanel(
  context: PaintContext,
  layerId: string,
  panel: Panel,
  box: LayerBox,
  requested: number,
  reveal: LayerControl | undefined,
): Fitted {
  const pad = LEFT_PADDING;
  const width = layerContentWidth(box);
  // A list of choices counts choices; anything else counts lines of text.
  const count = panel.counts === "choices" ? choiceRows : visibleRows;
  /** The gaps, body, and viewport height left beside a foot of `footRows`. */
  const fit = (footRows: number) => {
    let gapAfterHead = panel.head.length > 0 ? 1 : 0;
    let gapBeforeFoot = footRows > 0 ? 1 : 0;
    const room = () =>
      box.height - 2 - panel.head.length - gapAfterHead - gapBeforeFoot -
      footRows;
    // Blank rows give way before body rows: the title's gap goes once the
    // body overflows, the foot's only when the body would keep under three.
    if (room() < panel.body.length) gapAfterHead = 0;
    if (room() < Math.min(3, panel.body.length)) gapBeforeFoot = 0;
    const available = Math.max(1, room());
    const moved = panel.body.length > available &&
      panel.footnote !== undefined;
    const body = moved
      ? [...panel.body, BLANK, ...(panel.footnote ?? [])]
      : panel.body;
    const visible = box.stretch
      ? available
      : Math.min(available, Math.max(1, body.length));
    return {
      footRows,
      gapAfterHead,
      gapBeforeFoot,
      moved,
      body,
      visible,
      overflows: body.length > visible,
    };
  };
  /**
   * Lay the body out beside a foot of `footRows`: the viewport at a scroll
   * position, where once scrolled the upper marker takes the first row and
   * stands for the line beneath it too, so each step down reveals a new
   * line; a lower marker takes the last row unless the foot names what is
   * hidden. A viewport too short for a marker and a line shows the line.
   * Returns the foot this layout actually draws.
   */
  const place = (footRows: number) => {
    const fitted = fit(footRows);
    const { body, visible, overflows } = fitted;
    // The upper marker may stand for the line beneath it only while the
    // first page shows at least two lines; otherwise that line would never
    // be on screen at any scroll.
    const covers = visible >= (panel.footOverflow ? 2 : 3);
    const viewport = (scroll: number) => {
      const up = scroll > 0 && visible >= 2 ? 1 : 0;
      const first = scroll + (covers ? up : 0);
      let rows = visible - up;
      const down =
        !panel.footOverflow && first + rows < body.length && rows >= 2 ? 1 : 0;
      rows -= down;
      return { up, first, rows, down };
    };
    let maxScroll = 0;
    if (overflows) {
      maxScroll = Math.max(0, body.length - visible - 1);
      while (
        viewport(maxScroll).first + viewport(maxScroll).rows < body.length
      ) maxScroll += 1;
    }
    const clamp = (value: number) => Math.max(0, Math.min(maxScroll, value));
    let scroll = clamp(requested);
    /** The scroll that puts a body row first on screen. */
    const topAt = (index: number) =>
      clamp(covers ? Math.max(0, index - 1) : index);
    const keep = (index: number, top: boolean) => {
      if (index < 0 || !overflows) return;
      if (top || index < viewport(scroll).first) scroll = topAt(index);
      for (let guard = 0; guard <= body.length; guard += 1) {
        const at = viewport(scroll);
        if (index < at.first + at.rows || scroll >= maxScroll) break;
        scroll += 1;
      }
    };
    if (reveal !== undefined) {
      keep(
        body.findIndex((row) => holds(row, reveal)),
        reveal.startsWith("disclosure:") || reveal.startsWith("group:"),
      );
    }
    if (panel.follow !== undefined) {
      const follow = panel.follow;
      keep(body.findIndex((row) => holds(row, follow)), false);
    }
    let at = overflows
      ? viewport(scroll)
      : { up: 0, first: 0, rows: body.length, down: 0 };
    let gapBeforeFoot = fitted.gapBeforeFoot;
    const last = body[at.first + at.rows - 1];
    // A viewport that ends on a blank separator while rows stay hidden
    // takes the foot's gap for one more row, so two blank rows never stand
    // between hidden content and the foot.
    if (
      overflows && gapBeforeFoot > 0 && at.down === 0 &&
      at.first + at.rows < body.length && last !== undefined &&
      typeof last.text === "string" && last.text.trim() === ""
    ) {
      at = { ...at, rows: at.rows + 1 };
      gapBeforeFoot = 0;
    }
    const below = Math.max(0, body.length - at.first - at.rows);
    const hidden = count(body.slice(at.first + at.rows));
    const shown = { start: at.first, end: at.first + at.rows };
    const foot = panel.foot(below > 0 ? hidden : 0, shown, fitted.moved);
    return {
      fitted: {
        ...fitted,
        gapBeforeFoot,
        visible: fitted.visible + fitted.gapBeforeFoot - gapBeforeFoot,
      },
      scroll,
      at,
      hidden,
      shown,
      foot,
    };
  };
  // Size the foot from the variant this frame draws, not the tallest one it
  // might: read progress and the hidden count change the foot's words, and
  // the foot's height changes the body's viewport, so settle the two.
  let placed = place(panel.foot(0, NOTHING_SHOWN, false).length);
  let tallest = placed.fitted.footRows;
  for (let pass = 0; pass < 4; pass += 1) {
    if (placed.foot.length === placed.fitted.footRows) break;
    tallest = Math.max(tallest, placed.foot.length);
    placed = place(pass < 3 ? placed.foot.length : tallest);
  }
  const { fitted, scroll, at, hidden, shown } = placed;
  const { body, visible, gapAfterHead, gapBeforeFoot } = fitted;
  const marker = (
    direction: "up" | "down",
    count: number,
    key: "page-up" | "page-down",
  ) => ({
    // A marker with nothing countable behind it, such as a section heading
    // alone, holds its row blank rather than claim `0 more`.
    text: count === 0 ? "" : spread(
      context,
      "",
      raised(context, overflowMarker(context, direction, count, key), "faint"),
      width,
    ),
  });
  const bodyRows: PanelRow[] = [
    ...(at.up > 0
      ? [marker("up", count(body.slice(0, at.first)), "page-up")]
      : []),
    ...body.slice(at.first, at.first + at.rows),
    ...(at.down > 0 ? [marker("down", hidden, "page-down")] : []),
  ];
  while (bodyRows.length < visible) bodyRows.push(BLANK);
  const foot = [...placed.foot];
  // Only a layout that never settled holds more foot rows than it draws.
  while (foot.length < fitted.footRows) foot.unshift(BLANK);
  const content: PanelRow[] = [
    ...panel.head,
    ...(gapAfterHead > 0 ? [BLANK] : []),
    ...bodyRows,
    ...(gapBeforeFoot > 0 ? [BLANK] : []),
    ...foot,
  ];
  const glyphs = terminalFrameGlyphs("rounded", context.capabilities.unicode);
  const inner = box.width - 2;
  const frame = (text: string) => ink(context, text, { tone: "faint" });
  const border = (left: string, right: string) =>
    context.painted
      ? fitLine(context, "", box.width, RAISED)
      : `${frame(left)}${frame(glyphs.horizontal.repeat(inner))}${
        frame(right)
      }`;
  const lines: string[] = [border(glyphs.topLeft, glyphs.topRight)];
  const hits: ApplicationHit[] = [];
  for (let row = 0; row < content.length + 2; row += 1) {
    hits.push({
      row,
      start: 0,
      end: box.width,
      target: { kind: "layer", layerId },
    });
  }
  const bodyStart = 1 + panel.head.length + gapAfterHead;
  for (let row = bodyStart; row < bodyStart + visible; row += 1) {
    hits.push({
      row,
      start: 0,
      end: box.width,
      target: { kind: "layer-scroll", layerId },
    });
  }
  for (const row of content) {
    const bar = row.bar === true ? selectionBar(context) : " ";
    // The bar takes the first cell inside the frame, as in a list row, and
    // the selection fill runs from it through the gap to the label.
    const gap = row.bar === true
      ? fitLine(context, "", pad - 1, "selection")
      : " ".repeat(pad - 1);
    const middle = fitLine(
      context,
      `${bar}${gap}${
        truncateStyledText(
          typeof row.text === "function" ? row.text() : row.text,
          width,
          ellipsis(context),
        )
      }`,
      inner,
      RAISED,
    );
    for (const hit of row.hits ?? []) {
      hits.push({
        row: lines.length,
        start: 1 + pad + hit.start,
        end: 1 + pad + Math.min(hit.end, width),
        target: hit.target,
      });
    }
    lines.push(
      context.painted
        ? fitLine(context, ` ${middle} `, box.width, RAISED)
        : `${frame(glyphs.vertical)}${middle}${frame(glyphs.vertical)}`,
    );
  }
  lines.push(border(glyphs.bottomLeft, glyphs.bottomRight));
  return {
    lines,
    hits,
    scroll,
    shown,
    page: visible,
    hidden: body.length > at.first + at.rows ? hidden : 0,
  };
}

/** The foot of a sheet or form: unread overflow, a disabled reason, or the footnote, then buttons. */
function panelFoot<A>(
  context: PaintContext,
  layer: ApplicationSheet<A> | ApplicationForm<A>,
  model: (shown: BodySpan) => TerminalApplicationLayerModel,
  width: number,
): Panel["foot"] {
  return (hidden, shown, moved) => {
    const fitted = model(shown);
    const reason = disabledReason(layer, fitted);
    const unread = layer.kind === "sheet" && layer.readHint !== undefined &&
        requiresFullRead(layer) && !fitted.fullyRead
      ? ` ${layer.readHint}`
      : "";
    // The words that matter most survive: the key goes before the read
    // hint is cut, and the hint goes before the count is.
    const variants = [
      `${overflowMarker(context, "down", hidden, "page-down")}${unread}`,
      `${overflowMarker(context, "down", hidden)}${unread}`,
      overflowMarker(context, "down", hidden, "page-down"),
      overflowMarker(context, "down", hidden),
    ];
    const left = hidden > 0
      ? raised(
        context,
        variants.find((variant) => measureText(variant) <= width) ??
          variants.at(-1) ?? "",
        "faint",
      )
      : reason !== undefined
      ? raised(context, reason, "muted")
      : moved
      ? ""
      : styleRuns(context, layer.footnote, RAISED, "faint");
    if (!buttonRowShown(layer)) {
      return left === ""
        ? []
        : [{ text: truncateStyledText(left, width, ellipsis(context)) }];
    }
    return buttonRows(context, layer, fitted, left, width);
  };
}

/** Wrapped footnote rows, for when the footnote moves into the body. */
function footnoteRows<A>(
  context: PaintContext,
  layer: ApplicationSheet<A> | ApplicationForm<A>,
  width: number,
): readonly PanelRow[] | undefined {
  if (layer.footnote === undefined || layer.footnote.length === 0) {
    return undefined;
  }
  return wrapRuns(context, layer.footnote, width, "faint").map((text) => ({
    text,
  }));
}

/** Add one `[start, end)` range to sorted, disjoint ranges, merging neighbours. */
function addRange(
  ranges: readonly (readonly [number, number])[],
  start: number,
  end: number,
): readonly (readonly [number, number])[] {
  if (start >= end) return ranges;
  const merged: [number, number][] = [];
  let next: [number, number] = [start, end];
  for (const [from, to] of ranges) {
    if (to < next[0]) merged.push([from, to]);
    else if (from > next[1]) {
      merged.push(next);
      next = [from, to];
    } else next = [Math.min(from, next[0]), Math.max(to, next[1])];
  }
  merged.push(next);
  return merged;
}

/**
 * Read progress after a frame showed the body rows in `shown`. Only lines
 * that were on screen while the sheet was under review count, so a jump
 * past the middle of the body leaves the gate closed and a loading body
 * counts for nothing; the body is read once every line in `[0, read)` has
 * been shown, at once when it has no lines.
 */
function readProgress<A>(
  sheet: ApplicationSheet<A>,
  model: TerminalApplicationLayerModel,
  read: number,
  shown: BodySpan,
): TerminalApplicationLayerModel {
  if (model.fullyRead || !sheetUnderReview(sheet.state)) return model;
  const seen = addRange(model.seen, shown.start, Math.min(read, shown.end));
  const first = seen[0];
  const fullyRead = read === 0 ||
    (first !== undefined && first[0] === 0 && first[1] >= read);
  return seen === model.seen && !fullyRead
    ? model
    : { ...model, seen, fullyRead };
}

// ── Sheets ───────────────────────────────────────────────────────────────

/** The package's hint beside a challenge field: how much is left, or whether it matches. */
function challengeHint(
  context: PaintContext,
  value: string,
  mustEqual: string,
): string {
  if (value === mustEqual) {
    return raised(context, context.copy.matches, "success");
  }
  if (!mustEqual.startsWith(value)) {
    return raised(context, context.copy.doesNotMatch, "warning");
  }
  const left = [...graphemes.segment(mustEqual)].length -
    [...graphemes.segment(value)].length;
  return raised(context, context.copy.charactersLeft(left), "faint");
}

function challengeRows<A>(
  context: PaintContext,
  sheet: ApplicationSheet<A>,
  model: TerminalApplicationLayerModel,
  width: number,
): readonly PanelRow[] {
  const challenge = sheet.challenge;
  if (challenge === undefined) return [];
  const control = fieldControl(challenge.fieldId);
  const value = model.values[challenge.fieldId] ?? "";
  const focused = model.focus === control;
  const boxWidth = Math.min(
    width,
    Math.max(16, measureText(challenge.mustEqual) + 4),
  );
  const field = fieldBox(
    context,
    value,
    model.cursors[challenge.fieldId] ?? [...value].length,
    focused,
    boxWidth,
  );
  const hint = challenge.hint === undefined
    ? challengeHint(context, value, challenge.mustEqual)
    : styleRuns(context, challenge.hint, RAISED, "faint");
  const fieldHit: RowHit = {
    start: 0,
    end: boxWidth,
    target: controlHit(sheet.id, control),
  };
  const beside = boxWidth + 3 + measureText(hint) <= width;
  return [
    ...wrapRuns(context, challenge.label, width, "ink").map((text) => ({
      text,
    })),
    beside
      ? { text: `${field}   ${hint}`, hits: [fieldHit], control }
      : { text: field, hits: [fieldHit], control },
    ...(beside ? [] : [{ text: hint }]),
  ];
}

function stepRow(
  context: PaintContext,
  step: ApplicationActivityStep,
  width: number,
  now: number,
): PanelRow {
  const glyph = step.state === "done"
    ? { ...TERMINAL_GLYPHS.done, tone: "success" as const }
    : step.state === "failed"
    ? { ...TERMINAL_GLYPHS.failed, tone: "danger" as const }
    : step.state === "active"
    ? {
      unicode: TERMINAL_GLYPHS.running.unicode,
      ascii: TERMINAL_GLYPHS.running.ascii,
      tone: "accent" as const,
      animation: "spinner" as const,
    }
    : step.state === "skipped"
    ? { ...TERMINAL_GLYPHS.removes, tone: "faint" as const }
    : { ...TERMINAL_GLYPHS.separator, tone: "faint" as const };
  const labelTone: TerminalTextTone = step.state === "pending" ||
      step.state === "skipped"
    ? "muted"
    : "ink";
  let time = "";
  if (step.state === "active" && step.startedAt !== undefined) {
    context.clock = true;
    time = raised(context, durationText(now - step.startedAt), "accent");
  } else if (
    step.startedAt !== undefined && step.endedAt !== undefined
  ) {
    time = raised(
      context,
      durationText(step.endedAt - step.startedAt),
      "faint",
    );
  }
  const label = raised(
    context,
    clip(context, step.label, Math.max(4, width - 3 - measureText(time) - 2)),
    labelTone,
  );
  return {
    text: spread(
      context,
      `${
        styleGlyph(context, {
          unicode: glyph.unicode,
          ascii: glyph.ascii,
          tone: glyph.tone,
          ...("animation" in glyph ? { animation: glyph.animation } : {}),
        }, RAISED)
      }  ${label}`,
      time,
      width,
    ),
  };
}

function activityRows(
  context: PaintContext,
  activity: ApplicationActivity,
  width: number,
  now: number,
): readonly PanelRow[] {
  const rows: PanelRow[] = [];
  for (const line of activity.waits ?? []) {
    rows.push(
      ...wrapRuns(context, line, width, "muted").map((text) => ({ text })),
    );
  }
  if (rows.length > 0) rows.push(BLANK);
  rows.push(
    ...activity.steps.map((step) => stepRow(context, step, width, now)),
  );
  const then = activity.then ?? [];
  if (then.length > 0) {
    rows.push(BLANK);
    const label = context.copy.then;
    for (const [index, line] of then.entries()) {
      const labelWidth = measureText(label);
      const lines = wrapRuns(context, line, width - labelWidth - 2, "ink");
      for (const [part, text] of lines.entries()) {
        rows.push({
          text: `${
            index === 0 && part === 0
              ? raised(context, label, "faint")
              : " ".repeat(labelWidth)
          }  ${text}`,
        });
      }
    }
  }
  if (activity.typicalMs !== undefined) {
    context.clock = true;
    const elapsed = now - activity.startedAt;
    const separator = terminalGlyph("separator", context.capabilities);
    const caption = `${clockText(elapsed)}${
      activity.typicalLabel === undefined
        ? ""
        : ` ${separator} ${activity.typicalLabel}`
    }`;
    const cells = Math.max(4, width - measureText(caption) - 1);
    const filled = Math.round(
      Math.max(0, Math.min(1, elapsed / activity.typicalMs)) * cells,
    );
    rows.push({
      text: `${
        raised(
          context,
          terminalGlyph("meterFill", context.capabilities).repeat(filled),
          "accent",
        )
      }${
        raised(
          context,
          terminalGlyph("meterTrack", context.capabilities).repeat(
            cells - filled,
          ),
          "faint",
        )
      } ${raised(context, caption, "muted")}`,
    });
  }
  return rows;
}

function sheetPanel<A>(
  context: PaintContext,
  sheet: ApplicationSheet<A>,
  model: TerminalApplicationLayerModel,
  width: number,
  top: boolean,
): { readonly panel: Panel; readonly read: number } {
  const now = context.motion.now ?? 0;
  const activity = sheet.activity;
  if (activity !== undefined) context.clock = true;
  const aside = activity !== undefined
    ? raised(context, clockText(now - activity.startedAt), "muted")
    : styleRuns(context, sheet.aside, RAISED, "faint");
  const head: PanelRow[] = [...headRows(context, sheet.title, aside, width)];
  if (sheet.banner !== undefined) {
    head.push(
      ...wrapRuns(context, sheet.banner.runs, width, sheet.banner.tone).map((
        text,
      ) => ({ text })),
    );
  }
  // Progress mode shows its own steps, so the busy line belongs to reviews.
  if (
    sheet.busy !== undefined && activity === undefined &&
    (sheet.state === "loading" || sheet.state === "working")
  ) {
    head.push({
      text: `${
        styleGlyph(context, {
          unicode: TERMINAL_GLYPHS.running.unicode,
          ascii: TERMINAL_GLYPHS.running.ascii,
          tone: "accent",
          animation: "spinner",
        }, RAISED)
      } ${raised(context, clip(context, sheet.busy, width - 2), "muted")}`,
    });
  }
  const body: PanelRow[] = [];
  let read = 0;
  if (activity !== undefined) {
    body.push(...activityRows(context, activity, width, now));
  } else {
    const lines = renderDetailBlocks(context, sheet.body, {
      width,
      wide: true,
      surface: RAISED,
    });
    body.push(...lines.map((text) => ({ text })));
    read = lines.length;
  }
  if (sheetChallengeShown(sheet)) {
    body.push(BLANK, ...challengeRows(context, sheet, model, width));
  }
  const disclosures = sheet.disclosures ?? [];
  if (disclosures.length > 0) {
    body.push(
      BLANK,
      ...disclosureRows(
        context,
        sheet.id,
        disclosures,
        model,
        isTextControl(sheet, model.focus),
        width,
      ),
    );
  }
  const footnote = footnoteRows(context, sheet, width);
  return {
    read,
    panel: {
      head,
      body,
      read,
      footOverflow: true,
      ...(footnote === undefined ? {} : { footnote }),
      foot: panelFoot(
        context,
        sheet,
        (shown) => top ? readProgress(sheet, model, read, shown) : model,
        width,
      ),
    },
  };
}

// ── Forms ────────────────────────────────────────────────────────────────

function choiceText(
  context: PaintContext,
  field: ApplicationChoiceField,
  value: string,
  focused: boolean,
): string {
  const unicode = context.capabilities.unicode;
  return field.options.map((option) => {
    const chosen = option.id === value;
    const marker = unicode ? chosen ? "●" : "○" : chosen ? "(*)" : "( )";
    const tone: TerminalTextTone = option.disabledReason !== undefined
      ? "faint"
      : chosen
      ? "ink"
      : "muted";
    const surface: TerminalSurfaceRole = chosen && focused
      ? "selection"
      : RAISED;
    const text = `${
      ink(context, marker, { tone: chosen ? "accent" : "faint" }, surface)
    } ${ink(context, option.label, { tone, bold: chosen }, surface)}`;
    return chosen && focused
      ? fitLine(context, text, measureText(text), "selection")
      : text;
  }).join(raised(context, "   ", "faint"));
}

function formPanel<A>(
  context: PaintContext,
  form: ApplicationForm<A>,
  model: TerminalApplicationLayerModel,
  width: number,
): Panel {
  const aside = styleRuns(context, form.aside, RAISED, "faint");
  const head = headRows(context, form.title, aside, width);
  const open = (id: string) => model.open[id] === true;
  const fields = visibleFormFields(form, open);
  const grouped = new Set(
    form.fields.flatMap((field) =>
      field.kind === "group" ? field.fields.map((inner) => inner.id) : []
    ),
  );
  const labelWidth = Math.min(
    Math.max(
      8,
      ...fields.filter((field) => field.kind !== "group").map((field) =>
        measureText(
          (field as ApplicationTextField<A> | ApplicationChoiceField).label,
        ) +
        (grouped.has(field.id) ? 2 : 0) + 2
      ),
    ),
    Math.floor(width / 3),
  );
  const fieldWidth = Math.max(8, Math.min(width - labelWidth, 60));
  const body: PanelRow[] = [];
  for (const [index, field] of fields.entries()) {
    if (field.kind === "group") {
      const group = form.fields.find((candidate) => candidate.id === field.id);
      if (group?.kind !== "group") continue;
      const control = groupControl(group.id);
      const focused = model.focus === control;
      const surface: TerminalSurfaceRole = focused ? "selection" : RAISED;
      const marker = ink(
        context,
        terminalGlyph(
          open(group.id) ? "unfolded" : "folded",
          context.capabilities,
        ),
        { tone: "faint" },
        surface,
      );
      const label = `${marker} ${
        ink(context, group.label, { tone: "ink", bold: focused }, surface)
      }`;
      const shown = focused
        ? fitLine(context, label, measureText(label), "selection")
        : label;
      const summary = open(group.id) || group.summary === undefined
        ? ""
        : `   ${raised(context, group.summary, "faint")}`;
      if (index > 0) body.push(BLANK);
      body.push({
        text: `${shown}${summary}`,
        hits: [{
          start: 0,
          end: measureText(label),
          target: controlHit(form.id, control),
        }],
        bar: focused,
        control,
      });
      continue;
    }
    const control = fieldControl(field.id);
    const focused = model.focus === control;
    const indent = grouped.has(field.id) ? 2 : 0;
    const label = raised(
      context,
      padText(
        clip(context, field.label, labelWidth - indent - 1),
        labelWidth - indent,
      ),
      focused ? "ink" : "faint",
    );
    const lead = `${" ".repeat(indent)}${label}`;
    const previous = fields[index - 1];
    if (previous?.kind === "group" && !grouped.has(field.id)) {
      body.push(BLANK);
    }
    if (field.kind === "choice") {
      body.push({
        text: `${lead}${
          choiceText(
            context,
            field,
            model.values[field.id] ?? field.initial,
            focused,
          )
        }`,
        hits: [{
          start: 0,
          end: width,
          target: controlHit(form.id, control),
        }],
        bar: focused,
        control,
      });
      continue;
    }
    const value = model.values[field.id] ?? field.initial;
    const cursor = model.cursors[field.id] ?? [...value].length;
    const boxes = field.multiline === true
      ? fieldArea(context, value, cursor, focused, fieldWidth)
      : [fieldBox(context, value, cursor, focused, fieldWidth)];
    for (const [line, box] of boxes.entries()) {
      body.push({
        text: `${line === 0 ? lead : " ".repeat(labelWidth)}${box}`,
        hits: [{
          start: labelWidth,
          end: labelWidth + fieldWidth,
          target: controlHit(form.id, control),
        }],
        control,
      });
    }
    if (field.hint !== undefined) {
      for (
        const text of wrapRuns(
          context,
          field.hint,
          width - labelWidth - 1,
          "muted",
        )
      ) body.push({ text: `${" ".repeat(labelWidth + 1)}${text}` });
    }
  }
  if (form.preview !== undefined && form.preview.length > 0) {
    body.push(
      BLANK,
      ...renderDetailBlocks(context, form.preview, {
        width,
        wide: true,
        surface: RAISED,
      }).map((text) => ({ text })),
    );
  }
  const disclosures = form.disclosures ?? [];
  if (disclosures.length > 0) {
    body.push(
      BLANK,
      ...disclosureRows(
        context,
        form.id,
        disclosures,
        model,
        isTextControl(form, model.focus),
        width,
      ),
    );
  }
  const footnote = footnoteRows(context, form, width);
  return {
    head,
    body,
    read: 0,
    footOverflow: true,
    ...(footnote === undefined ? {} : { footnote }),
    foot: panelFoot(context, form, () => model, width),
  };
}

// ── Menus ────────────────────────────────────────────────────────────────

function menuItemRow(
  context: PaintContext,
  label: string,
  detail: string,
  key: string,
  width: number,
  highlighted: boolean,
  tone: TerminalTextTone,
): string {
  const surface: TerminalSurfaceRole = highlighted ? "selection" : RAISED;
  const keyed = key === ""
    ? ""
    : ink(context, key, { tone: "ink", bold: true }, surface);
  // The key keeps one cell of the row after it, so a highlight's fill
  // closes past the key rather than against it.
  const room = Math.max(1, width - 1 - measureText(key) - (key === "" ? 0 : 2));
  const left = truncateStyledText(
    `${ink(context, label, { tone, bold: highlighted }, surface)}${detail}`,
    room,
    ellipsis(context),
  );
  const text = spread(context, left, keyed, width - 1);
  return highlighted ? fitLine(context, text, width, "selection") : text;
}

/**
 * An unavailable menu row: its mark and muted label, and inline beside a
 * section's own items, its sentence in faint text.
 */
function unavailableRow(
  context: PaintContext,
  item: ApplicationUnavailableItem,
  width: number,
  highlighted: boolean,
  inline: boolean,
): string {
  const surface: TerminalSurfaceRole = highlighted ? "selection" : RAISED;
  const reason = inline
    ? `  ${ink(context, item.sentence, { tone: "faint" }, surface)}`
    : "";
  const text = truncateStyledText(
    `${
      ink(context, terminalGlyph("unavailable", context.capabilities), {
        tone: "faint",
      }, surface)
    } ${
      ink(context, item.label, { tone: "muted", bold: highlighted }, surface)
    }${reason}`,
    width,
    ellipsis(context),
  );
  return highlighted ? fitLine(context, text, width, "selection") : text;
}

function menuPanel<A>(
  context: PaintContext,
  menu: ApplicationMenu<A>,
  model: TerminalApplicationLayerModel,
  width: number,
  boxHeight: number,
): Panel {
  const columns: 1 | 2 = menu.columns === 2 && width >= 56 ? 2 : 1;
  const rows = menuRows(menu, model.query, columns, model.unavailableOpen);
  const filter = model.filtering || model.query !== ""
    ? `${raised(context, "/", "faint")} ${raised(context, model.query, "ink")}${
      model.filtering
        ? raised(
          context,
          terminalGlyph("cursor", context.capabilities),
          "accent",
        )
        : ""
    }`
    : styleRuns(context, menu.aside, RAISED, "faint");
  const head = headRows(context, menu.title, filter, width);
  const gap = 3;
  const columnWidth = columns === 2 ? Math.floor((width - gap) / 2) : width;
  const columnRows = rows.columns.map((sections) => {
    const lines: { text: string; control?: LayerControl }[] = [];
    for (const [index, entry] of sections.entries()) {
      if (index > 0) lines.push({ text: "" });
      lines.push({
        text: raised(
          context,
          clip(context, entry.section.title, columnWidth),
          entry.section.tone ?? "faint",
        ),
      });
      for (const item of entry.items) {
        const control = itemControl(item.id);
        const highlighted = model.focus === control;
        const detail = item.detail === undefined ? "" : `  ${
          styleRuns(
            context,
            item.detail,
            highlighted ? "selection" : RAISED,
            "muted",
          )
        }`;
        lines.push({
          text: menuItemRow(
            context,
            item.label,
            detail,
            item.key === undefined ? "" : keyText(context, item.key),
            columnWidth,
            highlighted,
            item.tone ?? "ink",
          ),
          control,
        });
      }
      for (const item of entry.unavailable) {
        const control = unavailableControl(item.id);
        lines.push({
          text: unavailableRow(
            context,
            item,
            columnWidth,
            model.focus === control,
            true,
          ),
          control,
        });
      }
    }
    return lines;
  });
  const height = Math.max(0, ...columnRows.map((lines) => lines.length));
  const body: PanelRow[] = [];
  for (let index = 0; index < height; index += 1) {
    const left = columnRows[0]?.[index];
    const right = columnRows[1]?.[index];
    const hits: RowHit[] = [];
    if (left?.control !== undefined) {
      hits.push({
        start: 0,
        end: columnWidth,
        target: controlHit(menu.id, left.control),
      });
    }
    if (right?.control !== undefined) {
      hits.push({
        start: columnWidth + gap,
        end: columnWidth * 2 + gap,
        target: controlHit(menu.id, right.control),
      });
    }
    const rightFocused = right?.control !== undefined &&
      model.focus === right.control;
    const rightBar = rightFocused
      ? `${selectionBar(context)}${fitLine(context, "", 1, "selection")}`
      : "  ";
    const text = columns === 2
      ? `${padText(left?.text ?? "", columnWidth)}${
        " ".repeat(gap - 2)
      }${rightBar}${right?.text ?? ""}`
      : left?.text ?? "";
    const control = left?.control !== undefined && model.focus === left.control
      ? left.control
      : right?.control !== undefined && model.focus === right.control
      ? right.control
      : left?.control ?? right?.control;
    body.push({
      text,
      hits,
      bar: left?.control !== undefined && model.focus === left.control,
      ...(control === undefined ? {} : { control }),
    });
  }
  if (rows.unavailable !== undefined && menu.unavailable !== undefined) {
    if (body.length > 0) body.push(BLANK);
    if (model.query.trim() === "") {
      const highlighted = model.focus === UNAVAILABLE_SECTION;
      const surface: TerminalSurfaceRole = highlighted ? "selection" : RAISED;
      const text = `${
        ink(
          context,
          terminalGlyph(
            rows.unavailableOpen ? "unfolded" : "folded",
            context.capabilities,
          ),
          { tone: "faint" },
          surface,
        )
      } ${
        ink(context, menu.unavailable.title, {
          tone: "muted",
          bold: highlighted,
        }, surface)
      }${
        ink(
          context,
          `  ${menu.unavailable.items.length}`,
          { tone: "faint" },
          surface,
        )
      }`;
      body.push({
        text: highlighted ? fitLine(context, text, width, "selection") : text,
        hits: [{
          start: 0,
          end: width,
          target: controlHit(menu.id, UNAVAILABLE_SECTION),
        }],
        bar: highlighted,
        control: UNAVAILABLE_SECTION,
      });
    }
    if (rows.unavailableOpen) {
      for (const item of rows.unavailable) {
        const control = unavailableControl(item.id);
        const highlighted = model.focus === control;
        body.push({
          text: unavailableRow(context, item, width, highlighted, false),
          hits: [{
            start: 0,
            end: width,
            target: controlHit(menu.id, control),
          }],
          bar: highlighted,
          control,
        });
      }
    }
  }
  if (body.length === 0) {
    body.push({ text: raised(context, context.copy.noMatches, "faint") });
  }
  const descriptions = [
    ...menu.sections.flatMap((section) =>
      section.items.map((item) => ({
        label: item.label,
        runs: item.description,
      }))
    ),
    ...[
      ...menu.sections.flatMap((section) => section.unavailable ?? []),
      ...(menu.unavailable?.items ?? []),
    ].map((item) => ({
      label: "",
      runs: [{ text: item.sentence }] as readonly ApplicationRun[],
    })),
  ];
  // The highlighted item's description; an unavailable one's sentence alone.
  const describe = (
    label: string,
    runs: readonly ApplicationRun[] | undefined,
  ) =>
    wrapRuns(
      context,
      [
        ...(label === "" ? [] : [{ text: label, role: "title" as const }]),
        ...(runs === undefined
          ? []
          : [...(label === "" ? [] : [{ text: "  " }]), ...runs]),
      ],
      width,
      "muted",
    ).slice(0, 2);
  // A short panel spends its rows on choices, not descriptions.
  const reserved = boxHeight < MENU_DESCRIPTION_ROWS ? 0 : Math.max(
    0,
    ...descriptions.filter((entry) => entry.runs !== undefined).map((entry) =>
      describe(entry.label, entry.runs).length
    ),
  );
  return {
    head,
    body,
    read: 0,
    footOverflow: false,
    counts: "choices",
    follow: model.focus,
    foot: () => {
      const footnote = menu.footnote === undefined ||
          boxHeight < MENU_DESCRIPTION_ROWS
        ? []
        : wrapRuns(context, menu.footnote, width, "faint").map((text) => ({
          text,
        }));
      if (reserved === 0) return footnote;
      const control = model.focus;
      const item = menu.sections.flatMap((section) => section.items).find((
        candidate,
      ) => itemControl(candidate.id) === control);
      const { kind, id } = parseControl(control);
      const unavailable = kind === "unavailable"
        ? unavailableMenuItem(menu, id)
        : undefined;
      // Whatever is highlighted names itself at least, so the space held
      // for descriptions never stands empty.
      const lines = item !== undefined
        ? describe(item.label, item.description)
        : unavailable !== undefined
        ? model.why === unavailable.id
          ? describe("", [{ text: unavailable.sentence }])
          : describe(unavailable.label, undefined)
        : control === UNAVAILABLE_SECTION && menu.unavailable !== undefined
        ? describe(menu.unavailable.title, undefined)
        : [];
      const padded: PanelRow[] = lines.map((text) => ({ text }));
      while (padded.length < reserved) padded.push(BLANK);
      return [...padded, ...(footnote.length > 0 ? [BLANK, ...footnote] : [])];
    },
  };
}

// ── Palettes ─────────────────────────────────────────────────────────────

function palettePanel<A>(
  context: PaintContext,
  palette: ApplicationPalette<A>,
  model: TerminalApplicationLayerModel,
  width: number,
): Panel {
  const lead = raised(
    context,
    terminalGlyph("crumb", context.capabilities),
    "accent",
  );
  const head: PanelRow[] = [{
    text: `${lead} ${
      fieldBox(
        context,
        model.query,
        model.queryCursor,
        true,
        Math.max(4, width - 2),
        palette.placeholder,
      )
    }`,
  }];
  const result = paletteRows(palette, model.query);
  const metaWidth = Math.min(
    Math.floor(width / 3),
    Math.max(0, ...result.items.map((item) => runsWidth(context, item.meta))),
  );
  const keyWidth = Math.max(
    0,
    ...result.items.map((item) =>
      item.key === undefined ? 0 : measureText(keyText(context, item.key))
    ),
  );
  const body: PanelRow[] = [];
  for (const row of result.rows) {
    if (row.kind === "section") {
      if (body.length > 0) body.push(BLANK);
      body.push({ text: raised(context, row.title, "faint") });
      continue;
    }
    const item = row.item;
    const control = itemControl(item.id);
    const highlighted = model.highlight === item.id;
    const surface: TerminalSurfaceRole = highlighted ? "selection" : RAISED;
    const styled = (): string => {
      const trailing = [
        ...(metaWidth > 0
          ? [
            padText(
              truncateStyledText(
                styleRuns(context, item.meta, surface, "faint"),
                metaWidth,
                ellipsis(context),
              ),
              metaWidth,
              "end",
            ),
          ]
          : []),
        ...(keyWidth > 0
          ? [
            padText(
              item.key === undefined
                ? ""
                : ink(context, keyText(context, item.key), {
                  tone: "ink",
                  bold: true,
                }, surface),
              keyWidth,
              "end",
            ),
          ]
          : []),
      ].join("  ");
      const room = Math.max(4, width - 1 - measureText(trailing) - 2);
      const label = truncateStyledText(
        `${
          ink(context, item.label, { tone: "ink", bold: highlighted }, surface)
        }${
          item.context === undefined
            ? ""
            : `  ${ink(context, item.context, { tone: "muted" }, surface)}`
        }`,
        room,
        ellipsis(context),
      );
      const text = spread(context, label, trailing, width - 1);
      return highlighted ? fitLine(context, text, width, "selection") : text;
    };
    body.push({
      text: styled,
      hits: [{ start: 0, end: width, target: controlHit(palette.id, control) }],
      bar: highlighted,
      control,
    });
  }
  if (result.items.length === 0) {
    body.push({ text: raised(context, context.copy.noMatches, "faint") });
  }
  return {
    head,
    body,
    read: 0,
    footOverflow: false,
    counts: "choices",
    ...(model.highlight === undefined
      ? {}
      : { follow: itemControl(model.highlight) }),
    foot: () => [],
  };
}

// ── Readers ──────────────────────────────────────────────────────────────

/** The fewest rows a menu needs before it shows descriptions and its footnote. */
const MENU_DESCRIPTION_ROWS = 12;

/** The narrowest reader that lays its blocks in two columns. */
const READER_TWO_COLUMNS = 70;

/** The control a reader's selected row carries, so the panel follows it. */
const READER_SELECTION: LayerControl = "rows:selected";

function readerPanel<A>(
  context: PaintContext,
  reader: ApplicationReader<A>,
  width: number,
  rows: ReaderRows | undefined,
): Panel {
  const aside = styleRuns(context, reader.aside, RAISED, "faint");
  const head = headRows(context, reader.title, aside, width);
  const body: PanelRow[] =
    (reader.columns === 2 && width >= READER_TWO_COLUMNS
      ? twoColumns(context, reader.blocks, width)
      : renderDetailBlocks(context, reader.blocks, {
        width,
        wide: true,
        surface: RAISED,
      })).map((text) => ({ text }));
  if (rows !== undefined) {
    if (body.length > 0) body.push(BLANK);
    for (const [index, line] of rows.lines.entries()) {
      const key = rows.keys[index];
      body.push({
        text: line,
        ...(key === undefined ? {} : {
          hits: [{
            start: 0,
            end: width,
            target: { kind: "row", listId: rows.listId, key },
          }],
        }),
        ...(index === rows.selected ? { control: READER_SELECTION } : {}),
      });
    }
  }
  if (reader.footnote !== undefined && reader.footnote.length > 0) {
    if (body.length > 0) body.push(BLANK);
    body.push(
      ...wrapRuns(context, reader.footnote, width, "faint").map((text) => ({
        text,
      })),
    );
  }
  return {
    head,
    body,
    read: 0,
    footOverflow: false,
    ...(rows?.selected === undefined ? {} : { follow: READER_SELECTION }),
    foot: () => [],
  };
}

/**
 * Blocks in two columns read top to bottom, left then right: the first
 * column takes blocks until it holds at least half the lines, and no block
 * splits.
 */
function twoColumns(
  context: PaintContext,
  blocks: readonly ApplicationDetailBlock[],
  width: number,
): readonly string[] {
  const gap = 3;
  const columnWidth = Math.floor((width - gap) / 2);
  const render = (part: readonly ApplicationDetailBlock[]) =>
    part.flatMap((block, index) => [
      ...(index === 0 ? [] : [""]),
      ...renderDetailBlocks(context, [block], {
        width: columnWidth,
        wide: true,
        surface: RAISED,
        keyWidth: hintsKeyWidth(context, part),
      }),
    ]);
  const shown = blocks.filter((block) => render([block]).length > 0);
  // The first column takes the blocks that keep the taller column lowest.
  let best: readonly [readonly string[], readonly string[]] = [
    render(shown),
    [],
  ];
  for (let at = 1; at < shown.length; at += 1) {
    const left = render(shown.slice(0, at));
    const right = render(shown.slice(at));
    if (
      Math.max(left.length, right.length) <
        Math.max(...best.map((part) => part.length))
    ) {
      best = [left, right];
    }
  }
  const [left, right] = best;
  return Array.from(
    { length: Math.max(left.length, right.length) },
    (_, index) =>
      `${padText(left[index] ?? "", columnWidth)}${" ".repeat(gap)}${
        right[index] ?? ""
      }`,
  );
}

/**
 * Render one layer into its box. Returns exactly the box's width on each
 * line, at most its height in lines, hits relative to the layer's first
 * cell, and the layer model with its scroll and page fitted to this frame;
 * the top layer's read progress also counts the body rows it showed.
 */
export function renderLayer<A>(
  context: PaintContext,
  layer: ApplicationLayer<A>,
  model: TerminalApplicationLayerModel,
  box: LayerBox,
  rows: ReaderRows | undefined,
  top: boolean,
): LayerPaint {
  const width = layerContentWidth(box);
  let read = 0;
  let panel: Panel;
  switch (layer.kind) {
    case "sheet": {
      const built = sheetPanel(context, layer, model, width, top);
      panel = built.panel;
      read = built.read;
      break;
    }
    case "form":
      panel = formPanel(context, layer, model, width);
      break;
    case "menu":
      panel = menuPanel(context, layer, model, width, box.height);
      break;
    case "palette":
      panel = palettePanel(context, layer, model, width);
      break;
    case "reader":
      panel = readerPanel(context, layer, width, rows);
      break;
  }
  const fitted = composePanel(
    context,
    layer.id,
    panel,
    box,
    model.scroll,
    model.reveal,
  );
  const { reveal: _reveal, ...rest } = model;
  // Only the top layer is being read; a layer beneath it is covered or receded.
  const next = layer.kind === "sheet" && top
    ? readProgress(layer, rest, read, fitted.shown)
    : rest;
  return {
    lines: fitted.lines,
    hits: fitted.hits,
    model: { ...next, scroll: fitted.scroll, page: fitted.page },
    hiddenBelow: fitted.hidden,
  };
}
