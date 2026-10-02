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
import {
  hintsKeyWidth,
  layoutDetailBlocks,
  renderDetailBlocks,
} from "./detail-render.ts";
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
  clockText,
  durationText,
  fitLine,
  fitProse,
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
  /** A section's title, which never ends a viewport that hides rows below it. */
  readonly heading?: boolean;
  /**
   * The row continues the unit above it, such as a mark's wrapped text, so
   * a viewport that hides rows below ends before the unit rather than
   * inside it.
   */
  readonly continues?: boolean;
  /**
   * A foot row that names what the body hides; it follows the body's last
   * row directly, and the rows the body leaves free fall beneath it.
   */
  readonly attached?: boolean;
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
   * The pinned foot, given how many body rows are hidden below and the body
   * rows this frame shows. A panel whose foot names what is hidden sets
   * `footOverflow`; its overflow row is `attached` to the body.
   */
  readonly foot: (
    hidden: number,
    shown: BodySpan,
    room: number,
  ) => readonly PanelRow[];
  readonly footOverflow: boolean;
  /** Keep the body row holding this control in view. */
  readonly follow?: LayerControl;
  /**
   * The panel to compose instead while this one's body overflows its box,
   * such as a sheet whose challenge pins above its buttons; used only
   * while that panel's body keeps {@linkcode PINNED_BODY_ROWS} rows.
   */
  readonly whenOverflowing?: Panel;
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

/**
 * Detail blocks as panel rows at a panel's width, each row that continues
 * a unit above it — a mark's wrapped text, a fact's further values — saying
 * so, so a viewport ends at a whole unit.
 */
function detailRows(
  context: PaintContext,
  blocks: readonly ApplicationDetailBlock[],
  width: number,
): readonly PanelRow[] {
  const { lines, continued } = layoutDetailBlocks(context, blocks, {
    width,
    wide: true,
    surface: RAISED,
  });
  return lines.map((text, index) =>
    continued.has(index) ? { text, continues: true } : { text }
  );
}

/** A key as its hint shows it, such as `^T` or `d`. */
function keyText(context: PaintContext, key: KeyChord): string {
  return formatKeyChord(key, context.capabilities);
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
 * when it does not fit beside them. Buttons that do not fit one row first
 * close the gap between them to one cell, and then stand one per row, so
 * no button is left alone on a row beneath the others; the text above them
 * wraps. A `compact` layout, for a panel short of rows, instead packs as
 * many buttons as fit on each row and cuts the text to one line.
 */
function buttonRows<A>(
  context: PaintContext,
  layer: ApplicationSheet<A> | ApplicationForm<A>,
  model: TerminalApplicationLayerModel,
  left: string,
  width: number,
  compact = false,
): readonly PanelRow[] {
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
  const parts = render();
  const across = (gap: number) =>
    parts.reduce((total, part) => total + part.width, 0) +
        gap * Math.max(0, parts.length - 1) <= width;
  const gap = across(2) ? 2 : 1;
  const pack = () => {
    const packed: (typeof parts)[] = [];
    let current: typeof parts = [];
    let used = 0;
    for (const part of parts) {
      if (current.length > 0 && used + gap + part.width > width) {
        packed.push(current);
        current = [];
      }
      used = current.length === 0 ? part.width : used + gap + part.width;
      current.push(part);
    }
    if (current.length > 0) packed.push(current);
    return packed;
  };
  const rows = across(gap)
    ? [parts]
    : compact
    ? pack()
    : parts.map((part) => [part]);
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
  // Above the buttons the text wraps: a footnote is the sheet's closing
  // sentence and a reason says why a button cannot run, so neither is cut
  // while the panel has the rows.
  if (left !== "" && !beside) {
    lines.push(
      ...(compact
        ? [fitProse(context, left, width)]
        : wrapStyledText(left, width)).map((text) => ({ text })),
    );
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
 * Disclosure rows. Closed disclosures flow along one row while they all
 * fit it, and otherwise stand one per row, so none is left alone on a row
 * beneath the others; an open one takes its own row with its key against
 * the end, followed by its content. The key shown is the field chord while
 * a text field has focus.
 */
function disclosureRows(
  context: PaintContext,
  layerId: string,
  disclosures: readonly ApplicationDisclosure[],
  model: TerminalApplicationLayerModel,
  inField: boolean,
  width: number,
): readonly PanelRow[] {
  const drawn = disclosures.map((disclosure) => {
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
    let segment = `${marker} ${label}${keyed === "" ? "" : `  ${keyed}`}`;
    if (focused) {
      segment = fitLine(context, segment, measureText(segment), "selection");
    }
    /** The disclosure on a row of its own, its key against the end. */
    const own = (): PanelRow => {
      const line = spread(context, `${marker} ${label}`, keyed, width);
      return {
        text: focused ? fitLine(context, line, width, "selection") : line,
        hits: [{ start: 0, end: width, target: controlHit(layerId, control) }],
        control,
      };
    };
    return { disclosure, control, open, segment, own };
  });
  const rows: PanelRow[] = [];
  /** Closed disclosures in a run: one row when they all fit, else one each. */
  const flow = (run: typeof drawn) => {
    if (run.length === 0) return;
    const widths = run.map((entry) => measureText(entry.segment));
    const across = widths.reduce((total, cells) => total + cells, 0) +
      3 * (run.length - 1);
    if (run.length > 1 && across > width) {
      rows.push(...run.map((entry) => entry.own()));
      return;
    }
    const hits: RowHit[] = [];
    let at = 0;
    for (const [index, entry] of run.entries()) {
      hits.push({
        start: at,
        end: at + (widths[index] ?? 0),
        target: controlHit(layerId, entry.control),
      });
      at += (widths[index] ?? 0) + 3;
    }
    rows.push({
      text: run.map((entry) => entry.segment).join("   "),
      hits,
      controls: run.map((entry) => entry.control),
    });
  };
  let run: typeof drawn = [];
  for (const [index, entry] of drawn.entries()) {
    if (!entry.open) {
      run.push(entry);
      continue;
    }
    flow(run);
    run = [];
    rows.push(entry.own());
    rows.push(...detailRows(context, entry.disclosure.content, width));
    // Open content ends with a blank row before the next disclosure.
    if (index < drawn.length - 1) rows.push(BLANK);
  }
  flow(run);
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

/** Whether a row is a blank separator. */
function blankRow(row: PanelRow | undefined): boolean {
  return row !== undefined && typeof row.text === "string" &&
    row.text.trim() === "";
}

/** The choices among rows: what a menu's or palette's markers count. */
function choiceRows(rows: readonly PanelRow[]): number {
  return rows.reduce(
    (total, row) =>
      total + (row.controls?.length ?? (row.control === undefined ? 0 : 1)),
    0,
  );
}

/** Body rows a panel keeps in view before it moves rows into its foot. */
const PINNED_BODY_ROWS = 3;

/**
 * Fit a panel to its box: a frame, the pinned head and foot, and the body
 * scrolled to `requested`, to the control a focus change revealed (an
 * opening disclosure comes to the top), or to the row the panel follows.
 * Blank rows go first when height is short; the body keeps at least one row.
 * While the body overflows, a panel with a `whenOverflowing` alternative
 * composes that instead when its body keeps {@linkcode PINNED_BODY_ROWS}.
 */
function composePanel(
  context: PaintContext,
  layerId: string,
  panel: Panel,
  box: LayerBox,
  requested: number,
  reveal: LayerControl | undefined,
): Fitted {
  const settled = settlePanel(panel, box, requested, reveal);
  const alternative = panel.whenOverflowing;
  if (settled.placed.fitted.overflows && alternative !== undefined) {
    const pinned = settlePanel(alternative, box, requested, reveal);
    const { available, body } = pinned.placed.fitted;
    if (available >= Math.min(PINNED_BODY_ROWS, body.length)) {
      return drawPanel(context, layerId, alternative, box, pinned);
    }
  }
  return drawPanel(context, layerId, panel, box, settled);
}

/** Lay a panel's body out beside its settled foot, before drawing it. */
function settlePanel(
  panel: Panel,
  box: LayerBox,
  requested: number,
  reveal: LayerControl | undefined,
) {
  const width = layerContentWidth(box);
  /**
   * Rows the foot may take while the body keeps three, so a roomier foot
   * never squeezes the consequences it closes to a line or two.
   */
  const footRoom = Math.max(
    0,
    box.height - 2 - panel.head.length -
      Math.max(1, Math.min(PINNED_BODY_ROWS, panel.body.length)),
  );
  // A list of choices counts choices; anything else counts lines of text.
  const count = panel.counts === "choices" ? choiceRows : visibleRows;
  /** The gaps, body, and viewport height left beside a foot of `footRows`. */
  const fit = (footRows: number) => {
    let gapAfterHead = panel.head.length > 0 ? 1 : 0;
    let gapBeforeFoot = footRows > 0 ? 1 : 0;
    const room = () =>
      box.height - 2 - panel.head.length - gapAfterHead - gapBeforeFoot -
      footRows;
    // Blank rows give way before body rows. The title's gap goes when that
    // lets the body fit or the body would keep under three rows — and, in
    // a sheet or form, as soon as the body overflows, since a body that
    // ends at a whole unit gives its spare row back to that gap. The
    // foot's gap goes only when the body would keep under three.
    if (
      room() < panel.body.length &&
      (panel.footOverflow || room() + 1 >= panel.body.length)
    ) gapAfterHead = 0;
    if (room() < Math.min(3, panel.body.length)) gapAfterHead = 0;
    if (room() < Math.min(3, panel.body.length)) gapBeforeFoot = 0;
    const available = Math.max(1, room());
    const body = panel.body;
    const visible = box.stretch
      ? available
      : Math.min(available, Math.max(1, body.length));
    return {
      footRows,
      available: room(),
      gapAfterHead,
      gapBeforeFoot,
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
    /**
     * Where a body of `budget` rows from `first` ends at a whole unit and
     * not on a blank row, freeing no more rows than the foot's gap and the
     * title's gap take back; undefined when no such end exists.
     */
    const wholeEnd = (first: number, budget: number): number | undefined => {
      const floor = Math.max(
        first + 1,
        ...keptRows().map((index) => index + 1),
      );
      const absorbed = 1 +
        (fitted.gapAfterHead === 0 && panel.head.length > 0 ? 1 : 0);
      for (
        let end = Math.min(body.length, first + budget);
        end >= floor && first + budget - end <= absorbed;
        end -= 1
      ) {
        if (body[end]?.continues !== true && !blankRow(body[end - 1])) {
          return end;
        }
      }
      return undefined;
    };
    /** Body rows this frame must keep in view: the revealed and followed controls. */
    const keptRows = () =>
      [reveal, panel.follow].flatMap((control) =>
        control === undefined
          ? []
          : [body.findIndex((row) => holds(row, control))]
      ).filter((index) => index >= 0);
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
    // A section's title keeps with its first row: a viewport that would end
    // on a title while rows stay hidden shows one more row, unless that
    // would hide the row it keeps in view.
    if (overflows && scroll < maxScroll) {
      const now = viewport(scroll);
      const end = now.first + now.rows;
      const kept = keptRows();
      const next = viewport(scroll + 1);
      if (
        body[end - 1]?.heading === true && end < body.length &&
        next.first < end && next.first + next.rows > end &&
        kept.every((index) => index >= next.first)
      ) scroll += 1;
    }
    let at = overflows
      ? viewport(scroll)
      : { up: 0, first: 0, rows: body.length, down: 0 };
    let gapBeforeFoot = fitted.gapBeforeFoot;
    let gapAfterHead = fitted.gapAfterHead;
    // A section title that still ends the viewport takes the title's gap
    // for its first row, rather than give its own row to the marker.
    if (
      overflows && gapAfterHead > 0 && body[at.first + at.rows - 1]?.heading &&
      at.first + at.rows < body.length
    ) {
      at = { ...at, rows: at.rows + 1 };
      gapAfterHead = 0;
    }
    const last = body[at.first + at.rows - 1];
    const ending = overflows && panel.footOverflow &&
        at.first + at.rows < body.length &&
        panel.foot(1, { start: at.first, end: at.first + at.rows }, footRoom)[0]
            ?.attached === true
      ? wholeEnd(at.first, at.rows + gapBeforeFoot)
      : undefined;
    if (ending !== undefined) {
      // The foot's overflow row follows the body directly, so the body ends
      // at a whole unit and never on a blank row while rows stay hidden; it
      // may take the foot's gap for that, and a row it leaves free becomes
      // the gap beneath the overflow row.
      const budget = at.rows + gapBeforeFoot;
      gapBeforeFoot = budget - ending > 0 ? 1 : 0;
      at = { ...at, rows: ending - at.first };
    } else if (
      // A viewport that ends on a blank separator while rows stay hidden
      // takes the foot's gap for one more row, so two blank rows never
      // stand between hidden content and the foot.
      overflows && gapBeforeFoot > 0 && at.down === 0 &&
      at.first + at.rows < body.length && blankRow(last)
    ) {
      at = { ...at, rows: at.rows + 1 };
      gapBeforeFoot = 0;
    }
    const below = Math.max(0, body.length - at.first - at.rows);
    const hidden = count(body.slice(at.first + at.rows));
    const shown = { start: at.first, end: at.first + at.rows };
    const foot = panel.foot(below > 0 ? hidden : 0, shown, footRoom);
    return {
      fitted: {
        ...fitted,
        gapAfterHead,
        gapBeforeFoot,
        visible: fitted.visible + fitted.gapBeforeFoot - gapBeforeFoot +
          fitted.gapAfterHead - gapAfterHead,
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
  let placed = place(panel.foot(0, NOTHING_SHOWN, footRoom).length);
  let tallest = placed.fitted.footRows;
  for (let pass = 0; pass < 4; pass += 1) {
    if (placed.foot.length === placed.fitted.footRows) break;
    tallest = Math.max(tallest, placed.foot.length);
    placed = place(pass < 3 ? placed.foot.length : tallest);
  }
  return { placed, width, count };
}

/** Draw a settled panel: its frame, head, body viewport, markers, and foot. */
function drawPanel(
  context: PaintContext,
  layerId: string,
  panel: Panel,
  box: LayerBox,
  { placed, width, count }: ReturnType<typeof settlePanel>,
): Fitted {
  const pad = LEFT_PADDING;
  const { fitted, scroll, at, hidden, shown } = placed;
  const { body, visible, gapAfterHead, gapBeforeFoot } = fitted;
  const marker = (
    direction: "up" | "down",
    count: number,
    key: "page-up" | "page-down",
  ) => {
    const text = raised(
      context,
      overflowMarker(context, direction, count, key),
      "faint",
    );
    // A marker with nothing countable behind it, such as a section heading
    // alone, holds its row blank rather than claim `0 more`. Where the foot
    // names what is hidden below, at the start, the upper marker matches.
    return {
      text: count === 0
        ? ""
        : panel.footOverflow
        ? text
        : spread(context, "", text, width),
    };
  };
  const slice = body.slice(at.first, at.first + at.rows);
  // A title that still ends the viewport, because showing its first row
  // would hide the row kept in view, gives its row to the lower marker.
  const widowed = at.down > 0 && slice.at(-1)?.heading === true;
  const bodyRows: PanelRow[] = [
    ...(at.up > 0
      ? [marker("up", count(body.slice(0, at.first)), "page-up")]
      : []),
    ...(widowed ? slice.slice(0, -1) : slice),
    ...(at.down > 0
      ? [
        marker(
          "down",
          widowed ? count(body.slice(at.first + at.rows - 1)) : hidden,
          "page-down",
        ),
      ]
      : []),
    ...(widowed ? [BLANK] : []),
  ];
  const foot = [...placed.foot];
  // Only a layout that never settled holds more foot rows than it draws.
  while (foot.length < fitted.footRows) foot.unshift(BLANK);
  // The row that names what the body hides follows its last row; the rows
  // the body leaves free fall beneath it, before the foot's gap.
  const attached = foot[0]?.attached === true ? foot.splice(0, 1) : [];
  let free = Math.max(0, visible - bodyRows.length);
  // A row the body leaves free first restores the title's gap.
  const titleGap = gapAfterHead > 0 ||
    (attached.length > 0 && panel.head.length > 0 && free > 0);
  if (titleGap && gapAfterHead === 0) free -= 1;
  const content: PanelRow[] = [
    ...panel.head,
    ...(titleGap ? [BLANK] : []),
    ...bodyRows,
    ...attached,
    ...Array.from({ length: free }, () => BLANK),
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
  const bodyStart = 1 + panel.head.length + (titleGap ? 1 : 0);
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

/**
 * The foot of a sheet or form: a row naming what the body hides, attached
 * to the body, then `pinned` rows such as a challenge the body would hide,
 * then the buttons with the disabled reason or the footnote, the sheet's
 * closing sentence, beside them or wrapped above them. A foot short of
 * rows packs its buttons and cuts that text to a line, and shorter still
 * names what the body hides beside the buttons in the footnote's place.
 */
function panelFoot<A>(
  context: PaintContext,
  layer: ApplicationSheet<A> | ApplicationForm<A>,
  model: (shown: BodySpan) => TerminalApplicationLayerModel,
  width: number,
  pinned?: readonly PanelRow[],
): Panel["foot"] {
  return (hidden, shown, room) => {
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
    const marker = hidden > 0
      ? raised(
        context,
        variants.find((variant) => measureText(variant) <= width) ??
          variants.at(-1) ?? "",
        "faint",
      )
      : "";
    const overflow: readonly PanelRow[] = marker === ""
      ? []
      : [{ text: fitProse(context, marker, width), attached: true }];
    const left = reason !== undefined
      ? raised(context, reason, "muted")
      : styleRuns(context, layer.footnote, RAISED, "faint");
    const before = pinned === undefined ? [] : [...pinned, BLANK];
    const feet: readonly (() => readonly PanelRow[])[] = buttonRowShown(layer)
      ? [
        () => [
          ...overflow,
          ...before,
          ...buttonRows(context, layer, fitted, left, width),
        ],
        () => [
          ...overflow,
          ...before,
          ...buttonRows(context, layer, fitted, left, width, true),
        ],
        () => [
          ...before,
          ...buttonRows(
            context,
            layer,
            fitted,
            marker === "" ? left : marker,
            width,
            true,
          ),
        ],
      ]
      : [
        () => [
          ...overflow,
          ...(left === ""
            ? []
            : wrapStyledText(left, width).map((text) => ({ text }))),
        ],
        () => [
          ...overflow,
          ...(left === "" ? [] : [{ text: fitProse(context, left, width) }]),
        ],
        () =>
          marker === "" && left === "" ? [] : [{
            text: fitProse(context, marker === "" ? left : marker, width),
          }],
      ];
    let foot: readonly PanelRow[] = [];
    for (const make of feet) {
      foot = make();
      if (foot.length <= room) break;
    }
    return foot;
  };
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
    ...wrapRuns(context, challenge.label, width, "ink").map((text, index) =>
      index === 0 ? { text } : { text, continues: true }
    ),
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
      } ${
        raised(context, clip(context, sheet.busy, width - 2, "word"), "muted")
      }`,
    });
  }
  const body: PanelRow[] = [];
  let read = 0;
  if (activity !== undefined) {
    body.push(...activityRows(context, activity, width, now));
  } else {
    const lines = detailRows(context, sheet.body, width);
    body.push(...lines);
    read = lines.length;
  }
  const challenge = sheetChallengeShown(sheet)
    ? challengeRows(context, sheet, model, width)
    : [];
  const disclosures = sheet.disclosures ?? [];
  const after: PanelRow[] = disclosures.length === 0 ? [] : [
    BLANK,
    ...disclosureRows(
      context,
      sheet.id,
      disclosures,
      model,
      isTextControl(sheet, model.focus),
      width,
    ),
  ];
  const progress = (shown: BodySpan) =>
    top ? readProgress(sheet, model, read, shown) : model;
  const panel: Panel = {
    head,
    body: [
      ...body,
      ...(challenge.length === 0 ? [] : [BLANK, ...challenge]),
      ...after,
    ],
    read,
    footOverflow: true,
    foot: panelFoot(context, sheet, progress, width),
  };
  return {
    read,
    panel: challenge.length === 0 ? panel : {
      ...panel,
      // While the consequences overflow, the challenge pins above the
      // buttons: they still read first, and typed text lands in sight.
      whenOverflowing: {
        ...panel,
        body: [...body, ...after],
        foot: panelFoot(context, sheet, progress, width, challenge),
      },
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
      ...detailRows(context, form.preview, width),
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
  return {
    head,
    body,
    read: 0,
    footOverflow: true,
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
    ? `  ${
      ink(context, item.reason ?? item.sentence, { tone: "faint" }, surface)
    }`
    : "";
  const text = fitProse(
    context,
    `${
      ink(context, terminalGlyph("unavailable", context.capabilities), {
        tone: "faint",
      }, surface)
    } ${
      ink(context, item.label, { tone: "muted", bold: highlighted }, surface)
    }${reason}`,
    width,
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
    const lines: { text: string; control?: LayerControl; heading?: true }[] =
      [];
    for (const [index, entry] of sections.entries()) {
      if (index > 0) lines.push({ text: "" });
      lines.push({
        text: raised(
          context,
          clip(context, entry.section.title, columnWidth),
          entry.section.tone ?? "faint",
        ),
        heading: true,
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
    // A row is a title only where every column it spans shows one.
    const heading = [left, right].every((cell) =>
      cell === undefined || cell.heading === true || cell.text === ""
    ) && (left?.heading === true || right?.heading === true);
    body.push({
      text,
      hits,
      bar: left?.control !== undefined && model.focus === left.control,
      ...(control === undefined ? {} : { control }),
      ...(heading ? { heading } : {}),
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
  // Two lines at most; a longer one ends at a whole word.
  const describe = (
    label: string,
    runs: readonly ApplicationRun[] | undefined,
  ) => {
    const lines = wrapRuns(
      context,
      [
        ...(label === "" ? [] : [{ text: label, role: "title" as const }]),
        ...(runs === undefined
          ? []
          : [...(label === "" ? [] : [{ text: "  " }]), ...runs]),
      ],
      width,
      "muted",
    );
    return lines.length <= 2 ? lines : [
      lines[0] ?? "",
      fitProse(context, lines.slice(1).join(" "), width),
    ];
  };
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
    foot: (hidden) => {
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
      // While choices hide below, rows a shorter description leaves go to
      // them; otherwise they stand above it, so the panel keeps its height
      // as the highlight moves and never ends on empty rows.
      const padded: PanelRow[] = lines.map((text) => ({ text }));
      if (hidden === 0) {
        while (padded.length < reserved) padded.unshift(BLANK);
      }
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
      body.push({ text: raised(context, row.title, "faint"), heading: true });
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
 * A painted layer extended to `rows` by blank rows inside its frame, above
 * its lower edge, so it takes rows beneath it that would otherwise stand
 * empty; the rows it adds still keep clicks from what lies beneath.
 */
export function extendLayer(
  context: PaintContext,
  paint: LayerPaint,
  layerId: string,
  width: number,
  rows: number,
): LayerPaint {
  const extra = rows - paint.lines.length;
  if (extra <= 0 || paint.lines.length < 2) return paint;
  const glyphs = terminalFrameGlyphs("rounded", context.capabilities.unicode);
  const edge = ink(context, glyphs.vertical, { tone: "faint" });
  const blank = context.painted
    ? fitLine(context, "", width, RAISED)
    : `${edge}${fitLine(context, "", width - 2, RAISED)}${edge}`;
  const last = paint.lines.length - 1;
  return {
    ...paint,
    lines: [
      ...paint.lines.slice(0, last),
      ...Array.from({ length: extra }, () => blank),
      ...paint.lines.slice(last),
    ],
    hits: [
      ...paint.hits.map((hit) =>
        hit.row >= last ? { ...hit, row: hit.row + extra } : hit
      ),
      ...Array.from({ length: extra }, (_, index) => ({
        row: last + index,
        start: 0,
        end: width,
        target: { kind: "layer" as const, layerId },
      })),
    ],
  };
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
