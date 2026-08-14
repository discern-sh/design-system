/**
 * Driver-independent visual state shapes for future interactive CLI renderers.
 *
 * @module
 */

/** Lifecycle shared by active, failed, submitted, and cancelled interaction frames. */
export type InteractiveFrameLifecycle =
  | { readonly status: "active" }
  | { readonly status: "validation-error"; readonly message: string }
  | { readonly status: "submitted" }
  | { readonly status: "cancelled"; readonly reason: string };

/** Facts common to every labeled interactive frame. */
export interface InteractiveFrameBase {
  readonly label: string;
  readonly lifecycle: InteractiveFrameLifecycle;
  readonly hint?: string;
}

/** Visual state for one editable line of text. */
export interface TextInputFrameState extends InteractiveFrameBase {
  readonly kind: "text-input";
  readonly value: string;
  /** Grapheme index at which the cursor is drawn. */
  readonly cursor: number;
  readonly placeholder?: string;
}

/** Visual state for one editable secret whose raw value is never rendered. */
export interface MaskedInputFrameState extends InteractiveFrameBase {
  readonly kind: "masked-input";
  readonly valueLength: number;
  /** Grapheme index at which the cursor is drawn. */
  readonly cursor: number;
  readonly placeholder?: string;
}

/** Visual state for a yes/no confirmation. */
export interface ConfirmFrameState extends InteractiveFrameBase {
  readonly kind: "confirm";
  readonly value: boolean;
  readonly yesLabel: string;
  readonly noLabel: string;
}

/** One addressable option displayed by selection-like frames. */
export interface InteractiveChoiceState {
  /** Optional explicit discriminant; omitted choices remain source-compatible. */
  readonly kind?: "choice";
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
}

/** One non-selectable semantic group heading in a selection-like frame. */
export interface InteractiveChoiceGroupHeadingState {
  readonly kind: "group-heading";
  readonly id: string;
  readonly label: string;
  /** Group headings are structural rather than disabled choices. */
  readonly disabled?: never;
}

/** Every value or semantic heading displayed by a selection-like frame. */
export type InteractiveChoiceEntryState =
  | InteractiveChoiceState
  | InteractiveChoiceGroupHeadingState;

/** Visual state for selecting exactly one option. */
export interface SelectFrameState extends InteractiveFrameBase {
  readonly kind: "select";
  readonly options: readonly InteractiveChoiceEntryState[];
  readonly highlightedIndex: number;
  readonly selectedId?: string;
  readonly visibleStart?: number;
  readonly visibleCount?: number;
}

/** Visual state for selecting zero or more options. */
export interface MultiselectFrameState extends InteractiveFrameBase {
  readonly kind: "multiselect";
  readonly options: readonly InteractiveChoiceEntryState[];
  readonly highlightedIndex: number;
  readonly selectedIds: readonly string[];
  readonly visibleStart?: number;
  readonly visibleCount?: number;
}

/** Visual state for a query and its selectable result set. */
export interface SearchFrameState extends InteractiveFrameBase {
  readonly kind: "search";
  readonly query: string;
  /** Grapheme index at which the query cursor is drawn. */
  readonly cursor: number;
  readonly results: readonly InteractiveChoiceEntryState[];
  readonly highlightedIndex?: number;
  readonly placeholder?: string;
  /** A provider call is scheduled or in flight; the results shown answer an earlier query. */
  readonly pending?: boolean;
}

/**
 * Visual state for a query-filtered multiselection. Entries the query no
 * longer returns but the person has selected stay visible — composed after
 * the results — so selection state never silently drops.
 */
export interface SearchMultiselectFrameState extends InteractiveFrameBase {
  readonly kind: "search-multiselect";
  readonly query: string;
  /** Grapheme index at which the query cursor is drawn. */
  readonly cursor: number;
  readonly results: readonly InteractiveChoiceEntryState[];
  readonly selectedIds: readonly string[];
  readonly highlightedIndex?: number;
  readonly placeholder?: string;
  /** A provider call is scheduled or in flight; the results shown answer an earlier query. */
  readonly pending?: boolean;
}

/** Visual state for editable text with a highlighted completion candidate. */
export interface AutocompleteFrameState extends InteractiveFrameBase {
  readonly kind: "autocomplete";
  readonly value: string;
  /** Grapheme index at which the input cursor is drawn. */
  readonly cursor: number;
  readonly suggestions: readonly string[];
  readonly highlightedIndex: number;
  readonly placeholder?: string;
  /** A provider call is scheduled or in flight; the suggestions shown answer an earlier value. */
  readonly pending?: boolean;
}

/** Visual state for a message acknowledged by a single continue action. */
export interface AcknowledgementFrameState extends InteractiveFrameBase {
  readonly kind: "acknowledgement";
  readonly message: string;
}

/** Visual state for a multi-line editable text area. */
export interface TextareaFrameState extends InteractiveFrameBase {
  readonly kind: "textarea";
  readonly value: string;
  /** Grapheme index in the complete value at which the cursor is drawn. */
  readonly cursor: number;
  readonly rows: number;
  readonly placeholder?: string;
}

/** Visual state for one phase of indeterminate work. */
export interface SpinnerFrameState extends InteractiveFrameBase {
  readonly kind: "spinner";
  /** Semantic phase consumed by the package spinner authority. */
  readonly phase: number;
}

/** Visual state for truthful determinate progress. */
export interface DeterminateProgressFrameState extends InteractiveFrameBase {
  readonly kind: "determinate-progress";
  /** Completed work units, retained as a value rather than a rendered bar. */
  readonly completed: number;
  readonly total: number;
}

/** Semantic state of one step in a sequential form or workflow. */
export type SequentialStepStatus =
  | "pending"
  | "active"
  | "complete"
  | "error"
  | "cancelled";

/** One named form section and its semantic workflow state. */
export interface SequentialFormSectionState {
  readonly id: string;
  readonly label: string;
  readonly status: SequentialStepStatus;
  readonly summary?: string;
}

/** Visual state for a complete sequential form-section rail. */
export interface SequentialFormFrameState extends InteractiveFrameBase {
  readonly kind: "sequential-form";
  readonly sections: readonly SequentialFormSectionState[];
  /** Semantic spinner phase for the active step marker. */
  readonly activePhase: number;
  /** Semantic phase for an optional activity beacon beside the rail. */
  readonly beaconPhase?: number;
}

/** Every interactive visual state accepted by wave-two renderers. */
export type InteractiveFrameState =
  | TextInputFrameState
  | MaskedInputFrameState
  | ConfirmFrameState
  | SelectFrameState
  | MultiselectFrameState
  | SearchFrameState
  | SearchMultiselectFrameState
  | AutocompleteFrameState
  | AcknowledgementFrameState
  | TextareaFrameState
  | SpinnerFrameState
  | DeterminateProgressFrameState
  | SequentialFormFrameState;
