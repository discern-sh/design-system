/**
 * The caller's side of a terminal application: an immutable view built from
 * a header bar, one body, an optional message line, key hints, and modal
 * layers. The view names content and meaning; the package owns focus,
 * selection, scrolling, folds, filtering, fields, layout, and painting.
 *
 * @module
 */

import type { CliBlock } from "../../block-composition.ts";
import type { MarkdownChartResource } from "../../../chart/markdown.ts";
import type { MarkdownDiagramResource } from "../../../diagram/markdown.ts";
import type { KeyChord, KeyHint, KeyHints } from "../../key-hints.ts";
import type { TerminalTextTone } from "../../theme.ts";
import type { TerminalApplicationCopy } from "./copy.ts";
import type { ApplicationLayer } from "./layer-view.ts";

/**
 * One run of styled text. The role sets the treatment — `title` and `key`
 * are bold, `label` defaults to faint, `code` is bold — and the tone, when
 * given, sets the colour. Text is plain and control-free.
 */
export interface ApplicationRun {
  /** The run's words; with `clock`, what a frame without a time shows. */
  readonly text: string;
  readonly tone?: TerminalTextTone;
  readonly role?: "title" | "body" | "label" | "key" | "code";
  /** Replacement without Unicode; an empty string drops the run. */
  readonly ascii?: string;
  /**
   * Show the time elapsed since a moment instead of `text`, painted from
   * the same clock time as every other clock on screen and repainted each
   * second while it shows, so a caller never rebuilds its view to tick it.
   */
  readonly clock?: ApplicationRunClock;
}

/** Elapsed time a run shows, measured on the application's clock. */
export interface ApplicationRunClock {
  /** When the time began, in the application clock's milliseconds. */
  readonly since: number;
  /**
   * `clock`, the default, reads `0:07` and `12:05`; `duration` reads
   * `7s` under a minute and as a clock after.
   */
  readonly format?: "clock" | "duration";
}

/**
 * A one-cell mark such as an item's state. Both forms are one cell; a
 * spinner glyph moves through the bound motif while it is visible.
 */
export interface ApplicationGlyph {
  readonly unicode: string;
  readonly ascii: string;
  readonly tone?: TerminalTextTone;
  readonly animation?: "spinner";
}

/** How fresh the screen's data is, as the header's last word shows it. */
export type ApplicationLivenessState = "idle" | "busy" | "retrying" | "stale";

/**
 * The header's liveness word. The caller names each state; the package
 * draws busy with a moving spinner, stale with an attention mark, and shows
 * busy only once it has lasted `busyAfterMs`, so quick refreshes never
 * flicker.
 */
export interface ApplicationLiveness {
  readonly state: ApplicationLivenessState;
  readonly labels: Readonly<Record<ApplicationLivenessState, string>>;
  readonly busyAfterMs?: number;
}

/** One compact fact on the header's right, optionally bound to an action. */
export interface ApplicationHeaderChip<A> {
  readonly runs: readonly ApplicationRun[];
  readonly action?: A;
}

/**
 * The first row: identity on the left, then chips, counts, and liveness on
 * the right. While a list filter is being edited the left side becomes the
 * filter field.
 */
export interface ApplicationHeader<A> {
  readonly leading: readonly ApplicationRun[];
  readonly chips?: readonly ApplicationHeaderChip<A>[];
  readonly trailing?: readonly ApplicationRun[];
  readonly liveness?: ApplicationLiveness;
  /**
   * Which side gives way first once the chips are gone. `leading`, the
   * default, closes the leading runs' wide gaps and shortens them to eight
   * cells before the trailing runs drop, as an identity beside counts
   * wants; `trailing` drops the trailing runs while the leading runs stay
   * whole, as a title beside its path wants. The liveness word goes last
   * either way.
   */
  readonly yields?: "leading" | "trailing";
}

/** Cell gaps around a list row's trailing columns. */
export interface ApplicationListGaps {
  /** Cells between the title and the first column. */
  readonly afterTitle: number;
  /** Cells between two columns. */
  readonly between: number;
  /** Cells after the last column. */
  readonly pad: number;
}

/**
 * Roomy and tight gaps. A list is roomy beside a wide detail, or when it
 * fills a terminal at least `tightBelowColumns` wide; otherwise it is tight.
 */
export interface ApplicationListSpacing {
  readonly roomy: ApplicationListGaps;
  readonly tight: ApplicationListGaps;
  readonly tightBelowColumns?: number;
}

/** One trailing, aligned column of a list row. */
export interface ApplicationListColumn {
  readonly id: string;
  readonly width: number;
  readonly align?: "start" | "end";
  /**
   * Columns drop lowest priority first while the title would be narrower
   * than the list's `minTitle`; a column without a priority never drops.
   */
  readonly priority?: number;
}

/** How typing narrows a list. */
export interface ApplicationListFilter {
  /** The field's label, shown before the typed text, such as `Filter`. */
  readonly label: string;
  /** Item text the filter searches; defaults to both. */
  readonly fields?: readonly ("title" | "keywords")[];
  /** Substring (the default) or in-order fuzzy matching. */
  readonly match?: "substring" | "fuzzy";
}

/**
 * Which groups fold into a summary row when the list does not fit. Groups
 * fold in `foldOrder` (by default bottom-up); `neverFold` groups and the
 * group holding the selection never fold. Without `density` nothing folds.
 */
export interface ApplicationListDensity {
  readonly foldOrder?: readonly string[];
  readonly neverFold?: readonly string[];
}

/** One selectable row. */
export interface ApplicationListItem<A> {
  readonly id: string;
  readonly title: string;
  /** Faint text kept after the title when it truncates, such as an id. */
  readonly titleSuffix?: string;
  readonly marker: ApplicationGlyph;
  /** Runs for each declared column, by column id. */
  readonly cells?: Readonly<Record<string, readonly ApplicationRun[]>>;
  /** The action Enter runs. */
  readonly primary?: A;
  /** Text only the filter searches. */
  readonly keywords?: string;
}

/** One group of items under a header. Empty groups are not shown. */
export interface ApplicationListGroup<A> {
  readonly id: string;
  readonly title: string;
  /** The name a summary row uses; defaults to the title. */
  readonly shortTitle?: string;
  /** The header's count; defaults to the number of items. */
  readonly count?: number;
  /** A foldable group's header is selectable, and Enter folds or unfolds it. */
  readonly foldable?: boolean;
  /** Fold the group the first time it appears. */
  readonly initiallyFolded?: boolean;
  /** Faint text after the header's count. */
  readonly aside?: readonly ApplicationRun[];
  readonly items: readonly ApplicationListItem<A>[];
}

/**
 * A list of groups with identity-anchored selection. The id stays stable
 * across updates; the package remembers selection, filter, folds, zoom, and
 * scroll by it.
 */
export interface ApplicationList<A> {
  readonly id: string;
  readonly groups: readonly ApplicationListGroup<A>[];
  readonly columns?: readonly ApplicationListColumn[];
  /** Title cells kept before columns drop; defaults to 16. */
  readonly minTitle?: number;
  readonly spacing?: ApplicationListSpacing;
  /** Offer `/` to filter. */
  readonly filter?: ApplicationListFilter;
  readonly density?: ApplicationListDensity;
  /**
   * Membership and order changes wait until no key has been pressed for this
   * long, so a row never moves under a moving selection; content updates at
   * once. Defaults to 1500 ms.
   */
  readonly settleMs?: number;
}

/** A title, with an aside beside it on wide screens and in zoom. */
export interface ApplicationHeadingBlock {
  readonly kind: "heading";
  readonly title: string;
  /** Right-aligned on wide screens and in zoom, otherwise on its own line. */
  readonly aside?: readonly ApplicationRun[];
  readonly subtitle?: string;
}

/** A state: a glyph, a bold toned label, and a muted qualifier. */
export interface ApplicationStateBlock {
  readonly kind: "state";
  readonly glyph: ApplicationGlyph;
  readonly label: string;
  readonly tone: TerminalTextTone;
  readonly qualifier?: string;
}

/** Muted sentences. */
export interface ApplicationTextBlock {
  readonly kind: "text";
  readonly runs: readonly ApplicationRun[];
}

/** Labelled values in a label column that grows to the longest label. */
export interface ApplicationFactsBlock {
  readonly kind: "facts";
  readonly rows: readonly {
    readonly label: string;
    /** One entry per line. */
    readonly value: readonly (readonly ApplicationRun[])[];
  }[];
}

/** A meter and its caption. */
export interface ApplicationMeterBlock {
  readonly kind: "meter";
  readonly value: number;
  readonly max?: number;
  readonly caption: string;
}

/** Consequence lines, each with a mark. */
export interface ApplicationMarksBlock {
  readonly kind: "marks";
  readonly items: readonly ApplicationDetailMark[];
  /**
   * Draw each item as its mark, one space, and its text, with the item's
   * `lines` starting at the text's own column, as a compact evidence list
   * in a narrow detail column wants. By default a mark stands two spaces
   * from its text and its lines hang two cells further in, as a sheet's
   * consequences read.
   */
  readonly compact?: boolean;
}

/** Keys and what they do, shown at the wide tier, in the split and in zoom alike. */
export interface ApplicationHintsBlock {
  readonly kind: "hints";
  readonly items: readonly {
    readonly key: KeyChord | readonly KeyChord[];
    readonly label: string;
    readonly description?: string;
    readonly primary?: boolean;
  }[];
}

/** Aligned rows: a lead cell, text, and trailing columns. */
export interface ApplicationRowsBlock {
  readonly kind: "rows";
  /** A fixed column before the text, such as a short id. */
  readonly lead?: ApplicationListColumn;
  /** Trailing aligned columns, dropping by priority like a list's. */
  readonly columns?: readonly ApplicationListColumn[];
  readonly items: readonly ApplicationDetailRow[];
}

/** Any Component block, such as a diffstat or rendered Markdown. */
export interface ApplicationComponentBlock {
  readonly kind: "block";
  readonly content: CliBlock;
}

/** A placeholder while content loads. */
export interface ApplicationPendingBlock {
  readonly kind: "pending";
  readonly label: string;
}

/**
 * A titled group of blocks, one level deep. The title shows only while one
 * of its blocks renders lines: a section whose blocks all render nothing at
 * a width, such as hints below the wide tier, renders nothing either.
 */
export interface ApplicationSectionBlock {
  readonly kind: "section";
  readonly title: string;
  readonly count?: number;
  readonly caption?: string;
  readonly blocks: readonly ApplicationDetailBlock[];
}

/** A detail or sheet block. Every block renders at the width it is given. */
export type ApplicationDetailBlock =
  | ApplicationHeadingBlock
  | ApplicationStateBlock
  | ApplicationTextBlock
  | ApplicationFactsBlock
  | ApplicationMeterBlock
  | ApplicationMarksBlock
  | ApplicationHintsBlock
  | ApplicationRowsBlock
  | ApplicationComponentBlock
  | ApplicationPendingBlock
  | ApplicationSectionBlock;

/**
 * One consequence line: a one-cell mark, its text, and indented lines that
 * belong to it, such as the files a step touched.
 */
export interface ApplicationDetailMark {
  readonly mark: ApplicationGlyph;
  readonly runs: readonly ApplicationRun[];
  /**
   * Lines under the text, each wrapped on its own: two cells further in
   * than the text, or at its column in a `compact` block.
   */
  readonly lines?: readonly (readonly ApplicationRun[])[];
}

/**
 * One aligned row: an optional lead cell, text that takes the remaining
 * width, and cells for the block's trailing columns.
 */
export interface ApplicationDetailRow {
  readonly lead?: readonly ApplicationRun[];
  readonly text: readonly ApplicationRun[];
  readonly cells?: Readonly<Record<string, readonly ApplicationRun[]>>;
}

/** The compact summary a narrow screen shows above the footer. */
export interface ApplicationDetailStrip {
  readonly title: readonly ApplicationRun[];
  /** Whole facts, each kept or dropped as one. */
  readonly facts: readonly (readonly ApplicationRun[])[];
}

/**
 * Read-only detail that follows a list's selection. It never takes focus:
 * Page Up and Page Down scroll it, Shift+Up and Shift+Down move it a line,
 * and Space zooms it to the full body while Up and Down keep walking items.
 */
export interface ApplicationDetail {
  /** The id of the list it follows. */
  readonly follows: string;
  /** Blocks by item id; an item without content shows `pending`. */
  readonly content: Readonly<Record<string, readonly ApplicationDetailBlock[]>>;
  readonly strip?: Readonly<Record<string, ApplicationDetailStrip>>;
  /** Replaces the zoom breadcrumb's default group and item titles. */
  readonly breadcrumb?: Readonly<Record<string, readonly ApplicationRun[]>>;
  /** What an item without content shows; defaults to "Loading…". */
  readonly pending?: string;
}

/**
 * How a master-detail body divides the width. At `wideAtColumns` and above
 * the list sits beside a wide detail; from `collapseBelowColumns` it sits
 * beside a standard detail; below that the list fills the width and the
 * detail becomes a strip above the footer, reached in full with Space.
 */
export interface ApplicationSplitRules {
  readonly wideAtColumns: number;
  readonly collapseBelowColumns: number;
  /**
   * `content` sizes the list to its longest title (capped at `maxTitle`,
   * and never below the list's `minTitle`, so no column drops at that
   * width) and columns, never below `min`; `share` takes a fraction of the
   * width.
   * Neither squeezes the detail below its minimum.
   */
  readonly list:
    | {
      readonly sizing: "content";
      readonly min: number;
      readonly maxTitle: number;
    }
    | {
      readonly sizing: "share";
      readonly share: number;
      readonly min: number;
      readonly max: number;
    };
  readonly detailMin: { readonly standard: number; readonly wide: number };
  /** Left and right cells inside the detail. */
  readonly detailPadding: {
    readonly standard: readonly [number, number];
    readonly wide: readonly [number, number];
  };
  /** Below this many rows the strip is one line and the detail loses its top padding. */
  readonly strip: { readonly shortBelowRows: number };
}

/** A grouped list with a detail that follows its selection. */
export interface ApplicationMasterDetailBody<A> {
  readonly kind: "master-detail";
  readonly list: ApplicationList<A>;
  readonly detail: ApplicationDetail;
  readonly split?: ApplicationSplitRules;
  /**
   * The footer while the detail is zoomed. By default the package adds
   * Up and Down after the primary hint and a Back hint on the right.
   */
  readonly zoomFooter?: KeyHints;
}

/** A grouped list on its own. */
export interface ApplicationListBody<A> {
  readonly kind: "list";
  readonly list: ApplicationList<A>;
}

/**
 * A Markdown document the package renders, centred at its readable
 * measure. Its links are controls: Tab and Shift+Tab reach them, Enter
 * follows the focused one, and a click follows the one under it. A link
 * to a heading in the same document scrolls there; every other link
 * reaches `onLink`.
 */
export interface ApplicationMarkdown {
  readonly kind: "markdown";
  /** Untrusted CommonMark/GFM source, rendered by the package's Markdown authority. */
  readonly source: string;
  /** Explicit image resources eligible for Diagram promotion. */
  readonly diagrams?: readonly MarkdownDiagramResource[];
  /** Explicit image resources eligible for Chart promotion. */
  readonly charts?: readonly MarkdownChartResource[];
  /** The readable measure in cells, at least 16; defaults to 72. */
  readonly measure?: number;
}

/**
 * One scrolling document, remembered by id: a Component block, or Markdown
 * whose links a reader can follow.
 */
export interface ApplicationReadingBody {
  readonly kind: "reading";
  readonly id: string;
  readonly content: CliBlock | ApplicationMarkdown;
}

/**
 * A key hint that runs an action itself: an empty body's primary, which
 * Enter runs, or a reader's own key.
 */
export interface ApplicationActionHint<A> {
  readonly key: KeyChord;
  readonly label: string;
  readonly action: A;
}

/**
 * Nothing to list yet: a title, a short explanation, the one thing to do
 * next, and optionally a list below (such as folded groups).
 */
export interface ApplicationEmptyBody<A> {
  readonly kind: "empty";
  readonly title: string;
  readonly body: readonly ApplicationRun[];
  /** Selected first; Enter runs its action. */
  readonly primary: ApplicationActionHint<A>;
  /** Further keys to show; each must be bound, like every advertised key. */
  readonly secondary?: readonly KeyHint[];
  readonly list?: ApplicationList<A>;
}

/** The region between the header and the footer. */
export type ApplicationBody<A> =
  | ApplicationMasterDetailBody<A>
  | ApplicationListBody<A>
  | ApplicationReadingBody
  | ApplicationEmptyBody<A>;

/**
 * One row above the footer, shown only while present. It dismisses after
 * `afterMs`, at the next key when `onKey` is set, or with Escape; each
 * dismissal is reported through `onDismiss`, and the next view must omit it.
 */
export interface ApplicationMessage {
  readonly id: string;
  /** Tone for runs that set none; defaults to muted. */
  readonly tone?: TerminalTextTone;
  readonly runs: readonly ApplicationRun[];
  readonly trailing?: readonly ApplicationRun[];
  readonly dismiss?: { readonly afterMs?: number; readonly onKey?: boolean };
  /**
   * Show the message only where its runs and trailing runs fit the message
   * line whole, and never in the footer's place on a short screen, as a
   * teaching line that reads only whole wants. While it is not shown,
   * Escape passes it by and state reports omit it; its dismissal timer and
   * key still apply. A required message — a warning, a toast — is cut to
   * fit and takes the footer's place on a short screen.
   */
  readonly optional?: boolean;
}

/** Input preferences a view carries. */
export interface TerminalApplicationInputPreferences {
  /**
   * Report mouse clicks and the wheel while this view is shown. Off by
   * default; turning it on shows the selection hint once.
   */
  readonly mouse?: boolean;
  /**
   * The message shown once when mouse input turns on, naming how to select
   * text natively; defaults to `Shift-drag to select text`.
   */
  readonly selectionHint?: readonly ApplicationRun[];
}

/** Caller-authored screen contents. Replace the value to update the screen. */
export interface TerminalApplicationView<A> {
  readonly header: ApplicationHeader<A>;
  readonly body: ApplicationBody<A>;
  readonly message?: ApplicationMessage;
  /**
   * Key hints while no layer is open; layers show their own. Hints only
   * name keys: each must be one the body reserves, Escape, Ctrl+C, or a
   * base keymap binding, so the footer never advertises a key that does
   * nothing.
   */
  readonly footer: KeyHints;
  /**
   * Modal layers, bottom to top, at most two. Only the view opens or removes
   * one: the package reports a dismissal through `onDismiss` and hides the
   * layer at once, and the view that follows must omit it.
   */
  readonly layers?: readonly ApplicationLayer<A>[];
  /** Plain text for the terminal's window title. */
  readonly windowTitle?: string;
  /** Runtime preferences; mouse input stays off unless requested. */
  readonly input?: TerminalApplicationInputPreferences;
  /**
   * Hints the too-small notice shows beneath the size it needs, such as a
   * way to quit. Each must name a base binding, which still runs there.
   */
  readonly tooSmallHints?: readonly KeyHint[];
  /**
   * Replacements for the words the package writes — generated hint
   * labels, empty states, counts, the challenge hint, the too-small notice
   * — over its English defaults.
   */
  readonly copy?: Partial<TerminalApplicationCopy>;
}

/**
 * One caller key binding. Keys are spelled as the key decoder names them
 * (`ctrl-k`, `page-down`) or as one character (`n`, `D`); `normalizeKeyChord`
 * also accepts `ctrl+k`. Base entries apply while no layer is open and the
 * list owns input; `{ layer }` entries apply while that layer is on top.
 * `inFields` entries also apply while a text field owns input, and must be
 * non-printing chords outside `APPLICATION_EDITOR_KEYS`.
 */
export interface ApplicationKeyBinding<A> {
  readonly key: KeyChord;
  readonly action: A;
  readonly scope?: "base" | { readonly layer: string };
  readonly inFields?: boolean;
}

/** The split the package uses when a master-detail body declares none. */
export const DEFAULT_APPLICATION_SPLIT_RULES: ApplicationSplitRules = Object
  .freeze({
    wideAtColumns: 100,
    collapseBelowColumns: 80,
    list: Object.freeze({ sizing: "content", min: 36, maxTitle: 32 } as const),
    detailMin: Object.freeze({ standard: 39, wide: 48 }),
    detailPadding: Object.freeze({
      standard: Object.freeze([2, 1] as const),
      wide: Object.freeze([3, 2] as const),
    }),
    strip: Object.freeze({ shortBelowRows: 14 }),
  });

/** List gaps when a list declares none. */
export const DEFAULT_APPLICATION_LIST_SPACING: ApplicationListSpacing = Object
  .freeze({
    roomy: Object.freeze({ afterTitle: 1, between: 2, pad: 2 }),
    tight: Object.freeze({ afterTitle: 1, between: 1, pad: 1 }),
    tightBelowColumns: 56,
  });

/** Title cells kept before a list drops a column, when a list declares none. */
export const DEFAULT_APPLICATION_LIST_MIN_TITLE = 16;

/** Key idle before membership changes apply, when a list declares none. */
export const DEFAULT_APPLICATION_SETTLE_MS = 1500;
