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
import { renderDetailBlocks } from "./detail-render.ts";
import type { ApplicationHit, ApplicationHitTarget } from "./hits.ts";
import {
  buttonControl,
  disclosureControl,
  fieldControl,
  groupControl,
  isTextControl,
  itemControl,
  type LayerControl,
  sheetChallengeShown,
  UNAVAILABLE_SECTION,
  unavailableControl,
  visibleFormFields,
} from "./layer-controls.ts";
import {
  buttonEnabled,
  requiresFullRead,
  type TerminalApplicationLayerModel,
} from "./layer-model.ts";
import { menuRows, paletteRows } from "./layer-search.ts";
import type {
  ActivityStep,
  ActivitySteps,
  ApplicationForm,
  ApplicationLayer,
  ApplicationMenu,
  ApplicationPalette,
  ApplicationReader,
  ApplicationSheet,
  FormChoiceField,
  FormTextField,
  LayerDisclosure,
} from "./layer-view.ts";
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
import type { InlineRun } from "./view.ts";

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
}

/** Everything a panel shows, before it is fitted to a height. */
interface Panel {
  readonly head: readonly PanelRow[];
  readonly body: readonly PanelRow[];
  /** Body rows, from the top, that must pass through view before confirming. */
  readonly read: number;
  /**
   * The pinned foot, given how many body rows are hidden below, how far
   * the body has been on screen, and whether the footnote moved into the
   * body. A panel whose foot names what is hidden sets `footOverflow`.
   */
  readonly foot: (
    hidden: number,
    seenThrough: number,
    moved: boolean,
  ) => readonly PanelRow[];
  readonly footOverflow: boolean;
  /** A footnote that moves into the body when the body cannot fit. */
  readonly footnote?: readonly PanelRow[];
  /** Keep the body row holding this control in view. */
  readonly follow?: LayerControl;
}

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
  runs: readonly InlineRun[],
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

/** The title row: the title, and an aside against the end when it fits. */
function headRows(
  context: PaintContext,
  title: string,
  aside: string,
  width: number,
): readonly PanelRow[] {
  const asideWidth = measureText(aside);
  const room = asideWidth === 0 ? width : Math.max(8, width - asideWidth - 2);
  const lines = titleLines(context, title, room);
  return lines.map((line, index) => ({
    text: index === 0 ? spread(line, aside, width) : line,
  }));
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
  const parts = layer.buttons.map((button) => {
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
  const lines: PanelRow[] = [];
  const leftWidth = measureText(left);
  for (const [index, row] of rows.entries()) {
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
    const last = index === rows.length - 1;
    const beside = last && left !== "" && leftWidth + 2 <= start;
    if (last && left !== "" && !beside) {
      lines.push({ text: truncateStyledText(left, width, ellipsis(context)) });
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
  disclosures: readonly LayerDisclosure[],
  model: TerminalApplicationLayerModel,
  inField: boolean,
  width: number,
): readonly PanelRow[] {
  const rows: PanelRow[] = [];
  let flow: { text: string; hits: RowHit[]; width: number } | undefined;
  const flush = () => {
    if (flow !== undefined) rows.push({ text: flow.text, hits: flow.hits });
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
      const line = spread(`${marker} ${label}`, keyed, width);
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
      };
    } else {
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

/** Cells between the frame and the content on each side. */
function sidePadding(box: LayerBox): number {
  return box.narrow ? 1 : 2;
}

/** The content width a layer's rows may use. */
export function layerContentWidth(box: LayerBox): number {
  return Math.max(1, box.width - 2 - 2 * sidePadding(box));
}

/** A panel fitted to its box. */
interface Fitted {
  readonly lines: readonly string[];
  readonly hits: readonly ApplicationHit[];
  readonly scroll: number;
  /** Body rows from the top that are, or have been, on screen. */
  readonly seenThrough: number;
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
  const pad = sidePadding(box);
  const width = layerContentWidth(box);
  const footRows = Math.max(
    panel.foot(0, 0, false).length,
    panel.foot(999, 0, true).length,
  );
  let gapAfterHead = panel.head.length > 0 ? 1 : 0;
  let gapBeforeFoot = footRows > 0 ? 1 : 0;
  const room = () =>
    box.height - 2 - panel.head.length - gapAfterHead - gapBeforeFoot -
    footRows;
  if (room() < Math.min(3, panel.body.length)) gapAfterHead = 0;
  if (room() < Math.min(3, panel.body.length)) gapBeforeFoot = 0;
  const available = Math.max(1, room());
  const moved = panel.body.length > available && panel.footnote !== undefined;
  const body = moved
    ? [...panel.body, BLANK, ...(panel.footnote ?? [])]
    : panel.body;
  const visible = box.stretch
    ? available
    : Math.min(available, Math.max(1, body.length));
  const overflows = body.length > visible;
  // Once scrolled, an upper marker takes the first row; a lower marker takes
  // the last unless the foot names what is hidden.
  const capacity = (scroll: number): number => {
    let rows = visible - (scroll > 0 ? 1 : 0);
    if (!panel.footOverflow && scroll + rows < body.length) rows -= 1;
    return Math.max(1, rows);
  };
  const maxScroll = overflows
    ? Math.max(0, body.length - Math.max(1, visible - 1))
    : 0;
  const clamp = (value: number) => Math.max(0, Math.min(maxScroll, value));
  let scroll = clamp(requested);
  const keep = (index: number, top: boolean) => {
    if (index < 0 || !overflows) return;
    if (top || index < scroll) scroll = clamp(index);
    for (let guard = 0; guard <= body.length; guard += 1) {
      if (index < scroll + capacity(scroll) || scroll >= maxScroll) break;
      scroll += 1;
    }
  };
  if (reveal !== undefined) {
    keep(
      body.findIndex((row) => row.control === reveal),
      reveal.startsWith("disclosure:") || reveal.startsWith("group:"),
    );
  }
  if (panel.follow !== undefined) {
    keep(body.findIndex((row) => row.control === panel.follow), false);
  }
  const rows = overflows ? capacity(scroll) : body.length;
  const below = Math.max(0, body.length - scroll - rows);
  const hidden = visibleRows(body.slice(scroll + rows));
  const marker = (direction: "up" | "down", count: number, key: string) => ({
    text: spread(
      "",
      raised(context, overflowMarker(context, direction, count, key), "faint"),
      width,
    ),
  });
  const bodyRows: PanelRow[] = [
    ...(scroll > 0
      ? [marker("up", visibleRows(body.slice(0, scroll)), "PgUp")]
      : []),
    ...body.slice(scroll, scroll + rows),
    ...(!panel.footOverflow && below > 0
      ? [marker("down", hidden, "PgDn")]
      : []),
  ];
  while (bodyRows.length < visible) bodyRows.push(BLANK);
  const foot = [...panel.foot(below > 0 ? hidden : 0, scroll + rows, moved)];
  while (foot.length < footRows) foot.unshift(BLANK);
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
    const bar = row.bar === true
      ? ink(context, terminalGlyph("selection", context.capabilities), {
        tone: "accent",
      }, "selection")
      : " ";
    // The bar takes the first cell inside the frame, as in a list row.
    const middle = fitLine(
      context,
      `${bar}${" ".repeat(pad - 1)}${
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
    seenThrough: scroll + rows,
    page: visible,
    hidden: below > 0 ? hidden : 0,
  };
}

/** The foot of a sheet or form: unread overflow, a disabled reason, or the footnote, then buttons. */
function panelFoot<A>(
  context: PaintContext,
  layer: ApplicationSheet<A> | ApplicationForm<A>,
  model: (seenThrough: number) => TerminalApplicationLayerModel,
  width: number,
): Panel["foot"] {
  return (hidden, seenThrough, moved) => {
    const fitted = model(seenThrough);
    const reason = disabledReason(layer, fitted);
    const prompt = layer.kind === "sheet" && layer.readPrompt !== undefined &&
        requiresFullRead(layer) && !fitted.fullyRead
      ? ` ${layer.readPrompt}`
      : "";
    const left = hidden > 0
      ? raised(
        context,
        `${overflowMarker(context, "down", hidden, "PgDn")}${prompt}`,
        "faint",
      )
      : reason !== undefined
      ? raised(context, reason, "muted")
      : moved
      ? ""
      : styleRuns(context, layer.footnote, RAISED, "faint");
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

/** Read progress after a frame showed body rows through `seenThrough`. */
function readProgress(
  model: TerminalApplicationLayerModel,
  read: number,
  seenThrough: number,
): TerminalApplicationLayerModel {
  const seen = Math.max(model.seen, Math.min(read, seenThrough));
  const fullyRead = model.fullyRead || seen >= read;
  return seen === model.seen && fullyRead === model.fullyRead
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
    return raised(context, "Matches", "success");
  }
  if (!mustEqual.startsWith(value)) {
    return raised(context, "Does not match", "warning");
  }
  const left = [...graphemes.segment(mustEqual)].length -
    [...graphemes.segment(value)].length;
  return raised(
    context,
    `${left} more character${left === 1 ? "" : "s"}`,
    "faint",
  );
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
  step: ActivityStep,
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
  activity: ActivitySteps,
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
    const label = "Then";
    for (const [index, line] of then.entries()) {
      const lines = wrapRuns(context, line, width - label.length - 2, "ink");
      for (const [part, text] of lines.entries()) {
        rows.push({
          text: `${
            index === 0 && part === 0
              ? raised(context, label, "faint")
              : " ".repeat(label.length)
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
        (seenThrough) => readProgress(model, read, seenThrough),
        width,
      ),
    },
  };
}

// ── Forms ────────────────────────────────────────────────────────────────

function choiceText(
  context: PaintContext,
  field: FormChoiceField,
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
  const aside = form.aside === undefined
    ? ""
    : raised(context, form.aside, "faint");
  const head = headRows(context, form.title, aside, width);
  const open = (id: string) => model.open[id] === true;
  const fields = visibleFormFields(form, open);
  const grouped = new Set(
    form.fields.flatMap((field) =>
      field.kind === "disclosure" ? field.fields.map((inner) => inner.id) : []
    ),
  );
  const labelWidth = Math.min(
    Math.max(
      8,
      ...fields.filter((field) => field.kind !== "disclosure").map((field) =>
        measureText((field as FormTextField<A> | FormChoiceField).label) +
        (grouped.has(field.id) ? 2 : 0) + 2
      ),
    ),
    Math.floor(width / 3),
  );
  const fieldWidth = Math.max(8, Math.min(width - labelWidth, 60));
  const body: PanelRow[] = [];
  for (const [index, field] of fields.entries()) {
    if (field.kind === "disclosure") {
      const group = form.fields.find((candidate) => candidate.id === field.id);
      if (group?.kind !== "disclosure") continue;
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
    if (previous?.kind === "disclosure" && !grouped.has(field.id)) {
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
  const room = Math.max(1, width - measureText(key) - (key === "" ? 0 : 2));
  const left = truncateStyledText(
    `${ink(context, label, { tone, bold: highlighted }, surface)}${detail}`,
    room,
    ellipsis(context),
  );
  const text = spread(left, keyed, width);
  return highlighted ? fitLine(context, text, width, "selection") : text;
}

function menuPanel<A>(
  context: PaintContext,
  menu: ApplicationMenu<A>,
  model: TerminalApplicationLayerModel,
  width: number,
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
    : menu.aside === undefined
    ? ""
    : raised(context, menu.aside, "faint");
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
            item.tone === "danger" ? "danger" : "ink",
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
    const rightBar =
      right?.control !== undefined && model.focus === right.control
        ? ink(context, terminalGlyph("selection", context.capabilities), {
          tone: "accent",
        }, "selection")
        : " ";
    const text = columns === 2
      ? `${padText(left?.text ?? "", columnWidth)}${
        " ".repeat(gap - 2)
      }${rightBar} ${right?.text ?? ""}`
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
        const surface: TerminalSurfaceRole = highlighted ? "selection" : RAISED;
        const text = `${
          ink(context, terminalGlyph("unavailable", context.capabilities), {
            tone: "faint",
          }, surface)
        } ${
          ink(
            context,
            item.label,
            { tone: "muted", bold: highlighted },
            surface,
          )
        }`;
        body.push({
          text: highlighted ? fitLine(context, text, width, "selection") : text,
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
    body.push({ text: raised(context, "No matches", "faint") });
  }
  const descriptions = [
    ...menu.sections.flatMap((section) =>
      section.items.map((item) => ({
        label: item.label,
        runs: item.description,
      }))
    ),
    ...(menu.unavailable?.items ?? []).map((item) => ({
      label: "",
      runs: [{ text: item.sentence }] as readonly InlineRun[],
    })),
  ];
  // The highlighted item's description; an unavailable one's sentence alone.
  const describe = (label: string, runs: readonly InlineRun[] | undefined) =>
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
  const reserved = Math.max(
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
    follow: model.focus,
    foot: () => {
      if (reserved === 0) return [];
      const control = model.focus;
      const item = menu.sections.flatMap((section) => section.items).find((
        candidate,
      ) => itemControl(candidate.id) === control);
      const unavailable = menu.unavailable?.items.find((candidate) =>
        unavailableControl(candidate.id) === control
      );
      const lines = item !== undefined
        ? describe(item.label, item.description)
        : unavailable !== undefined
        ? model.why === unavailable.id
          ? describe("", [{ text: unavailable.sentence }])
          : describe(unavailable.label, undefined)
        : [];
      const padded: PanelRow[] = lines.map((text) => ({ text }));
      while (padded.length < reserved) padded.push(BLANK);
      return padded;
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
  const prompt = raised(
    context,
    terminalGlyph("crumb", context.capabilities),
    "accent",
  );
  const head: PanelRow[] = [{
    text: `${prompt} ${
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
      const room = Math.max(4, width - measureText(trailing) - 2);
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
      const text = spread(label, trailing, width);
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
    body.push({ text: raised(context, "No matches", "faint") });
  }
  return {
    head,
    body,
    read: 0,
    footOverflow: false,
    ...(model.highlight === undefined
      ? {}
      : { follow: itemControl(model.highlight) }),
    foot: () => [],
  };
}

// ── Readers ──────────────────────────────────────────────────────────────

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
  const body: PanelRow[] = renderDetailBlocks(context, reader.blocks, {
    width,
    wide: true,
    surface: RAISED,
  }).map((text) => ({ text }));
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
 * Render one layer into its box. Returns exactly the box's width on each
 * line, at most its height in lines, hits relative to the layer's first
 * cell, and the layer model with its scroll, page, and read progress
 * fitted to this frame.
 */
export function renderLayer<A>(
  context: PaintContext,
  layer: ApplicationLayer<A>,
  model: TerminalApplicationLayerModel,
  box: LayerBox,
  rows?: ReaderRows,
): LayerPaint {
  const width = layerContentWidth(box);
  let read = 0;
  let panel: Panel;
  switch (layer.kind) {
    case "sheet": {
      const built = sheetPanel(context, layer, model, width);
      panel = built.panel;
      read = built.read;
      break;
    }
    case "form":
      panel = formPanel(context, layer, model, width);
      break;
    case "menu":
      panel = menuPanel(context, layer, model, width);
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
  const next = layer.kind === "sheet"
    ? readProgress(rest, read, fitted.seenThrough)
    : rest;
  return {
    lines: fitted.lines,
    hits: fitted.hits,
    model: { ...next, scroll: fitted.scroll, page: fitted.page },
    hiddenBelow: fitted.hidden,
  };
}
