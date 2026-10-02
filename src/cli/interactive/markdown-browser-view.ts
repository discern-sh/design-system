/**
 * The Markdown browser as an application: its contents (a grouped list
 * whose detail previews each document), one document at a time as a
 * Markdown reading body, a search palette over every entry, and a history
 * Back returns through. The controller builds each view and answers each
 * action, link, and dismissal; the runtime owns everything that moves.
 *
 * @module
 */

import { renderMarkdownCliProjection } from "../../components/editorial/markdown/markdown.cli.ts";
import { markdownLeadingTitle } from "../../components/editorial/markdown/markdown.model.ts";
import type { KeyHint } from "../key-hints.ts";
import { DEFAULT_TERMINAL_APPLICATION_COPY } from "./application/copy.ts";
import { fragmentHeading } from "./application/markdown-reading.ts";
import type {
  TerminalApplicationDismissTarget,
  TerminalApplicationLink,
  TerminalApplicationReadingTarget,
  TerminalApplicationState,
} from "./application/model.ts";
import type {
  ApplicationDetailBlock,
  ApplicationDetailStrip,
  ApplicationGlyph,
  ApplicationKeyBinding,
  ApplicationListGroup,
  ApplicationMarkdown,
  ApplicationMessage,
  TerminalApplicationView,
} from "./application/view.ts";
import type {
  ApplicationPalette,
  ApplicationPaletteItem,
} from "./application/layer-view.ts";
import type { TerminalApplicationCopy } from "./application/copy.ts";
import {
  assertMarkdownBrowserState,
  DEFAULT_MARKDOWN_BROWSER_COPY,
  type MarkdownBrowserActionResult,
  type MarkdownBrowserChoice,
  type MarkdownBrowserCopy,
  type MarkdownBrowserCorpus,
  markdownBrowserCorpus,
  type MarkdownBrowserDocument,
  type MarkdownBrowserExitResult,
  type MarkdownBrowserExternalLinkResult,
  type MarkdownBrowserOptions,
  type MarkdownBrowserPlace,
  type MarkdownBrowserResumableState,
  resolveMarkdownBrowserLink,
} from "./markdown-browser-model.ts";
import {
  applicationMarkdownIssues,
  assertMarkdownResources,
} from "./application/markdown-reading.ts";

/** What the browser's keys, rows, and palette items ask it to do. */
export type MarkdownBrowserStep =
  | { readonly kind: "open"; readonly id: string }
  | { readonly kind: "back" }
  | { readonly kind: "contents" }
  | { readonly kind: "search" }
  | { readonly kind: "close" };

/** The contents list's id. */
export const MARKDOWN_BROWSER_CONTENTS = "contents";
/** The search palette's id. */
export const MARKDOWN_BROWSER_SEARCH = "search";

/** The reading body id a document is shown under. */
export function markdownBrowserReadingId(documentId: string): string {
  return `document:${documentId}`;
}

/** A position the runtime applies after the browser's view changes. */
export type MarkdownBrowserMove =
  | { readonly kind: "select"; readonly itemId: string }
  | {
    readonly kind: "reveal";
    readonly readingId: string;
    readonly target: TerminalApplicationReadingTarget;
  };

/** What a step asks of the application around the browser. */
export interface MarkdownBrowserOutcome<Action> {
  readonly moves?: readonly MarkdownBrowserMove[];
  /** A choice for the caller to answer while the browser stays open. */
  readonly result?:
    | MarkdownBrowserActionResult<Action>
    | MarkdownBrowserExternalLinkResult;
  /** The browser closes, with the exit entry chosen, if any. */
  readonly close?: { readonly exit?: MarkdownBrowserExitResult };
}

const STEP = {
  search: Object.freeze({ kind: "search" as const }),
  contents: Object.freeze({ kind: "contents" as const }),
  close: Object.freeze({ kind: "close" as const }),
  back: Object.freeze({ kind: "back" as const }),
};

/** The browser's bindings: search, contents, back, and close. */
export const MARKDOWN_BROWSER_KEYMAP: readonly ApplicationKeyBinding<
  MarkdownBrowserStep
>[] = Object.freeze([
  { key: "/", action: STEP.search },
  { key: "ctrl-k", action: STEP.search },
  { key: "c", action: STEP.contents },
  { key: "q", action: STEP.close },
  { key: "escape", action: STEP.back },
  { key: "backspace", action: STEP.back },
  {
    key: "ctrl-k",
    action: STEP.search,
    scope: { layer: MARKDOWN_BROWSER_SEARCH },
    inFields: true,
  },
]);

/**
 * One-cell row markers. A document carries none, so no row borrows a mark
 * an application gives a state, such as idle or active; an action and an
 * exit say what choosing them does.
 */
const MARKERS = {
  document: { unicode: " ", ascii: " " },
  action: { unicode: "↗", ascii: "/", tone: "accent" },
  exit: { unicode: "×", ascii: "x", tone: "faint" },
} as const satisfies Readonly<Record<string, ApplicationGlyph>>;

const APPLICATION_WORDS = new Set(
  Object.keys(DEFAULT_TERMINAL_APPLICATION_COPY),
);

const CONTENTS: MarkdownBrowserPlace = Object.freeze({ kind: "contents" });

/** Whether two titles say the same words, whatever their case and spacing. */
function sameWords(left: string, right: string): boolean {
  const words = (text: string) =>
    text.trim().replace(/\s+/gu, " ").toLowerCase();
  return words(left) === words(right);
}

/** Builds the browser's views and answers what a reader does in them. */
export class MarkdownBrowserController<Action> {
  readonly corpus: MarkdownBrowserCorpus<Action>;
  readonly copy: MarkdownBrowserCopy;
  readonly #options: MarkdownBrowserOptions<Action>;
  readonly #markdown = new Map<string, ApplicationMarkdown>();
  readonly #previews = new Map<string, readonly ApplicationDetailBlock[]>();
  readonly #headings = new Map<string, ReadonlySet<string>>();
  readonly #applicationCopy: Partial<TerminalApplicationCopy> | undefined;
  readonly #read = new Set<string>();
  #history: MarkdownBrowserPlace[];
  #searching = false;
  #message: ApplicationMessage | undefined;
  #messages = 0;
  #selected: string | undefined;
  /** A contents selection to apply when the contents next show. */
  #pendingSelect: string | undefined;

  /** Every rule the corpus, its documents, and the initial state break throws here. */
  constructor(options: MarkdownBrowserOptions<Action>) {
    if (options.label.trim() === "" || /[\p{Cc}\p{Cf}]/u.test(options.label)) {
      throw new TypeError(
        "Markdown browser label must be non-empty and control-free",
      );
    }
    this.#options = options;
    this.corpus = markdownBrowserCorpus(options.entries);
    this.copy = Object.freeze({
      ...DEFAULT_MARKDOWN_BROWSER_COPY,
      ...options.copy,
    });
    const words = Object.entries(options.copy ?? {}).filter(([name]) =>
      APPLICATION_WORDS.has(name)
    );
    this.#applicationCopy = words.length === 0
      ? undefined
      : Object.freeze(Object.fromEntries(words));
    for (const choice of this.corpus.choices.values()) {
      if (choice.kind !== "document") continue;
      const markdown: ApplicationMarkdown = Object.freeze({
        kind: "markdown",
        source: choice.source,
        ...(choice.diagrams === undefined ? {} : { diagrams: choice.diagrams }),
        ...(choice.charts === undefined ? {} : { charts: choice.charts }),
        ...(options.documentMeasure === undefined
          ? {}
          : { measure: options.documentMeasure }),
      });
      // Resource errors keep the Markdown authority's own type.
      assertMarkdownResources(markdown);
      const issue = applicationMarkdownIssues(markdown)[0];
      if (issue !== undefined) {
        throw new TypeError(
          `Markdown browser document ${
            JSON.stringify(choice.id)
          } ${issue.path} ${issue.message}`,
        );
      }
      this.#markdown.set(choice.id, markdown);
    }
    const initial = options.initialState;
    if (initial !== undefined) {
      assertMarkdownBrowserState(initial, this.corpus);
      for (const place of initial.history) {
        if (place.kind === "document") this.#read.add(place.id);
      }
    }
    this.#history = [...(initial?.history ?? [CONTENTS])];
    this.#pendingSelect = initial?.selectedId;
    this.#selected = initial?.selectedId;
  }

  /** The place on screen. */
  get place(): MarkdownBrowserPlace {
    return this.#history.at(-1) ?? CONTENTS;
  }

  /** Positions to restore once the browser has started. */
  startMoves(): readonly MarkdownBrowserMove[] {
    const initial = this.#options.initialState;
    const moves: MarkdownBrowserMove[] = [];
    for (const [id, line] of Object.entries(initial?.positions ?? {})) {
      moves.push({
        kind: "reveal",
        readingId: markdownBrowserReadingId(id),
        target: { scroll: line },
      });
    }
    for (const [id, link] of Object.entries(initial?.links ?? {})) {
      moves.push({
        kind: "reveal",
        readingId: markdownBrowserReadingId(id),
        target: { link },
      });
    }
    return [...moves, ...this.#contentsMoves()];
  }

  /** The contents selection the next screen applies, once. */
  #contentsMoves(): readonly MarkdownBrowserMove[] {
    if (this.place.kind !== "contents" || this.#pendingSelect === undefined) {
      return [];
    }
    const itemId = this.#pendingSelect;
    this.#pendingSelect = undefined;
    return [{ kind: "select", itemId }];
  }

  /** Remember the contents selection, which a resumed browser restores. */
  selected(listId: string, itemId: string | undefined): void {
    if (listId === MARKDOWN_BROWSER_CONTENTS && itemId !== undefined) {
      this.#selected = itemId;
    }
  }

  /** Where the reader is, for a later browser to resume. */
  resumable(state: TerminalApplicationState): MarkdownBrowserResumableState {
    const positions: Record<string, number> = {};
    const links: Record<string, string> = {};
    for (const id of this.#read) {
      const reading = markdownBrowserReadingId(id);
      const line = state.readingScroll[reading];
      if (line !== undefined) positions[id] = line;
      const link = state.readingFocus[reading];
      if (link !== undefined) links[id] = link;
    }
    return Object.freeze({
      history: Object.freeze([...this.#history]),
      ...(this.#selected === undefined ? {} : { selectedId: this.#selected }),
      ...(Object.keys(positions).length === 0
        ? {}
        : { positions: Object.freeze(positions) }),
      ...(Object.keys(links).length === 0
        ? {}
        : { links: Object.freeze(links) }),
    });
  }

  /** The view for where the reader is. */
  view(): TerminalApplicationView<MarkdownBrowserStep> {
    const place = this.place;
    const document = place.kind === "document"
      ? this.#document(place.id)
      : undefined;
    const back = this.#history.length > 1;
    const right: KeyHint[] = [
      ...(back ? [{ key: "escape", label: this.copy.back }] : []),
      { key: "q", label: this.copy.close },
    ];
    const label = this.#options.label;
    return {
      header: document === undefined
        ? { leading: [{ text: label, role: "title" }] }
        : {
          leading: [
            { text: label, tone: "muted" },
            { text: "  ›  ", ascii: "  >  ", tone: "faint" },
            { text: document.label, role: "title" },
          ],
          ...(this.#options.showPaths === true
            ? {
              trailing: [{ text: document.path, tone: "faint" as const }],
              // The document's title outranks its path.
              yields: "trailing" as const,
            }
            : {}),
        },
      body: document === undefined ? this.#contents() : {
        kind: "reading",
        id: markdownBrowserReadingId(document.id),
        content: this.#markdownOf(document.id),
      },
      ...(this.#message === undefined ? {} : { message: this.#message }),
      footer: document === undefined
        ? {
          left: [
            { key: "enter", label: this.copy.open },
            { key: "/", label: this.copy.search },
          ],
          right,
        }
        : {
          left: [
            { key: "/", label: this.copy.search },
            { key: "c", label: this.copy.contents },
          ],
          right,
        },
      ...(this.#searching ? { layers: [this.#palette()] } : {}),
      windowTitle: document === undefined
        ? label
        : `${document.label} · ${label}`,
      ...(this.#options.mouse === true ? { input: { mouse: true } } : {}),
      tooSmallHints: [{ key: "q", label: this.copy.close }],
      ...(this.#applicationCopy === undefined
        ? {}
        : { copy: this.#applicationCopy }),
    };
  }

  #document(id: string): MarkdownBrowserDocument {
    const choice = this.corpus.choices.get(id);
    if (choice?.kind !== "document") {
      throw new TypeError(`Markdown browser has no document ${id}`);
    }
    return choice;
  }

  #markdownOf(id: string): ApplicationMarkdown {
    const markdown = this.#markdown.get(id);
    if (markdown === undefined) {
      throw new TypeError(`Markdown browser has no document ${id}`);
    }
    return markdown;
  }

  #marker(choice: MarkdownBrowserChoice<Action>): ApplicationGlyph {
    if (choice.kind === "action") return MARKERS.action;
    if (choice.kind === "exit") return MARKERS.exit;
    return MARKERS.document;
  }

  /** The detail beside a contents row: what it is, then the document itself. */
  #preview(
    choice: MarkdownBrowserChoice<Action>,
  ): readonly ApplicationDetailBlock[] {
    const known = this.#previews.get(choice.id);
    if (known !== undefined) return known;
    // The title and description stand together as the preview's head, so
    // the description never reads as the document's first paragraph.
    const blocks: ApplicationDetailBlock[] = [{
      kind: "heading",
      title: choice.label,
      ...(choice.description === undefined
        ? {}
        : { subtitle: choice.description }),
      ...(choice.kind === "document" && this.#options.showPaths === true
        ? { aside: [{ text: choice.path, tone: "faint" as const }] }
        : {}),
    }];
    // The document reads as it will when opened, its headings keeping
    // with their first lines.
    if (choice.kind === "document") blocks.push(this.#previewMarkdown(choice));
    this.#previews.set(choice.id, blocks);
    return blocks;
  }

  /**
   * A document as its preview reads it: without its opening title when
   * that title says what the preview's own title says, so it shows once.
   */
  #previewMarkdown(document: MarkdownBrowserDocument): ApplicationMarkdown {
    const markdown = this.#markdownOf(document.id);
    const leading = markdownLeadingTitle(markdown.source);
    return leading !== undefined &&
        sameWords(leading.title, document.label)
      ? Object.freeze({ ...markdown, source: leading.rest })
      : markdown;
  }

  #strip(choice: MarkdownBrowserChoice<Action>): ApplicationDetailStrip {
    const marker = this.#marker(choice);
    return {
      title: [
        ...(choice.kind === "document" ? [] : [
          {
            text: marker.unicode,
            ascii: marker.ascii,
            ...(marker.tone === undefined ? {} : { tone: marker.tone }),
          },
          { text: " " },
        ]),
        { text: choice.label, role: "title" },
      ],
      facts: [
        ...(choice.description === undefined
          ? []
          : [[{ text: choice.description }]]),
        ...(choice.kind === "document" && this.#options.showPaths === true
          ? [[{ text: choice.path, tone: "faint" as const }]]
          : []),
      ],
    };
  }

  #contents(): TerminalApplicationView<MarkdownBrowserStep>["body"] {
    const choices = [...this.corpus.choices.values()];
    const groups: ApplicationListGroup<MarkdownBrowserStep>[] = this.corpus
      .groups.map((group) => ({
        id: group.heading === undefined
          ? "group:"
          : `group:${group.heading.id}`,
        title: group.heading?.label ?? this.copy.contents,
        ...(group.heading?.description === undefined
          ? {}
          : { aside: [{ text: group.heading.description }] }),
        items: group.choices.map((choice) => ({
          id: choice.id,
          title: choice.label,
          marker: this.#marker(choice),
          primary: { kind: "open", id: choice.id },
        })),
      }));
    return {
      kind: "master-detail",
      list: { id: MARKDOWN_BROWSER_CONTENTS, groups },
      detail: {
        follows: MARKDOWN_BROWSER_CONTENTS,
        content: Object.fromEntries(
          choices.map((choice) => [choice.id, this.#preview(choice)]),
        ),
        strip: Object.fromEntries(
          choices.map((choice) => [choice.id, this.#strip(choice)]),
        ),
      },
    };
  }

  /**
   * Search over every entry, a document once however many groups list it:
   * its first listing stands for the rest. Paths match only where they show.
   */
  #palette(): ApplicationPalette<MarkdownBrowserStep> {
    const listed = new Set<string>();
    const paths = this.#options.showPaths === true;
    return {
      kind: "palette",
      id: MARKDOWN_BROWSER_SEARCH,
      scope: "global",
      placeholder: this.#options.placeholder ?? this.copy.searchPlaceholder,
      sections: this.corpus.groups.map((group) => ({
        title: group.heading?.label ?? this.copy.contents,
        items: group.choices.flatMap((
          choice,
        ): ApplicationPaletteItem<MarkdownBrowserStep>[] => {
          if (choice.kind === "document") {
            if (listed.has(choice.path)) return [];
            listed.add(choice.path);
          }
          return [{
            id: choice.id,
            label: choice.label,
            ...(choice.description === undefined
              ? {}
              : { context: choice.description }),
            ...(choice.kind === "document" && paths
              ? { keywords: choice.path }
              : {}),
            action: { kind: "open", id: choice.id },
          }];
        }),
      })).filter((section) => section.items.length > 0),
    };
  }

  #notice(text: string): void {
    this.#messages += 1;
    this.#message = {
      id: `notice-${this.#messages}`,
      tone: "warning",
      runs: [{ text: text.replace(/[\p{Cc}\p{Cf}]+/gu, " ").trim() }],
      dismiss: { afterMs: 6000, onKey: true },
    };
  }

  /** Go to a document, unless it is already open; a fragment names where. */
  #go(id: string, heading?: string): readonly MarkdownBrowserMove[] {
    this.#searching = false;
    this.#read.add(id);
    const readingId = markdownBrowserReadingId(id);
    const place = this.place;
    if (place.kind !== "document" || place.id !== id) {
      this.#history.push({ kind: "document", id });
    }
    return [{
      kind: "reveal",
      readingId,
      target: heading === undefined ? { scroll: 0 } : { heading },
    }];
  }

  /** Answer one of the browser's own actions. */
  step(
    step: MarkdownBrowserStep,
    state: TerminalApplicationState,
  ): MarkdownBrowserOutcome<Action> {
    switch (step.kind) {
      case "open":
        return this.#open(step.id, state);
      case "search":
        this.#searching = !this.#searching;
        return {};
      case "contents":
        this.#searching = false;
        if (this.place.kind === "contents") return {};
        this.#pendingSelect = this.place.id;
        this.#history.push(CONTENTS);
        return { moves: this.#contentsMoves() };
      case "back": {
        if (this.#history.length <= 1) return { close: {} };
        const left = this.#history.pop();
        if (left?.kind === "document") this.#pendingSelect = left.id;
        return { moves: this.#contentsMoves() };
      }
      case "close":
        return { close: {} };
    }
  }

  #open(
    id: string,
    state: TerminalApplicationState,
  ): MarkdownBrowserOutcome<Action> {
    const choice = this.corpus.choices.get(id);
    if (choice === undefined) return {};
    this.#searching = false;
    switch (choice.kind) {
      case "document":
        return { moves: this.#go(id) };
      case "action":
        return {
          result: Object.freeze({
            kind: "action",
            id,
            value: choice.value,
            state: this.resumable(state),
          }),
        };
      case "exit":
        return {
          close: {
            exit: Object.freeze({
              kind: "exit",
              id,
              state: this.resumable(state),
            }),
          },
        };
    }
  }

  /** Whether a document has a heading, by its id or a `#` fragment. */
  #hasHeading(documentId: string, fragment: string): string | undefined {
    const heading = fragmentHeading(
      fragment.startsWith("#") ? fragment : `#${fragment}`,
    );
    if (heading === undefined) return undefined;
    let known = this.#headings.get(documentId);
    if (known === undefined) {
      const markdown = this.#markdownOf(documentId);
      known = new Set(
        renderMarkdownCliProjection(
          {
            source: markdown.source,
            ...(markdown.diagrams === undefined
              ? {}
              : { diagrams: markdown.diagrams }),
            ...(markdown.charts === undefined
              ? {}
              : { charts: markdown.charts }),
          },
          { colorDepth: "none", columns: 80, unicode: true },
        ).headings.map((entry) => entry.id),
      );
      this.#headings.set(documentId, known);
    }
    return known.has(heading) ? heading : undefined;
  }

  /** Answer a link a reader followed out of a document. */
  link(
    link: TerminalApplicationLink,
    state: TerminalApplicationState,
  ): MarkdownBrowserOutcome<Action> {
    const place = this.place;
    if (place.kind !== "document") return {};
    const source = this.#document(place.id);
    const resolution = resolveMarkdownBrowserLink({
      sourceDocumentId: source.id,
      sourcePath: source.path,
      destination: link.destination,
      availableDocuments: this.corpus.documents,
    }, this.#options.resolveLink);
    switch (resolution.kind) {
      case "unresolved":
        this.#notice(resolution.message ?? this.copy.unresolvedLink);
        return {};
      case "fragment": {
        const heading = this.#hasHeading(source.id, resolution.fragment);
        if (heading === undefined) {
          this.#notice(this.copy.headingNotFound);
          return {};
        }
        return {
          moves: [{
            kind: "reveal",
            readingId: markdownBrowserReadingId(source.id),
            target: { heading },
          }],
        };
      }
      case "document": {
        if (
          this.corpus.choices.get(resolution.documentId)?.kind !== "document"
        ) {
          this.#notice(this.copy.documentNotFound);
          return {};
        }
        const heading = resolution.fragment === undefined
          ? undefined
          : this.#hasHeading(resolution.documentId, resolution.fragment);
        if (resolution.fragment !== undefined && heading === undefined) {
          this.#notice(this.copy.headingNotFound);
          return {};
        }
        return { moves: this.#go(resolution.documentId, heading) };
      }
      case "external":
        return {
          result: Object.freeze({
            kind: "external-link",
            id: `${source.id}:${link.linkId}`,
            destination: resolution.destination,
            sourceDocumentId: source.id,
            sourcePath: source.path,
            state: this.resumable(state),
          }),
        };
    }
  }

  /** The package hid a dismissed message or the search; the view drops it. */
  dismiss(target: TerminalApplicationDismissTarget): void {
    if ("layer" in target) {
      if (target.layer === MARKDOWN_BROWSER_SEARCH) this.#searching = false;
    } else if (this.#message?.id === target.message) {
      this.#message = undefined;
    }
  }

  /** A command the caller ran for the reader failed; say why. */
  failed(error: unknown): void {
    const text = error instanceof Error ? error.message : String(error);
    this.#notice(text === "" ? this.copy.unresolvedLink : text);
  }
}
