/**
 * Immutable data and geometry model for the link-aware Markdown browser.
 *
 * The model is process-free: callers supply corpus data, presentation facts,
 * and terminal geometry. Rendering and terminal effects live in separate
 * modules.
 *
 * @module
 */

import type { CliPresentationOptions } from "../contracts.ts";
import {
  DISCERN_TERMINAL_MOTIF,
  type TerminalMotif,
  terminalMotifRepertoire,
} from "../motif.ts";
import type { TerminalThemeVariant } from "../theme.ts";
import {
  assertChoices,
  filterInteractionEntries,
  isInteractionChoice,
  isInteractionGroupHeading,
} from "./choice-navigation.ts";
import { segmentGraphemes } from "./editor.ts";
import type { InteractionEntry } from "./types.ts";
import {
  parseMarkdown,
  validateMarkdownChartResources,
  validateMarkdownDiagramResources,
} from "../../components/editorial/markdown/markdown.model.ts";
import type { MarkdownChartResource } from "../../chart/markdown.ts";
import type { MarkdownDiagramResource } from "../../diagram/markdown.ts";

/** Smallest width that can retain a query, pane boundary, and usable text. */
export const MARKDOWN_BROWSER_MINIMUM_COLUMNS = 32;

/** Rows outside browser panes: one heading and two context-sensitive hints. */
export const MARKDOWN_BROWSER_CHROME_ROWS = 3;

/** Package default minimum height of the picker pane, including its border. */
export const MARKDOWN_BROWSER_DEFAULT_PICKER_ROWS = 7;

/** Package default minimum height of the document pane, including its border. */
export const MARKDOWN_BROWSER_DEFAULT_DOCUMENT_ROWS = 8;

/** Package default readable Markdown measure in terminal cells. */
export const MARKDOWN_BROWSER_DEFAULT_DOCUMENT_MEASURE = 72;

/** One semantic heading grouping subsequent browser entries. */
export interface MarkdownBrowserGroupHeading {
  readonly kind: "group-heading";
  readonly id: string;
  readonly label: string;
  readonly description?: string;
}

/** One caller-supplied Markdown document. */
export interface MarkdownBrowserDocument {
  readonly kind: "document";
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  /** Stable forward-slash path relative to the caller's corpus root. */
  readonly path: string;
  /** Untrusted Markdown source rendered by the package Markdown authority. */
  readonly source: string;
  /** Explicit immutable image resources eligible for Diagram promotion. */
  readonly diagrams?: readonly MarkdownDiagramResource[];
  /** Explicit immutable image resources eligible for Chart promotion. */
  readonly charts?: readonly MarkdownChartResource[];
}

/** A non-document action returned to the caller after terminal restoration. */
export interface MarkdownBrowserAction<Action> {
  readonly kind: "action";
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly value: Action;
}

/** A terminal-only exit choice that ends browsing without an action payload. */
export interface MarkdownBrowserExitAction {
  readonly kind: "exit";
  readonly id: string;
  readonly label: string;
  readonly description?: string;
}

/** Group structure, documents, caller actions, and explicit exit choices. */
export type MarkdownBrowserEntry<Action> =
  | MarkdownBrowserGroupHeading
  | MarkdownBrowserDocument
  | MarkdownBrowserAction<Action>
  | MarkdownBrowserExitAction;

/** The pane whose keyboard vocabulary is currently active. */
export type MarkdownBrowserPane = "picker" | "document";

/** Adaptive pane composition selected from terminal height and focus. */
export type MarkdownBrowserLayoutMode =
  | "picker-only"
  | "split"
  | "document-only";

/** Resolved pane row budgets for one browser frame. */
export interface MarkdownBrowserLayout {
  readonly mode: MarkdownBrowserLayoutMode;
  /** Complete picker box rows, or zero when the picker is hidden. */
  readonly pickerRows: number;
  /** Complete document box rows, or zero when the document is hidden. */
  readonly documentRows: number;
}

/** Optional typed feedback presented by a browser frame. */
export type MarkdownBrowserFeedback =
  | { readonly kind: "no-matches"; readonly message: string }
  | { readonly kind: "boundary"; readonly message: string }
  | { readonly kind: "unresolved-link"; readonly message: string };

/** Public resolver fact for one caller-admitted Markdown document. */
export interface MarkdownBrowserDocumentFact {
  readonly id: string;
  readonly label: string;
  readonly path: string;
}

/** Context supplied when an admitted Markdown link needs caller resolution. */
export interface MarkdownBrowserLinkResolverInput {
  readonly sourceDocumentId: string;
  readonly sourcePath: string;
  readonly destination: string;
  readonly availableDocuments: readonly MarkdownBrowserDocumentFact[];
}

/** Closed outcomes a caller may return from Markdown link resolution. */
export type MarkdownBrowserLinkResolution =
  | {
    readonly kind: "document";
    readonly documentId: string;
    readonly fragment?: string;
  }
  | { readonly kind: "fragment"; readonly fragment: string }
  | { readonly kind: "external"; readonly destination: string }
  | { readonly kind: "unresolved"; readonly message?: string };

/** Caller-owned, effect-free resolution of one admitted Markdown link. */
export type MarkdownBrowserLinkResolver = (
  input: MarkdownBrowserLinkResolverInput,
) => MarkdownBrowserLinkResolution | Promise<MarkdownBrowserLinkResolution>;

/** One focused link activation awaiting a caller or default resolution. */
export interface MarkdownBrowserLinkRequest
  extends MarkdownBrowserLinkResolverInput {
  readonly id: string;
}

/** How the currently addressed link acquired focus. */
export type MarkdownBrowserLinkFocusOrigin = "keyboard" | "pointer";

/** Stable focus on one logical link occurrence across its wrapped rows. */
export interface MarkdownBrowserLinkFocus {
  readonly id: string;
  readonly origin: MarkdownBrowserLinkFocusOrigin;
}

/** One inclusive terminal-cell range occupied by a visible link row. */
export interface MarkdownBrowserLinkRegion {
  /** One-based content row inside the document pane. */
  readonly row: number;
  /** One-based inclusive column inside the document pane. */
  readonly startColumn: number;
  /** One-based inclusive column inside the document pane. */
  readonly endColumn: number;
}

/** Position of a logical link occurrence relative to the document viewport. */
export type MarkdownBrowserLinkVisibility = "visible" | "above" | "below";

/** Addressable occurrence derived from neutral Markdown and cell projection. */
export interface MarkdownBrowserLinkOccurrence {
  readonly id: string;
  readonly destination: string;
  readonly sourceDocumentId: string;
  readonly sourcePath: string;
  /** One-based first rendered row in the complete document projection. */
  readonly documentStartRow: number;
  /** One-based last rendered row in the complete document projection. */
  readonly documentEndRow: number;
  readonly regions: readonly MarkdownBrowserLinkRegion[];
  readonly visibility: MarkdownBrowserLinkVisibility;
  readonly focused: boolean;
}

/** Stable state safe to retain while a caller performs an external action. */
export interface MarkdownBrowserResumableState {
  readonly query: string;
  /** Grapheme index in `query`. */
  readonly queryCursor: number;
  readonly highlightedId?: string;
  readonly openedDocumentId?: string;
  readonly focusedPane: MarkdownBrowserPane;
  readonly pickerVisibleStart: number;
  readonly documentScrollOffset: number;
  /** Visible-text anchor used to preserve meaning across rewrapping. */
  readonly documentAnchor?: string;
  readonly linkFocus?: MarkdownBrowserLinkFocus;
}

/** Public construction options for one Markdown browsing operation. */
export interface MarkdownBrowserOptions<Action> {
  readonly label: string;
  readonly entries: readonly MarkdownBrowserEntry<Action>[];
  readonly placeholder?: string;
  readonly initialState?: MarkdownBrowserResumableState;
  /** Minimum complete picker-pane rows; ordinary callers use the package default. */
  readonly pickerMinimumRows?: number;
  /** Minimum complete document-pane rows; ordinary callers use the package default. */
  readonly documentMinimumRows?: number;
  /** Readable Markdown measure; bounded by the document pane. */
  readonly documentMeasure?: number;
  /** Enable SGR mouse tracking when terminal control has not refused it. */
  readonly mouse?: boolean;
  /** Resolve admitted document destinations without performing effects. */
  readonly resolveLink?: MarkdownBrowserLinkResolver;
}

/** Explicit terminal dimensions used by pure browser state construction. */
export interface MarkdownBrowserGeometry {
  readonly columns: number;
  readonly rows: number;
}

/** Complete immutable browser state consumed by transitions and rendering. */
export interface MarkdownBrowserState<Action> {
  readonly label: string;
  readonly placeholder: string;
  readonly entries: readonly MarkdownBrowserEntry<Action>[];
  /** Current package-filtered grouped entries, before viewport windowing. */
  readonly filteredEntries: readonly MarkdownBrowserEntry<Action>[];
  readonly query: string;
  readonly queryCursor: number;
  readonly highlightedId?: string;
  readonly openedDocumentId?: string;
  readonly focusedPane: MarkdownBrowserPane;
  readonly pickerVisibleStart: number;
  readonly documentScrollOffset: number;
  readonly documentAnchor?: string;
  /** Package-owned marker: the persisted anchor still needs one projection fit. */
  readonly documentAnchorPending?: true;
  readonly linkFocus?: MarkdownBrowserLinkFocus;
  readonly columns: number;
  readonly rows: number;
  readonly layout: MarkdownBrowserLayout;
  readonly feedback?: MarkdownBrowserFeedback;
  readonly pickerMinimumRows: number;
  readonly documentMinimumRows: number;
  readonly documentMeasure: number;
  readonly theme: TerminalThemeVariant;
  readonly motif: TerminalMotif;
}

/** Successful caller action, paired with exact state for later resumption. */
export interface MarkdownBrowserActionResult<Action> {
  readonly kind: "action";
  readonly id: string;
  readonly value: Action;
  readonly state: MarkdownBrowserResumableState;
}

/** Explicit exit selection, paired with exact state for audit or re-entry. */
export interface MarkdownBrowserExitResult {
  readonly kind: "exit";
  readonly id: string;
  readonly state: MarkdownBrowserResumableState;
}

/** Safe external destination returned only after terminal restoration. */
export interface MarkdownBrowserExternalLinkResult {
  readonly kind: "external-link";
  /** Stable logical link occurrence that produced the external action. */
  readonly id: string;
  readonly destination: string;
  readonly sourceDocumentId: string;
  readonly sourcePath: string;
  readonly state: MarkdownBrowserResumableState;
}

/** Every non-cancellation value returned by `requestMarkdownBrowser`. */
export type MarkdownBrowserResult<Action> =
  | MarkdownBrowserActionResult<Action>
  | MarkdownBrowserExitResult
  | MarkdownBrowserExternalLinkResult;

/** Why browser geometry or terminal control cannot safely begin or continue. */
export type MarkdownBrowserRefusalReason =
  | "ansi-control-unavailable"
  | "terminal-too-small";

/** Typed refusal raised before an unsafe or incoherent browser frame is drawn. */
export class MarkdownBrowserRefusalError extends Error {
  override readonly name = "MarkdownBrowserRefusalError";

  readonly reason: MarkdownBrowserRefusalReason;
  readonly columns: number;
  readonly rows: number;

  constructor(
    reason: MarkdownBrowserRefusalReason,
    geometry: MarkdownBrowserGeometry,
  ) {
    super(
      reason === "ansi-control-unavailable"
        ? "Markdown browsing requires ANSI cursor control."
        : `Terminal ${geometry.columns}x${geometry.rows} is too small for a coherent Markdown browser pane.`,
    );
    this.reason = reason;
    this.columns = geometry.columns;
    this.rows = geometry.rows;
  }
}

interface MarkdownBrowserConfig {
  readonly label: string;
  readonly placeholder: string;
  readonly entries: readonly MarkdownBrowserEntry<unknown>[];
  readonly pickerMinimumRows: number;
  readonly documentMinimumRows: number;
  readonly documentMeasure: number;
  readonly theme: TerminalThemeVariant;
  readonly motif: TerminalMotif;
}

export interface MarkdownBrowserStatePatch {
  readonly query?: string;
  readonly queryCursor?: number;
  readonly highlightedId?: string | null;
  readonly openedDocumentId?: string | null;
  readonly focusedPane?: MarkdownBrowserPane;
  readonly pickerVisibleStart?: number;
  readonly documentScrollOffset?: number;
  readonly documentAnchor?: string | null;
  readonly documentAnchorPending?: boolean;
  readonly linkFocus?: MarkdownBrowserLinkFocus | null;
  readonly columns?: number;
  readonly rows?: number;
  readonly feedback?: MarkdownBrowserFeedback | null;
}

function assertPlainLabel(value: string, name: string): void {
  if (value.trim() === "" || /[\p{Cc}\p{Cf}]/u.test(value)) {
    throw new TypeError(`${name} must be non-empty and control-free`);
  }
}

function positiveSafeInteger(
  value: number | undefined,
  fallback: number,
  name: string,
  minimum: number,
): number {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved < minimum) {
    throw new TypeError(
      `${name} must be a safe integer of at least ${minimum}; received ${resolved}`,
    );
  }
  return resolved;
}

function assertGeometry(geometry: MarkdownBrowserGeometry): void {
  if (
    !Number.isSafeInteger(geometry.columns) || geometry.columns < 1 ||
    !Number.isSafeInteger(geometry.rows) || geometry.rows < 1
  ) {
    throw new TypeError(
      `Markdown browser geometry must contain positive safe integers; received ${geometry.columns}x${geometry.rows}`,
    );
  }
}

function assertCorpusPath(path: string): void {
  const segments = path.split("/");
  if (
    path.trim() === "" || path.trim() !== path || path.startsWith("/") ||
    path.includes("\\") || /[\p{Cc}\p{Cf}]/u.test(path) ||
    segments.some((segment) =>
      segment === "" || segment === "." || segment === ".."
    )
  ) {
    throw new TypeError(
      `Markdown browser document path must be a stable corpus-relative path; received ${
        JSON.stringify(path)
      }`,
    );
  }
}

function isGroup<Action>(
  entry: MarkdownBrowserEntry<Action>,
): entry is MarkdownBrowserGroupHeading {
  return entry.kind === "group-heading";
}

export function isMarkdownBrowserDocument<Action>(
  entry: MarkdownBrowserEntry<Action>,
): entry is MarkdownBrowserDocument {
  return entry.kind === "document";
}

export function isMarkdownBrowserSelectable<Action>(
  entry: MarkdownBrowserEntry<Action>,
): entry is
  | MarkdownBrowserDocument
  | MarkdownBrowserAction<Action>
  | MarkdownBrowserExitAction {
  return entry.kind !== "group-heading";
}

function searchableDescription<Action>(
  entry: MarkdownBrowserEntry<Action>,
): string | undefined {
  if (entry.kind !== "document") return entry.description;
  return entry.description === undefined
    ? entry.path
    : `${entry.description} · ${entry.path}`;
}

function choiceEntries<Action>(
  entries: readonly MarkdownBrowserEntry<Action>[],
): readonly InteractionEntry<number>[] {
  return entries.map((entry, index): InteractionEntry<number> => {
    if (isGroup(entry)) {
      return {
        kind: "group-heading",
        id: entry.id,
        label: entry.label,
        ...(entry.description === undefined
          ? {}
          : { description: entry.description }),
      };
    }
    const description = searchableDescription(entry);
    return {
      kind: "choice",
      id: entry.id,
      label: entry.label,
      ...(description === undefined ? {} : { description }),
      value: index,
    };
  });
}

function freezeEntry<Action>(
  entry: MarkdownBrowserEntry<Action>,
): MarkdownBrowserEntry<Action> {
  switch (entry.kind) {
    case "group-heading":
      return Object.freeze({
        kind: entry.kind,
        id: entry.id,
        label: entry.label,
        ...(entry.description === undefined
          ? {}
          : { description: entry.description }),
      });
    case "document": {
      if (typeof entry.source !== "string") {
        throw new TypeError(
          "Markdown browser document source must be a string",
        );
      }
      assertCorpusPath(entry.path);
      const diagrams = entry.diagrams === undefined
        ? undefined
        : validateMarkdownDiagramResources(entry.diagrams);
      const charts = entry.charts === undefined
        ? undefined
        : validateMarkdownChartResources(entry.charts);
      if (
        (diagrams !== undefined && diagrams.length > 0) ||
        (charts !== undefined && charts.length > 0)
      ) {
        parseMarkdown(entry.source, {
          ...(diagrams === undefined ? {} : { diagrams }),
          ...(charts === undefined ? {} : { charts }),
        });
      }
      return Object.freeze({
        kind: entry.kind,
        id: entry.id,
        label: entry.label,
        ...(entry.description === undefined
          ? {}
          : { description: entry.description }),
        path: entry.path,
        source: entry.source,
        ...(diagrams === undefined ? {} : { diagrams }),
        ...(charts === undefined ? {} : { charts }),
      });
    }
    case "action":
      return Object.freeze({
        kind: entry.kind,
        id: entry.id,
        label: entry.label,
        ...(entry.description === undefined
          ? {}
          : { description: entry.description }),
        value: entry.value,
      });
    case "exit":
      return Object.freeze({
        kind: entry.kind,
        id: entry.id,
        label: entry.label,
        ...(entry.description === undefined
          ? {}
          : { description: entry.description }),
      });
  }
}

function validateEntries<Action>(
  source: readonly MarkdownBrowserEntry<Action>[],
): readonly MarkdownBrowserEntry<Action>[] {
  if (!Array.isArray(source)) {
    throw new TypeError("Markdown browser entries must be an array");
  }
  const entries = Object.freeze(
    source.map((entry) => freezeEntry<Action>(entry)),
  );
  assertChoices(choiceEntries(entries), true);
  return entries;
}

/**
 * Filter browser entries through the same label/description and grouped
 * retention authority as the package's search requests.
 */
export function filterMarkdownBrowserEntries<Action>(
  entries: readonly MarkdownBrowserEntry<Action>[],
  query: string,
): readonly MarkdownBrowserEntry<Action>[] {
  const choices = choiceEntries(entries);
  const filtered = filterInteractionEntries(choices, query);
  return Object.freeze(filtered.map((entry) => {
    if (isInteractionGroupHeading(entry)) {
      const source = entries.find((candidate) => candidate.id === entry.id);
      if (source === undefined || !isGroup(source)) {
        throw new TypeError("Markdown browser filtering lost a group heading");
      }
      return source;
    }
    if (!isInteractionChoice(entry)) {
      throw new TypeError(
        "Markdown browser filtering produced an unknown entry",
      );
    }
    const source = entries[entry.value];
    if (source === undefined || !isMarkdownBrowserSelectable(source)) {
      throw new TypeError("Markdown browser filtering lost a selectable entry");
    }
    return source;
  }));
}

function selectableById<Action>(
  entries: readonly MarkdownBrowserEntry<Action>[],
  id: string | undefined,
): MarkdownBrowserEntry<Action> | undefined {
  if (id === undefined) return undefined;
  return entries.find((entry) =>
    isMarkdownBrowserSelectable(entry) && entry.id === id
  );
}

function firstSelectableId<Action>(
  entries: readonly MarkdownBrowserEntry<Action>[],
): string | undefined {
  return entries.find(isMarkdownBrowserSelectable)?.id;
}

function layoutFor(
  openedDocumentId: string | undefined,
  focusedPane: MarkdownBrowserPane,
  columns: number,
  rows: number,
  pickerMinimumRows: number,
  documentMinimumRows: number,
): MarkdownBrowserLayout {
  const paneRows = rows - MARKDOWN_BROWSER_CHROME_ROWS;
  if (openedDocumentId === undefined) {
    if (paneRows < pickerMinimumRows) {
      throw new MarkdownBrowserRefusalError("terminal-too-small", {
        columns,
        rows,
      });
    }
    return Object.freeze({
      mode: "picker-only",
      pickerRows: paneRows,
      documentRows: 0,
    });
  }
  if (paneRows >= pickerMinimumRows + documentMinimumRows) {
    const target = Math.round(paneRows / 3);
    const pickerRows = Math.max(
      pickerMinimumRows,
      Math.min(target, paneRows - documentMinimumRows),
    );
    return Object.freeze({
      mode: "split",
      pickerRows,
      documentRows: paneRows - pickerRows,
    });
  }
  const minimum = focusedPane === "picker"
    ? pickerMinimumRows
    : documentMinimumRows;
  if (paneRows < minimum) {
    throw new MarkdownBrowserRefusalError("terminal-too-small", {
      columns,
      rows,
    });
  }
  return Object.freeze(
    focusedPane === "picker"
      ? { mode: "picker-only", pickerRows: paneRows, documentRows: 0 }
      : { mode: "document-only", pickerRows: 0, documentRows: paneRows },
  );
}

const QUERY_JOIN_CONTROLS = new Set(["\u200C", "\u200D"]);

/** Remove terminal-control characters while preserving script join controls. */
export function sanitizeMarkdownBrowserQueryInput(value: string): string {
  return [...value].filter((character) =>
    !/[\p{Cc}]/u.test(character) &&
    (!/[\p{Cf}]/u.test(character) || QUERY_JOIN_CONTROLS.has(character))
  ).join("");
}

function validateQuery(query: string, cursor: number): void {
  if (sanitizeMarkdownBrowserQueryInput(query) !== query) {
    throw new TypeError("Markdown browser query must be single-line text");
  }
  const length = segmentGraphemes(query).length;
  if (!Number.isSafeInteger(cursor) || cursor < 0 || cursor > length) {
    throw new TypeError(
      `Markdown browser query cursor must be between 0 and ${length}; received ${cursor}`,
    );
  }
}

function validateAnchor(anchor: string | undefined): void {
  if (
    anchor !== undefined &&
    (anchor.trim() === "" || /[\p{Cc}\p{Cf}]/u.test(anchor))
  ) {
    throw new TypeError(
      "Markdown browser document anchor must be non-empty and control-free",
    );
  }
}

function validateLinkFocus(focus: MarkdownBrowserLinkFocus | undefined): void {
  if (focus === undefined) return;
  if (
    focus.id.trim() === "" || /[\p{Cc}\p{Cf}]/u.test(focus.id) ||
    (focus.origin !== "keyboard" && focus.origin !== "pointer")
  ) {
    throw new TypeError(
      "Markdown browser link focus must have a control-free id and known origin",
    );
  }
}

function configFromOptions<Action>(
  options: MarkdownBrowserOptions<Action>,
  presentation: CliPresentationOptions,
): MarkdownBrowserConfig & {
  readonly entries: readonly MarkdownBrowserEntry<Action>[];
} {
  assertPlainLabel(options.label, "Markdown browser label");
  if (options.placeholder !== undefined) {
    assertPlainLabel(options.placeholder, "Markdown browser placeholder");
  }
  const theme = presentation.theme ?? "dark";
  if (theme !== "light" && theme !== "dark") {
    throw new TypeError(`unknown terminal theme variant ${theme}`);
  }
  const motif = presentation.motif ?? DISCERN_TERMINAL_MOTIF;
  terminalMotifRepertoire(motif, true);
  return {
    label: options.label,
    placeholder: options.placeholder ?? "Search documents and actions",
    entries: validateEntries(options.entries),
    pickerMinimumRows: positiveSafeInteger(
      options.pickerMinimumRows,
      MARKDOWN_BROWSER_DEFAULT_PICKER_ROWS,
      "Markdown browser picker minimum rows",
      MARKDOWN_BROWSER_DEFAULT_PICKER_ROWS,
    ),
    documentMinimumRows: positiveSafeInteger(
      options.documentMinimumRows,
      MARKDOWN_BROWSER_DEFAULT_DOCUMENT_ROWS,
      "Markdown browser document minimum rows",
      5,
    ),
    documentMeasure: positiveSafeInteger(
      options.documentMeasure,
      MARKDOWN_BROWSER_DEFAULT_DOCUMENT_MEASURE,
      "Markdown browser document measure",
      16,
    ),
    theme,
    motif,
  };
}

function stateFrom<Action>(
  config: MarkdownBrowserConfig & {
    readonly entries: readonly MarkdownBrowserEntry<Action>[];
  },
  resume: MarkdownBrowserResumableState,
  geometry: MarkdownBrowserGeometry,
  feedback?: MarkdownBrowserFeedback,
  documentAnchorPending = false,
): MarkdownBrowserState<Action> {
  assertGeometry(geometry);
  if (geometry.columns < MARKDOWN_BROWSER_MINIMUM_COLUMNS) {
    throw new MarkdownBrowserRefusalError("terminal-too-small", geometry);
  }
  validateQuery(resume.query, resume.queryCursor);
  validateAnchor(resume.documentAnchor);
  validateLinkFocus(resume.linkFocus);
  if (
    resume.focusedPane !== "picker" && resume.focusedPane !== "document"
  ) {
    throw new TypeError(
      `Markdown browser focused pane must be "picker" or "document"; received ${
        JSON.stringify(resume.focusedPane)
      }`,
    );
  }
  if (
    !Number.isSafeInteger(resume.pickerVisibleStart) ||
    resume.pickerVisibleStart < 0 ||
    !Number.isSafeInteger(resume.documentScrollOffset) ||
    resume.documentScrollOffset < 0
  ) {
    throw new TypeError(
      "Markdown browser offsets must be non-negative safe integers",
    );
  }
  const filteredEntries = filterMarkdownBrowserEntries(
    config.entries,
    resume.query,
  );
  const resolvedFeedback = feedback ??
    (filteredEntries.some(isMarkdownBrowserSelectable)
      ? undefined
      : Object.freeze({
        kind: "no-matches" as const,
        message: "No matches.",
      }));
  const highlighted = selectableById(
    filteredEntries,
    resume.highlightedId,
  );
  if (resume.highlightedId !== undefined && highlighted === undefined) {
    throw new TypeError(
      `Markdown browser highlighted id ${
        JSON.stringify(resume.highlightedId)
      } is not a filtered selectable entry`,
    );
  }
  const opened = selectableById(config.entries, resume.openedDocumentId);
  if (
    resume.openedDocumentId !== undefined &&
    (opened === undefined || !isMarkdownBrowserDocument(opened))
  ) {
    throw new TypeError(
      `Markdown browser opened id ${
        JSON.stringify(resume.openedDocumentId)
      } is not a document`,
    );
  }
  if (resume.focusedPane === "document" && opened === undefined) {
    throw new TypeError(
      "Markdown browser cannot focus the document pane without an open document",
    );
  }
  const visibleStart = Math.min(
    resume.pickerVisibleStart,
    Math.max(0, filteredEntries.length - 1),
  );
  const layout = layoutFor(
    resume.openedDocumentId,
    resume.focusedPane,
    geometry.columns,
    geometry.rows,
    config.pickerMinimumRows,
    config.documentMinimumRows,
  );
  return Object.freeze({
    label: config.label,
    placeholder: config.placeholder,
    entries: config.entries,
    filteredEntries,
    query: resume.query,
    queryCursor: resume.queryCursor,
    ...(resume.highlightedId === undefined
      ? {}
      : { highlightedId: resume.highlightedId }),
    ...(resume.openedDocumentId === undefined
      ? {}
      : { openedDocumentId: resume.openedDocumentId }),
    focusedPane: resume.focusedPane,
    pickerVisibleStart: visibleStart,
    documentScrollOffset: resume.documentScrollOffset,
    ...(resume.documentAnchor === undefined
      ? {}
      : { documentAnchor: resume.documentAnchor }),
    ...(documentAnchorPending && resume.documentAnchor !== undefined
      ? { documentAnchorPending: true as const }
      : {}),
    ...(resume.linkFocus === undefined
      ? {}
      : { linkFocus: Object.freeze({ ...resume.linkFocus }) }),
    columns: geometry.columns,
    rows: geometry.rows,
    layout,
    ...(resolvedFeedback === undefined
      ? {}
      : { feedback: Object.freeze(resolvedFeedback) }),
    pickerMinimumRows: config.pickerMinimumRows,
    documentMinimumRows: config.documentMinimumRows,
    documentMeasure: config.documentMeasure,
    theme: config.theme,
    motif: config.motif,
  });
}

function configFromState<Action>(
  state: MarkdownBrowserState<Action>,
): MarkdownBrowserConfig & {
  readonly entries: readonly MarkdownBrowserEntry<Action>[];
} {
  return {
    label: state.label,
    placeholder: state.placeholder,
    entries: state.entries,
    pickerMinimumRows: state.pickerMinimumRows,
    documentMinimumRows: state.documentMinimumRows,
    documentMeasure: state.documentMeasure,
    theme: state.theme,
    motif: state.motif,
  };
}

/** Construct and validate one immutable pure browser state. */
export function createMarkdownBrowserState<Action>(
  options: MarkdownBrowserOptions<Action>,
  geometry: MarkdownBrowserGeometry,
  presentation: CliPresentationOptions = {},
): MarkdownBrowserState<Action> {
  const config = configFromOptions(options, presentation);
  const initial = options.initialState;
  const query = initial?.query ?? "";
  const filtered = filterMarkdownBrowserEntries(config.entries, query);
  const initialHighlight = firstSelectableId(filtered);
  const resume: MarkdownBrowserResumableState = initial ??
    (initialHighlight === undefined
      ? {
        query,
        queryCursor: segmentGraphemes(query).length,
        focusedPane: "picker",
        pickerVisibleStart: 0,
        documentScrollOffset: 0,
      }
      : {
        query,
        queryCursor: segmentGraphemes(query).length,
        highlightedId: initialHighlight,
        focusedPane: "picker",
        pickerVisibleStart: 0,
        documentScrollOffset: 0,
      });
  return stateFrom(
    config,
    resume,
    geometry,
    undefined,
    initial?.documentAnchor !== undefined,
  );
}

/** Project the stable immutable subset returned alongside actions and exits. */
export function markdownBrowserResumableState<Action>(
  state: MarkdownBrowserState<Action>,
): MarkdownBrowserResumableState {
  return Object.freeze({
    query: state.query,
    queryCursor: state.queryCursor,
    ...(state.highlightedId === undefined
      ? {}
      : { highlightedId: state.highlightedId }),
    ...(state.openedDocumentId === undefined
      ? {}
      : { openedDocumentId: state.openedDocumentId }),
    focusedPane: state.focusedPane,
    pickerVisibleStart: state.pickerVisibleStart,
    documentScrollOffset: state.documentScrollOffset,
    ...(state.documentAnchor === undefined
      ? {}
      : { documentAnchor: state.documentAnchor }),
    ...(state.linkFocus === undefined
      ? {}
      : { linkFocus: Object.freeze({ ...state.linkFocus }) }),
  });
}

/**
 * Rebuild state after a pure transition. `null` clears an optional fact;
 * changing the query retains the stable highlight when it still matches and
 * otherwise moves to the first selectable result.
 */
export function updateMarkdownBrowserState<Action>(
  state: MarkdownBrowserState<Action>,
  patch: MarkdownBrowserStatePatch,
): MarkdownBrowserState<Action> {
  const query = patch.query ?? state.query;
  const filtered = filterMarkdownBrowserEntries(state.entries, query);
  const requestedHighlight = patch.highlightedId === null
    ? undefined
    : patch.highlightedId ?? state.highlightedId;
  const highlightedId = selectableById(filtered, requestedHighlight)?.id ??
    firstSelectableId(filtered);
  const openedDocumentId = patch.openedDocumentId === null
    ? undefined
    : patch.openedDocumentId ?? state.openedDocumentId;
  const focusedPane = openedDocumentId === undefined
    ? "picker"
    : patch.focusedPane ?? state.focusedPane;
  const cursor = patch.queryCursor ??
    (patch.query === undefined
      ? state.queryCursor
      : segmentGraphemes(query).length);
  const linkFocus = patch.linkFocus === null
    ? undefined
    : patch.linkFocus ?? state.linkFocus;
  const documentAnchor = patch.documentAnchor === null
    ? undefined
    : patch.documentAnchor ?? state.documentAnchor;
  const documentAnchorPending = documentAnchor !== undefined &&
    (patch.documentAnchorPending ??
      (state.documentAnchorPending === true));
  const resume: MarkdownBrowserResumableState = {
    query,
    queryCursor: cursor,
    ...(highlightedId === undefined ? {} : { highlightedId }),
    ...(openedDocumentId === undefined ? {} : { openedDocumentId }),
    focusedPane,
    pickerVisibleStart: patch.pickerVisibleStart ?? state.pickerVisibleStart,
    documentScrollOffset: patch.documentScrollOffset ??
      state.documentScrollOffset,
    ...(documentAnchor === undefined ? {} : {
      documentAnchor,
    }),
    ...(linkFocus === undefined ? {} : { linkFocus }),
  };
  return stateFrom(
    configFromState(state),
    resume,
    {
      columns: patch.columns ?? state.columns,
      rows: patch.rows ?? state.rows,
    },
    patch.feedback === null ? undefined : patch.feedback ?? state.feedback,
    documentAnchorPending,
  );
}

/** Resolve one stable entry from complete browser state. */
export function markdownBrowserEntry<Action>(
  state: MarkdownBrowserState<Action>,
  id: string | undefined,
): MarkdownBrowserEntry<Action> | undefined {
  return id === undefined
    ? undefined
    : state.entries.find((entry) => entry.id === id);
}
