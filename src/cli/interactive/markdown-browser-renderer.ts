/** Pure adaptive renderer for the link-aware Markdown browser. */

import { stripAnsi, styleText } from "../ansi.ts";
import { renderBox } from "../box.ts";
import type { TerminalCapabilities } from "../capabilities.ts";
import type {
  InteractiveChoiceEntryState,
  InteractiveChoiceGroupHeadingState,
  InteractiveChoiceState,
} from "../interactive-states.ts";
import { renderMotifSectionRule } from "../motifs.ts";
import { styleSemanticText } from "../narration.ts";
import { projectTerminalCellRows } from "../projection.ts";
import { mapStyledHyperlinks } from "../styled-sequences.ts";
import {
  measureText,
  padText,
  truncateStyledText,
  truncateText,
} from "../text.ts";
import {
  terminalThemeColor,
  terminalThemes,
  terminalToneColor,
} from "../theme.ts";
import { renderMarkdownCliProjection } from "../../components/editorial/markdown/markdown.cli.ts";
import {
  insertFormCliCursor,
  renderFormCliChoiceEntry,
  styleFormCliSelectedMark,
} from "../../components/forms/form-frame.ts";
import {
  isMarkdownBrowserDocument,
  isMarkdownBrowserSelectable,
  type MarkdownBrowserEntry,
  markdownBrowserEntry,
  type MarkdownBrowserLinkOccurrence,
  type MarkdownBrowserState,
  updateMarkdownBrowserState,
} from "./markdown-browser-model.ts";

interface RenderedPickerEntry<Action> {
  readonly entry: MarkdownBrowserEntry<Action>;
  readonly sourceIndex: number;
  readonly lines: readonly string[];
}

/** Row-fitted picker facts shared by rendering and keyboard paging. */
export interface MarkdownBrowserPickerWindow<Action> {
  readonly start: number;
  readonly entries: readonly RenderedPickerEntry<Action>[];
  readonly hiddenBefore: number;
  readonly hiddenAfter: number;
  readonly selectableCount: number;
}

/** Semantic pane or entry under one terminal-cell pointer coordinate. */
export type MarkdownBrowserPointerTarget =
  | {
    readonly kind: "picker";
    readonly entryId?: string;
    readonly selectable: boolean;
  }
  | { readonly kind: "document"; readonly linkId?: string };

function lineCount(value: string): number {
  return value === "" ? 0 : value.split("\n").length;
}

function fitStyledLine(
  value: string,
  columns: number,
  capabilities: TerminalCapabilities,
): string {
  const fitted = measureText(value) <= columns
    ? value
    : truncateStyledText(value, columns, capabilities.unicode ? "…" : ".");
  return padText(fitted, columns);
}

function limitStyledLines(
  source: readonly string[],
  maximum: number,
  columns: number,
  capabilities: TerminalCapabilities,
): readonly string[] {
  if (source.length <= maximum) {
    return source.map((line) => fitStyledLine(line, columns, capabilities));
  }
  if (maximum < 1) return [];
  const kept = source.slice(0, maximum);
  const last = kept[maximum - 1] ?? "";
  kept[maximum - 1] = truncateStyledText(
    `${last}${capabilities.unicode ? " …" : " .."}`,
    columns,
    capabilities.unicode ? "…" : ".",
  );
  return kept.map((line) => fitStyledLine(line, columns, capabilities));
}

function pickerDescription<Action>(
  entry: MarkdownBrowserEntry<Action>,
): string | undefined {
  if (entry.kind !== "document") return entry.description;
  return entry.description === undefined
    ? entry.path
    : `${entry.description} · ${entry.path}`;
}

function pickerEntryState<Action>(
  entry: MarkdownBrowserEntry<Action>,
): InteractiveChoiceEntryState {
  if (entry.kind === "group-heading") {
    return {
      kind: "group-heading",
      id: entry.id,
      label: entry.label,
      ...(entry.description === undefined
        ? {}
        : { description: entry.description }),
    } satisfies InteractiveChoiceGroupHeadingState;
  }
  const description = pickerDescription(entry);
  return {
    kind: "choice",
    id: entry.id,
    label: entry.label,
    ...(description === undefined ? {} : { description }),
  } satisfies InteractiveChoiceState;
}

function markerFor<Action>(
  entry: MarkdownBrowserEntry<Action>,
  opened: boolean,
  state: MarkdownBrowserState<Action>,
  capabilities: TerminalCapabilities,
): string {
  if (entry.kind === "group-heading") return "";
  const glyph = capabilities.unicode
    ? entry.kind === "document"
      ? opened ? "●" : "○"
      : entry.kind === "action"
      ? "↗"
      : "×"
    : entry.kind === "document"
    ? opened ? "*" : "o"
    : entry.kind === "action"
    ? ">"
    : "x";
  return styleFormCliSelectedMark(
    glyph,
    opened,
    { theme: state.theme },
    capabilities,
  );
}

function renderPickerEntry<Action>(
  entry: MarkdownBrowserEntry<Action>,
  highlighted: boolean,
  maximumRows: number,
  state: MarkdownBrowserState<Action>,
  capabilities: TerminalCapabilities,
): readonly string[] {
  const opened = entry.kind === "document" &&
    entry.id === state.openedDocumentId;
  const rendered = renderFormCliChoiceEntry({
    entry: pickerEntryState(entry),
    pointer: highlighted ? capabilities.unicode ? "› " : "> " : "  ",
    marker: markerFor(entry, opened, state, capabilities),
    highlighted,
    theme: state.theme,
    motif: state.motif,
    width: state.columns,
  }, capabilities).split("\n");
  // Group headings keep the form renderer's composition blank so each main
  // section divider has breathing room. If only that blank would fit, defer
  // the complete group rather than painting an orphaned empty row.
  if (
    entry.kind === "group-heading" && rendered[0] === "" && maximumRows < 2
  ) {
    return [];
  }
  return limitStyledLines(
    rendered,
    Math.max(1, Math.min(maximumRows, 3)),
    state.columns - 2,
    capabilities,
  );
}

function governingHeadingIndex<Action>(
  entries: readonly MarkdownBrowserEntry<Action>[],
  start: number,
): number | undefined {
  if (start <= 0 || entries[start]?.kind === "group-heading") return undefined;
  for (let index = start - 1; index >= 0; index -= 1) {
    if (entries[index]?.kind === "group-heading") return index;
  }
  return undefined;
}

function countSelectable<Action>(
  entries: readonly MarkdownBrowserEntry<Action>[],
): number {
  return entries.filter(isMarkdownBrowserSelectable).length;
}

function pickerWindowFrom<Action>(
  state: MarkdownBrowserState<Action>,
  capabilities: TerminalCapabilities,
  requestedStart: number,
  rowBudget: number,
): MarkdownBrowserPickerWindow<Action> {
  const entries = state.filteredEntries;
  if (entries.length === 0 || rowBudget < 1) {
    return {
      start: 0,
      entries: [],
      hiddenBefore: 0,
      hiddenAfter: 0,
      selectableCount: 0,
    };
  }
  const start = Math.min(Math.max(0, requestedStart), entries.length - 1);
  const indices: number[] = [];
  const sticky = governingHeadingIndex(entries, start);
  if (sticky !== undefined) indices.push(sticky);
  for (let index = start; index < entries.length; index += 1) {
    indices.push(index);
  }

  const rendered: RenderedPickerEntry<Action>[] = [];
  let remaining = rowBudget;
  let lastSourceIndex = start - 1;
  for (const sourceIndex of indices) {
    if (remaining < 1) break;
    const entry = entries[sourceIndex];
    if (entry === undefined) continue;
    const lines = renderPickerEntry(
      entry,
      entry.id === state.highlightedId,
      remaining,
      state,
      capabilities,
    );
    if (lines.length === 0 || lines.length > remaining) break;
    rendered.push({ entry, sourceIndex, lines });
    remaining -= lines.length;
    if (sourceIndex >= start) lastSourceIndex = sourceIndex;
  }
  return {
    start,
    entries: rendered,
    hiddenBefore: countSelectable(entries.slice(0, start)),
    hiddenAfter: countSelectable(entries.slice(lastSourceIndex + 1)),
    selectableCount:
      rendered.filter(({ entry }) => isMarkdownBrowserSelectable(entry)).length,
  };
}

/**
 * Resolve the row-fitted picker window, retaining the governing heading and
 * advancing the raw start only as far as needed to keep the stable highlight
 * visible.
 */
export function markdownBrowserPickerWindow<Action>(
  state: MarkdownBrowserState<Action>,
  capabilities: TerminalCapabilities,
): MarkdownBrowserPickerWindow<Action> {
  const rowBudget = Math.max(1, state.layout.pickerRows - 3);
  const highlightedIndex = state.filteredEntries.findIndex((entry) =>
    isMarkdownBrowserSelectable(entry) && entry.id === state.highlightedId
  );
  let start =
    highlightedIndex >= 0 && highlightedIndex < state.pickerVisibleStart
      ? highlightedIndex
      : state.pickerVisibleStart;
  let window = pickerWindowFrom(state, capabilities, start, rowBudget);
  while (
    highlightedIndex >= 0 &&
    !window.entries.some(({ sourceIndex }) =>
      sourceIndex === highlightedIndex
    ) &&
    start < highlightedIndex
  ) {
    start += 1;
    window = pickerWindowFrom(state, capabilities, start, rowBudget);
  }
  return window;
}

function pickerQueryLine<Action>(
  state: MarkdownBrowserState<Action>,
  capabilities: TerminalCapabilities,
): string {
  const prefix = styleSemanticText("Search: ", {
    role: "strong",
    theme: state.theme,
  }, capabilities);
  const empty = state.query === "";
  const source = empty ? state.placeholder : state.query;
  const visible = state.focusedPane === "picker"
    ? insertFormCliCursor(source, state.queryCursor, capabilities)
    : source;
  const query = empty
    ? styleSemanticText(visible, {
      role: "annotation",
      theme: state.theme,
    }, capabilities)
    : visible;
  return fitStyledLine(`${prefix}${query}`, state.columns - 2, capabilities);
}

function overflowLabel(
  before: number,
  after: number,
  capabilities: TerminalCapabilities,
): string {
  const labels = [
    before > 0 ? `${capabilities.unicode ? "↑" : "^"} ${before}` : "",
    after > 0 ? `${capabilities.unicode ? "↓" : "v"} ${after}` : "",
  ].filter((label) => label !== "");
  return labels.join(capabilities.unicode ? " · " : " | ");
}

function paneTitle(
  label: string,
  focused: boolean,
  capabilities: TerminalCapabilities,
): string {
  return focused ? `${capabilities.unicode ? "▶" : ">"} ${label}` : label;
}

function paneBorder<Action>(
  state: MarkdownBrowserState<Action>,
  focused: boolean,
) {
  const theme = terminalThemes[state.theme];
  return {
    color: focused
      ? terminalToneColor(theme, "accent")
      : terminalThemeColor(theme, "--discern-color-border-strong"),
  } as const;
}

function renderPickerPane<Action>(
  state: MarkdownBrowserState<Action>,
  capabilities: TerminalCapabilities,
): string {
  const window = markdownBrowserPickerWindow(state, capabilities);
  const bodyRows = state.layout.pickerRows - 2;
  const entryRows = window.entries.flatMap(({ lines }) => lines);
  const empty = state.filteredEntries.some(isMarkdownBrowserSelectable)
    ? []
    : [fitStyledLine(
      styleSemanticText(
        state.feedback?.kind === "no-matches"
          ? state.feedback.message
          : "No matches.",
        {
          role: "annotation",
          theme: state.theme,
        },
        capabilities,
      ),
      state.columns - 2,
      capabilities,
    )];
  const body = [pickerQueryLine(state, capabilities), ...entryRows, ...empty];
  while (body.length < bodyRows) body.push(" ".repeat(state.columns - 2));
  const theme = terminalThemes[state.theme];
  return renderBox({
    body: body.slice(0, bodyRows).join("\n"),
    title: paneTitle("Picker", state.focusedPane === "picker", capabilities),
    width: state.columns,
    padding: 0,
    borderStyle: paneBorder(state, state.focusedPane === "picker"),
    ...(window.hiddenBefore === 0 && window.hiddenAfter === 0 ? {} : {
      bottomLabel: overflowLabel(
        window.hiddenBefore,
        window.hiddenAfter,
        capabilities,
      ),
      bottomLabelStyle: {
        ...theme.typography.annotation,
        color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      },
    }),
  }, capabilities);
}

/** Visible document content rows inside the current pane border. */
export function markdownBrowserDocumentVisibleRows<Action>(
  state: MarkdownBrowserState<Action>,
): number {
  return Math.max(1, state.layout.documentRows - 2);
}

interface MarkdownBrowserProjectedHeading {
  readonly id: string;
  /** Zero-based rendered document row. */
  readonly row: number;
}

interface MarkdownBrowserDocumentProjection {
  readonly lines: readonly string[];
  readonly links: readonly MarkdownBrowserLinkOccurrence[];
  readonly headings: readonly MarkdownBrowserProjectedHeading[];
}

function logicalLinkId(documentId: string, localId: string): string {
  return `${documentId}:${localId}`;
}

function supportsHyperlinks(capabilities: TerminalCapabilities): boolean {
  return capabilities.hyperlinks ?? capabilities.colorDepth !== "none";
}

/**
 * Render one opened Markdown document and derive logical links plus cell hit
 * regions from the same package-styled projection. Synthetic identities are
 * removed or remapped before `lines` can reach the terminal.
 */
function markdownBrowserDocumentProjection<Action>(
  state: MarkdownBrowserState<Action>,
  capabilities: TerminalCapabilities,
): MarkdownBrowserDocumentProjection {
  const entry = markdownBrowserEntry(state, state.openedDocumentId);
  if (entry === undefined || !isMarkdownBrowserDocument(entry)) {
    return { lines: [], links: [], headings: [] };
  }
  const innerWidth = state.columns - 2;
  const measure = Math.min(state.documentMeasure, innerWidth);
  const documentCapabilities = {
    ...capabilities,
    columns: measure,
  };
  const localFocus = state.linkFocus?.id.startsWith(`${entry.id}:`) === true
    ? state.linkFocus.id.slice(entry.id.length + 1)
    : undefined;
  const projected = renderMarkdownCliProjection(
    {
      source: entry.source,
      theme: state.theme,
      motif: state.motif,
      maxWidth: measure,
    },
    documentCapabilities,
    {
      ...(localFocus === undefined ? {} : { focusedLinkId: localFocus }),
      ...(state.linkFocus?.origin === undefined
        ? {}
        : { focusOrigin: state.linkFocus.origin }),
    },
  );
  const linkByTarget = new Map(
    projected.links.map((link) => [link.projectionTarget, link] as const),
  );
  const headingTargets = new Set(
    projected.headings.map((heading) => heading.projectionTarget),
  );
  const rendered = mapStyledHyperlinks(projected.output, (target) => {
    const link = linkByTarget.get(target);
    if (link !== undefined) {
      return supportsHyperlinks(capabilities) ? link.destination : undefined;
    }
    if (headingTargets.has(target)) return undefined;
    return supportsHyperlinks(capabilities) ? target : undefined;
  });
  const sourceLines = rendered === ""
    ? [styleSemanticText("Empty document.", {
      role: "annotation",
      theme: state.theme,
    }, documentCapabilities)]
    : rendered.split("\n");
  const indent = " ".repeat(Math.floor((innerWidth - measure) / 2));
  const lines = Object.freeze(sourceLines.map((line) => {
    const value = `${indent}${line}`;
    if (measureText(value) > innerWidth) {
      throw new TypeError(
        `Markdown browser document row exceeds its ${innerWidth}-cell pane`,
      );
    }
    return value;
  }));
  const cellRows = projectTerminalCellRows(projected.output);
  const visibleRows = state.layout.documentRows === 0
    ? 0
    : markdownBrowserDocumentVisibleRows(state);
  const viewportStart = state.documentScrollOffset;
  const viewportEnd = viewportStart + visibleRows;
  const links = Object.freeze(projected.links.map((link) => {
    const rowRanges = new Map<
      number,
      { readonly start: number; readonly end: number }
    >();
    for (const row of cellRows) {
      for (
        const span of row.spans.filter((span) =>
          span.link === link.projectionTarget
        )
      ) {
        const prior = rowRanges.get(row.row);
        rowRanges.set(row.row, {
          start: Math.min(prior?.start ?? span.startColumn, span.startColumn),
          end: Math.max(prior?.end ?? span.endColumn, span.endColumn),
        });
      }
    }
    const ranges = [...rowRanges.entries()].sort(([left], [right]) =>
      left - right
    );
    const firstRow = (ranges[0]?.[0] ?? 1) - 1;
    const lastRow = (ranges.at(-1)?.[0] ?? 1) - 1;
    const regions = Object.freeze(ranges.flatMap(([row, range]) => {
      const documentRow = row - 1;
      return documentRow < viewportStart || documentRow >= viewportEnd ? [] : [{
        row: documentRow - viewportStart + 1,
        startColumn: indent.length + range.start,
        endColumn: indent.length + range.end,
      }];
    }));
    const id = logicalLinkId(entry.id, link.id);
    return Object.freeze({
      id,
      destination: link.destination,
      sourceDocumentId: entry.id,
      sourcePath: entry.path,
      documentStartRow: firstRow + 1,
      documentEndRow: lastRow + 1,
      regions,
      visibility: visibleRows > 0 && lastRow >= viewportStart &&
          firstRow < viewportEnd
        ? "visible" as const
        : lastRow < viewportStart
        ? "above" as const
        : "below" as const,
      focused: state.linkFocus?.id === id,
    });
  }));
  const headings = Object.freeze(projected.headings.flatMap((heading) => {
    const row = cellRows.find((candidate) =>
      candidate.spans.some((span) => span.link === heading.projectionTarget)
    );
    return row === undefined ? [] : [{ id: heading.id, row: row.row - 1 }];
  }));
  return Object.freeze({ lines, links, headings });
}

/** Render the opened document into independently valid styled rows. */
export function markdownBrowserDocumentLines<Action>(
  state: MarkdownBrowserState<Action>,
  capabilities: TerminalCapabilities,
): readonly string[] {
  return markdownBrowserDocumentProjection(state, capabilities).lines;
}

/** Logical link occurrences and visible cell regions for the open document. */
export function markdownBrowserLinkOccurrences<Action>(
  state: MarkdownBrowserState<Action>,
  capabilities: TerminalCapabilities,
): readonly MarkdownBrowserLinkOccurrence[] {
  return markdownBrowserDocumentProjection(state, capabilities).links;
}

function paneTopRows<Action>(state: MarkdownBrowserState<Action>): {
  readonly picker?: number;
  readonly document?: number;
} {
  if (state.layout.mode === "split") {
    return { picker: 2, document: 2 + state.layout.pickerRows };
  }
  return state.layout.mode === "picker-only" ? { picker: 2 } : { document: 2 };
}

/**
 * Resolve a one-based terminal-cell coordinate against browser pane interiors.
 * Borders, the heading, and footer hints deliberately return `undefined`.
 */
export function markdownBrowserPointerTarget<Action>(
  state: MarkdownBrowserState<Action>,
  capabilities: TerminalCapabilities,
  column: number,
  row: number,
): MarkdownBrowserPointerTarget | undefined {
  if (
    !Number.isSafeInteger(column) || !Number.isSafeInteger(row) ||
    column <= 1 || column >= state.columns
  ) {
    return undefined;
  }
  const tops = paneTopRows(state);
  const pickerTop = tops.picker;
  if (
    pickerTop !== undefined && row > pickerTop &&
    row < pickerTop + state.layout.pickerRows - 1
  ) {
    let entryRow = pickerTop + 2;
    for (
      const rendered of markdownBrowserPickerWindow(state, capabilities).entries
    ) {
      const end = entryRow + rendered.lines.length - 1;
      if (row >= entryRow && row <= end) {
        return {
          kind: "picker",
          entryId: rendered.entry.id,
          selectable: isMarkdownBrowserSelectable(rendered.entry),
        };
      }
      entryRow = end + 1;
    }
    return { kind: "picker", selectable: false };
  }
  const documentTop = tops.document;
  if (
    documentTop !== undefined && row > documentTop &&
    row < documentTop + state.layout.documentRows - 1
  ) {
    const paneRow = row - documentTop;
    const paneColumn = column - 1;
    const link = markdownBrowserLinkOccurrences(state, capabilities).find(
      (occurrence) =>
        occurrence.regions.some((region) =>
          region.row === paneRow && paneColumn >= region.startColumn &&
          paneColumn <= region.endColumn
        ),
    );
    return {
      kind: "document",
      ...(link === undefined ? {} : { linkId: link.id }),
    };
  }
  return undefined;
}

function fragmentId(fragment: string): string | undefined {
  const value = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  if (value === "") return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

/** Resolve a Markdown heading fragment to its zero-based rendered row. */
export function markdownBrowserDocumentFragmentOffset<Action>(
  state: MarkdownBrowserState<Action>,
  capabilities: TerminalCapabilities,
  fragment: string,
): number | undefined {
  const id = fragmentId(fragment);
  return id === undefined
    ? undefined
    : markdownBrowserDocumentProjection(state, capabilities).headings.find(
      (heading) => heading.id === id,
    )?.row;
}

/** Maximum valid top row for the currently opened document. */
export function markdownBrowserDocumentMaximumOffset<Action>(
  state: MarkdownBrowserState<Action>,
  capabilities: TerminalCapabilities,
): number {
  return Math.max(
    0,
    markdownBrowserDocumentLines(state, capabilities).length -
      markdownBrowserDocumentVisibleRows(state),
  );
}

function normalizedAnchor(value: string): string {
  return stripAnsi(value).trim().replace(/\s+/gu, " ");
}

/** Stable visible-text anchor at or immediately after one document offset. */
export function markdownBrowserDocumentAnchor(
  lines: readonly string[],
  offset: number,
): string | undefined {
  for (let index = Math.max(0, offset); index < lines.length; index += 1) {
    const anchor = normalizedAnchor(lines[index] ?? "");
    if (anchor !== "") return truncateText(anchor, 80, "");
  }
  return undefined;
}

/** Locate the nearest rewrapped row matching a prior visible-text anchor. */
export function markdownBrowserOffsetForAnchor(
  lines: readonly string[],
  anchor: string | undefined,
  fallback: number,
): number {
  const safeFallback = Math.max(0, fallback);
  if (anchor === undefined) return safeFallback;
  const wanted = normalizedAnchor(anchor);
  if (wanted === "") return safeFallback;
  let best: { readonly index: number; readonly score: number } | undefined;
  const words = wanted.split(" ").filter((word) => word !== "").slice(0, 4);
  for (const [index, line] of lines.entries()) {
    const candidate = normalizedAnchor(line);
    if (candidate === "") continue;
    if (
      candidate.includes(wanted) || candidate.startsWith(wanted) ||
      (wanted.startsWith(candidate) && candidate.split(" ").length >= 2)
    ) {
      if (
        best === undefined || best.score < words.length + 1 ||
        Math.abs(index - safeFallback) <
          Math.abs(best.index - safeFallback)
      ) {
        best = { index, score: words.length + 1 };
      }
      continue;
    }
    const score = words.filter((word) => candidate.includes(word)).length;
    if (
      score > (best?.score ?? 0) ||
      (score === best?.score &&
        Math.abs(index - safeFallback) <
          Math.abs(best.index - safeFallback))
    ) {
      best = { index, score };
    }
  }
  return best !== undefined &&
      (best.score > words.length ||
        best.score >= Math.min(2, words.length))
    ? best.index
    : safeFallback;
}

function renderDocumentPane<Action>(
  state: MarkdownBrowserState<Action>,
  capabilities: TerminalCapabilities,
): string {
  const entry = markdownBrowserEntry(state, state.openedDocumentId);
  if (entry === undefined || !isMarkdownBrowserDocument(entry)) {
    throw new TypeError("Markdown browser document pane has no open document");
  }
  const lines = markdownBrowserDocumentLines(state, capabilities);
  const bodyRows = markdownBrowserDocumentVisibleRows(state);
  const maximum = Math.max(0, lines.length - bodyRows);
  const offset = Math.min(state.documentScrollOffset, maximum);
  const visible = lines.slice(offset, offset + bodyRows).map((line) =>
    fitStyledLine(line, state.columns - 2, capabilities)
  );
  while (visible.length < bodyRows) {
    visible.push(" ".repeat(state.columns - 2));
  }
  const end = Math.min(lines.length, offset + bodyRows);
  const position = lines.length === 0
    ? "Empty"
    : `${offset + 1}-${end}/${lines.length}`;
  const theme = terminalThemes[state.theme];
  return renderBox({
    body: visible.join("\n"),
    title: paneTitle(
      `Document · ${entry.label}`,
      state.focusedPane === "document",
      capabilities,
    ),
    width: state.columns,
    padding: 0,
    borderStyle: paneBorder(state, state.focusedPane === "document"),
    bottomLabel: position,
    bottomLabelStyle: {
      ...theme.typography.annotation,
      color: terminalThemeColor(theme, "--discern-color-ink-muted"),
    },
  }, capabilities);
}

function footerText<Action>(
  state: MarkdownBrowserState<Action>,
  capabilities: TerminalCapabilities,
): readonly [string, string] {
  const arrows = capabilities.unicode ? "↑↓" : "Up/Down";
  if (state.focusedPane === "document") {
    if (state.feedback !== undefined) {
      return [
        truncateText(
          state.feedback.message,
          state.columns,
          capabilities.unicode ? "…" : ".",
        ),
        state.linkFocus === undefined
          ? "[/] links  Tab picker  Esc/q close"
          : "[/] links  Enter  Esc  Tab picker",
      ];
    }
    if (state.linkFocus !== undefined) {
      return [
        `${arrows}/Pg  [/] links  Tab picker`,
        "Enter follow  Esc return to scroll",
      ];
    }
    return [
      `${arrows}/Pg scroll  Home/End`,
      "Tab picker  Esc/q close",
    ];
  }
  if (state.openedDocumentId === undefined) {
    return [
      `Type search  ${arrows}/Pg move`,
      "Enter open/action  Esc cancel",
    ];
  }
  return [
    `Type search  ${arrows}/Pg move`,
    "Enter open/action  Tab document",
  ];
}

/**
 * Normalize offsets and picker window after construction, transitions, or a
 * resize. This remains pure and returns the original immutable value when no
 * derived fact changes.
 */
export function fitMarkdownBrowserState<Action>(
  state: MarkdownBrowserState<Action>,
  capabilities: TerminalCapabilities,
): MarkdownBrowserState<Action> {
  const window = state.layout.pickerRows === 0
    ? undefined
    : markdownBrowserPickerWindow(state, capabilities);
  const lines = state.openedDocumentId === undefined
    ? []
    : markdownBrowserDocumentLines(state, capabilities);
  const maximum = state.layout.documentRows === 0
    ? Math.max(0, lines.length - 1)
    : Math.max(0, lines.length - markdownBrowserDocumentVisibleRows(state));
  const anchored = state.documentAnchorPending === true
    ? markdownBrowserOffsetForAnchor(
      lines,
      state.documentAnchor,
      state.documentScrollOffset,
    )
    : Math.max(0, state.documentScrollOffset);
  const offset = Math.min(anchored, maximum);
  const anchor = markdownBrowserDocumentAnchor(lines, offset);
  if (
    (window?.start ?? state.pickerVisibleStart) === state.pickerVisibleStart &&
    offset === state.documentScrollOffset &&
    anchor === state.documentAnchor &&
    state.documentAnchorPending !== true
  ) {
    return state;
  }
  return updateMarkdownBrowserState(state, {
    pickerVisibleStart: window?.start ?? state.pickerVisibleStart,
    documentScrollOffset: offset,
    ...(anchor === undefined
      ? { documentAnchor: null }
      : { documentAnchor: anchor }),
    documentAnchorPending: false,
  });
}

/** Render one complete viewport-sized Markdown browser frame. */
export function renderMarkdownBrowser<Action>(
  source: MarkdownBrowserState<Action>,
  capabilities: TerminalCapabilities,
): string {
  if (capabilities.columns !== source.columns) {
    throw new TypeError(
      `Markdown browser state width ${source.columns} does not match terminal capabilities ${capabilities.columns}`,
    );
  }
  const state = fitMarkdownBrowserState(source, capabilities);
  const header = renderMotifSectionRule(state.label, {
    width: state.columns,
    theme: state.theme,
    motif: state.motif,
  }, capabilities);
  if (lineCount(header) !== 1) {
    throw new TypeError("Markdown browser heading must render as one row");
  }
  const panes = state.layout.mode === "split"
    ? [
      renderPickerPane(state, capabilities),
      renderDocumentPane(state, capabilities),
    ]
    : state.layout.mode === "picker-only"
    ? [renderPickerPane(state, capabilities)]
    : [renderDocumentPane(state, capabilities)];
  const footer = footerText(state, capabilities).map((line) =>
    fitStyledLine(
      styleText(line, {
        ...terminalThemes[state.theme].typography.annotation,
        color: terminalThemeColor(
          terminalThemes[state.theme],
          "--discern-color-ink-muted",
        ),
      }, capabilities),
      state.columns,
      capabilities,
    )
  );
  const frame = [header, ...panes, ...footer].join("\n");
  const lines = frame.split("\n");
  if (lines.length !== state.rows) {
    throw new TypeError(
      `Markdown browser rendered ${lines.length} rows into a ${state.rows}-row viewport`,
    );
  }
  return lines.map((line) => {
    if (measureText(line) > state.columns) {
      throw new TypeError(
        `Markdown browser row exceeds its ${state.columns}-cell viewport`,
      );
    }
    return padText(line, state.columns);
  }).join("\n");
}
