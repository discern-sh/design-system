/**
 * The Markdown browser's data: the caller's corpus of grouped documents,
 * actions, and exits; the place a reader can resume from; the results a
 * browser returns; and every word it writes. Process-free: the browser's
 * screens are built from these in `markdown-browser-view.ts` and run on
 * the application runtime.
 *
 * @module
 */

import { validateSemanticInlineDestination } from "../semantic-inline.ts";
import { assertChoices } from "./choice-navigation.ts";
import type { InteractionEntry } from "./types.ts";
import {
  DEFAULT_TERMINAL_APPLICATION_COPY,
  type TerminalApplicationCopy,
} from "./application/copy.ts";
import type { TerminalApplicationCommand } from "./application/runtime.ts";
import type { MarkdownChartResource } from "../../chart/markdown.ts";
import type { MarkdownDiagramResource } from "../../diagram/markdown.ts";

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

/** A non-document action the caller performs. */
export interface MarkdownBrowserAction<Action> {
  readonly kind: "action";
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly value: Action;
}

/** A choice that closes the browser without an action payload. */
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

/**
 * Caller-owned resolution of one admitted Markdown link among the
 * documents the browser was given. It is effect-free and answers at once.
 */
export type MarkdownBrowserLinkResolver = (
  input: MarkdownBrowserLinkResolverInput,
) => MarkdownBrowserLinkResolution;

/** One place a reader can be: the contents, or a document by id. */
export type MarkdownBrowserPlace =
  | { readonly kind: "contents" }
  | { readonly kind: "document"; readonly id: string };

/** Where a reader was, kept so a later browser can resume there. */
export interface MarkdownBrowserResumableState {
  /** Places in the order the reader went, oldest first; the last is open. */
  readonly history: readonly MarkdownBrowserPlace[];
  /** The contents entry that was selected. */
  readonly selectedId?: string;
  /** Each document's scroll position as its reading body reported it, by document id. */
  readonly positions?: Readonly<Record<string, number>>;
  /** The focused link in each document, by document id. */
  readonly links?: Readonly<Record<string, string>>;
}

/**
 * Every word the browser writes, with the application's own words: key
 * labels, the search placeholder, the title of entries before the first
 * heading, and what an unfollowable link says.
 */
export interface MarkdownBrowserCopy extends TerminalApplicationCopy {
  /** `/` and Ctrl+K: search every entry. */
  readonly search: string;
  /** `c`, and the title of entries before the first group heading. */
  readonly contents: string;
  /** The search field while it is empty. */
  readonly searchPlaceholder: string;
  /** A link the resolver could not follow and named no reason for. */
  readonly unresolvedLink: string;
  /** A link to a heading the document does not have. */
  readonly headingNotFound: string;
  /** A link to a document the browser was not given. */
  readonly documentNotFound: string;
}

/** The English words the browser writes where a caller supplies none. */
export const DEFAULT_MARKDOWN_BROWSER_COPY: MarkdownBrowserCopy = Object.freeze(
  {
    ...DEFAULT_TERMINAL_APPLICATION_COPY,
    search: "Search",
    contents: "Contents",
    searchPlaceholder: "Search documents and actions",
    unresolvedLink: "This link could not be followed.",
    headingNotFound: "That heading is not in this document.",
    documentNotFound: "That document is not available here.",
  },
);

/** Construction options for one Markdown browser. */
export interface MarkdownBrowserOptions<Action> {
  /** The header's identity, such as the corpus's name. */
  readonly label: string;
  readonly entries: readonly MarkdownBrowserEntry<Action>[];
  /** The search field's placeholder; defaults to the copy's. */
  readonly placeholder?: string;
  /** Where to start; by default the contents with its first entry selected. */
  readonly initialState?: MarkdownBrowserResumableState;
  /** Readable Markdown measure in cells, at least 16; defaults to 72. */
  readonly documentMeasure?: number;
  /** Report clicks and the wheel; off by default. */
  readonly mouse?: boolean;
  /**
   * Show each document's path beside its preview and its title, and let
   * search match it; off by default, since readers seldom navigate a
   * corpus by file.
   */
  readonly showPaths?: boolean;
  /** Resolve relative destinations among the admitted documents. */
  readonly resolveLink?: MarkdownBrowserLinkResolver;
  /** Replacements for any word the browser writes. */
  readonly copy?: Partial<MarkdownBrowserCopy>;
}

/** A chosen caller action, with where the reader was. */
export interface MarkdownBrowserActionResult<Action> {
  readonly kind: "action";
  readonly id: string;
  readonly value: Action;
  readonly state: MarkdownBrowserResumableState;
}

/** A chosen exit, with where the reader was. */
export interface MarkdownBrowserExitResult {
  readonly kind: "exit";
  readonly id: string;
  readonly state: MarkdownBrowserResumableState;
}

/** A followed link that leaves the documents, with where the reader was. */
export interface MarkdownBrowserExternalLinkResult {
  readonly kind: "external-link";
  /** The link's identity: its document id and its place in that document. */
  readonly id: string;
  readonly destination: string;
  readonly sourceDocumentId: string;
  readonly sourcePath: string;
  readonly state: MarkdownBrowserResumableState;
}

/** Every outcome `requestMarkdownBrowser` resolves with. */
export type MarkdownBrowserResult<Action> =
  | MarkdownBrowserActionResult<Action>
  | MarkdownBrowserExitResult
  | MarkdownBrowserExternalLinkResult;

/** How a caller answers what a reader chose, on its own screen or nested. */
export interface MarkdownBrowserRequestHandlers<Action> {
  /**
   * Answer a chosen action or a link that leaves the documents while the
   * browser stays on screen, with a command — such as a background
   * operation that opens the destination — or nothing. A background command
   * it returns that fails shows its error's message. `{ kind: "exit" }`
   * closes the browser: alone, its request resolves with the choice this
   * answered; nested, the application beneath resumes. Without `respond`,
   * a browser on its own screen closes and resolves with every choice.
   */
  readonly respond?: (
    result:
      | MarkdownBrowserActionResult<Action>
      | MarkdownBrowserExternalLinkResult,
  ) => TerminalApplicationCommand | void;
}

/**
 * How a browser running inside another application answers what a reader
 * chose, and hears it close: `onClose` receives where the reader was, with
 * the exit entry chosen, if any.
 */
export interface MarkdownBrowserHandlers<Action>
  extends MarkdownBrowserRequestHandlers<Action> {
  readonly onClose?: (
    state: MarkdownBrowserResumableState,
    exit?: MarkdownBrowserExitResult,
  ) => void;
}

/** Explicit terminal dimensions a refusal reports. */
export interface MarkdownBrowserGeometry {
  readonly columns: number;
  readonly rows: number;
}

/** Why a standalone browser cannot begin. */
export type MarkdownBrowserRefusalReason =
  | "ansi-control-unavailable"
  | "terminal-too-small";

/** Typed refusal raised before a standalone browser changes the terminal. */
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
        : `Terminal ${geometry.columns}x${geometry.rows} is too small for the Markdown browser.`,
    );
    this.reason = reason;
    this.columns = geometry.columns;
    this.rows = geometry.rows;
  }
}

/** A selectable entry: a document, an action, or an exit. */
export type MarkdownBrowserChoice<Action> = Exclude<
  MarkdownBrowserEntry<Action>,
  MarkdownBrowserGroupHeading
>;

/** One group of choices under a heading, or before the first heading. */
export interface MarkdownBrowserGroup<Action> {
  readonly heading?: MarkdownBrowserGroupHeading;
  readonly choices: readonly MarkdownBrowserChoice<Action>[];
}

/** The validated corpus a browser shows. */
export interface MarkdownBrowserCorpus<Action> {
  readonly groups: readonly MarkdownBrowserGroup<Action>[];
  readonly choices: ReadonlyMap<string, MarkdownBrowserChoice<Action>>;
  /** The group heading each choice sits under. */
  readonly headings: ReadonlyMap<string, MarkdownBrowserGroupHeading>;
  readonly documents: readonly MarkdownBrowserDocumentFact[];
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

function choiceEntries<Action>(
  entries: readonly MarkdownBrowserEntry<Action>[],
): readonly InteractionEntry<number>[] {
  return entries.map((entry, index): InteractionEntry<number> =>
    entry.kind === "group-heading"
      ? {
        kind: "group-heading",
        id: entry.id,
        label: entry.label,
        ...(entry.description === undefined
          ? {}
          : { description: entry.description }),
      }
      : {
        kind: "choice",
        id: entry.id,
        label: entry.label,
        ...(entry.description === undefined
          ? {}
          : { description: entry.description }),
        value: index,
      }
  );
}

/**
 * Validate and group a corpus: unique, control-free ids and labels, at
 * least one choice, text sources, and stable corpus-relative paths.
 */
export function markdownBrowserCorpus<Action>(
  entries: readonly MarkdownBrowserEntry<Action>[],
): MarkdownBrowserCorpus<Action> {
  if (!Array.isArray(entries)) {
    throw new TypeError("Markdown browser entries must be an array");
  }
  assertChoices(choiceEntries(entries), true);
  const groups: MarkdownBrowserGroup<Action>[] = [];
  const choices = new Map<string, MarkdownBrowserChoice<Action>>();
  const headings = new Map<string, MarkdownBrowserGroupHeading>();
  let current: {
    heading?: MarkdownBrowserGroupHeading;
    choices: MarkdownBrowserChoice<Action>[];
  } = { choices: [] };
  for (const entry of entries) {
    if (entry.kind === "group-heading") {
      groups.push(current);
      current = { heading: entry, choices: [] };
      continue;
    }
    if (entry.kind === "document") {
      if (typeof entry.source !== "string") {
        throw new TypeError(
          "Markdown browser document source must be a string",
        );
      }
      assertCorpusPath(entry.path);
    }
    current.choices.push(entry);
    choices.set(entry.id, entry);
    if (current.heading !== undefined) headings.set(entry.id, current.heading);
  }
  groups.push(current);
  return {
    groups: groups.filter((group) => group.choices.length > 0),
    choices,
    headings,
    documents: [...choices.values()].flatMap((choice) =>
      choice.kind === "document"
        ? [{ id: choice.id, label: choice.label, path: choice.path }]
        : []
    ),
  };
}

function isDocument<Action>(
  corpus: MarkdownBrowserCorpus<Action>,
  id: string,
): boolean {
  return corpus.choices.get(id)?.kind === "document";
}

/** Check a resumable state against the corpus it resumes. */
export function assertMarkdownBrowserState<Action>(
  state: MarkdownBrowserResumableState,
  corpus: MarkdownBrowserCorpus<Action>,
): void {
  if (!Array.isArray(state.history) || state.history.length === 0) {
    throw new TypeError("Markdown browser history names at least one place");
  }
  for (const place of state.history) {
    if (place.kind === "contents") continue;
    if (place.kind !== "document" || !isDocument(corpus, place.id)) {
      throw new TypeError(
        `Markdown browser history names ${
          JSON.stringify(place)
        }, which is not a document here`,
      );
    }
  }
  if (
    state.selectedId !== undefined && !corpus.choices.has(state.selectedId)
  ) {
    throw new TypeError(
      `Markdown browser selected id ${
        JSON.stringify(state.selectedId)
      } is not an entry here`,
    );
  }
  for (const [id, line] of Object.entries(state.positions ?? {})) {
    if (!isDocument(corpus, id) || !Number.isSafeInteger(line) || line < 0) {
      throw new TypeError(
        `Markdown browser position for ${
          JSON.stringify(id)
        } must name a document and a whole line from 0`,
      );
    }
  }
  for (const [id, link] of Object.entries(state.links ?? {})) {
    if (!isDocument(corpus, id) || typeof link !== "string") {
      throw new TypeError(
        `Markdown browser link focus for ${
          JSON.stringify(id)
        } must name a document and a link`,
      );
    }
  }
}

const EXTERNAL_DESTINATION = /^(?:(?:https?|mailto|file):|\/\/)/iu;

/**
 * Resolve one followed link: absolute safe destinations leave the
 * documents, and everything else is the caller's resolver to answer.
 */
export function resolveMarkdownBrowserLink(
  input: MarkdownBrowserLinkResolverInput,
  resolver: MarkdownBrowserLinkResolver | undefined,
): MarkdownBrowserLinkResolution {
  const destination = validateSemanticInlineDestination(input.destination);
  if (EXTERNAL_DESTINATION.test(destination)) {
    return { kind: "external", destination };
  }
  if (resolver === undefined) return { kind: "unresolved" };
  const resolution: unknown = resolver(input);
  if (
    typeof resolution !== "object" || resolution === null ||
    typeof (resolution as { then?: unknown }).then === "function"
  ) {
    throw new TypeError(
      "a Markdown browser link resolver answers at once with a resolution",
    );
  }
  const typed = resolution as MarkdownBrowserLinkResolution;
  if (typed.kind !== "external") return typed;
  const safe = validateSemanticInlineDestination(typed.destination);
  if (!EXTERNAL_DESTINATION.test(safe)) {
    throw new TypeError(
      "Markdown browser external resolution must return an absolute safe destination",
    );
  }
  return { kind: "external", destination: safe };
}
