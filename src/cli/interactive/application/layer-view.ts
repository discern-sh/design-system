/**
 * Modal layers the caller declares over the body: sheets that ask before an
 * effect, menus, a command palette, forms, and readers. Only the caller's
 * view opens or removes a layer; the package owns focus inside it, field
 * values, disclosures, scrolling, read progress, and the safe choice.
 *
 * @module
 */

import type { KeyChord, KeyHint } from "../../key-hints.ts";
import type { TerminalTextTone } from "../../theme.ts";
import type {
  ActionHint,
  DetailBlock,
  GroupedList,
  InlineRun,
} from "./view.ts";

/**
 * What a layer concerns: the selected item, or the whole screen. An item
 * layer keeps the selected row visible above a bottom sheet.
 */
export type ApplicationLayerScope = "item" | "global";

/**
 * Where a layer sits. `detail` occupies the detail column beside the list on
 * wide screens and becomes `bottom` elsewhere; `bottom` and `top` span the
 * width with their height sized to content; `full` takes the whole body.
 * Below 56 columns every layer takes the whole body.
 */
export type ApplicationLayerAnchor = "detail" | "bottom" | "top" | "full";

/** What every layer declares. */
export interface ApplicationLayerBase {
  /** Stable across updates; the package remembers focus and fields by it. */
  readonly id: string;
  readonly scope: ApplicationLayerScope;
  /**
   * Defaults: sheets, menus, and forms sit in the detail column on wide
   * screens and at the bottom elsewhere; a palette at the top; a reader
   * takes the whole body.
   */
  readonly anchor?: ApplicationLayerAnchor;
  /**
   * Further key hints for the layer's footer, after the keys the package
   * lists and before Escape, such as a layer binding's key. Each must name
   * a key the layer handles or binds.
   */
  readonly hints?: readonly KeyHint[];
  /**
   * The word the footer gives Escape. Defaults to the safe button's label
   * in sheets and forms, and to the copy's close or back word elsewhere.
   */
  readonly escapeLabel?: string;
}

/**
 * A collapsed section of a sheet or form, such as a technical plan, that one
 * key opens. The package remembers whether each is open.
 */
export interface LayerDisclosure {
  readonly id: string;
  /** The row's text, such as `Plan · 13 steps`. */
  readonly label: string;
  /** The short name key hints use while closed; defaults to the label. */
  readonly hint?: string;
  /** The short name key hints use while open, such as `Hide plan`; defaults to `hint`. */
  readonly openHint?: string;
  /** Toggles the disclosure while focus is not in a text field. */
  readonly key: KeyChord;
  /**
   * Toggles it in every focus state, including a text field. Required when
   * the layer opens on a text field; a non-printing chord outside the
   * editor's chords.
   */
  readonly fieldKey?: KeyChord;
  readonly content: readonly DetailBlock[];
  /** Start open. */
  readonly initiallyOpen?: boolean;
}

/**
 * A sheet's lifecycle. `loading`, `changed`, and `gone` disable every button
 * but the safe one; `loading` and `working` show the busy line.
 */
export type SheetState =
  | "loading"
  | "ready"
  | "changed"
  | "gone"
  | "working"
  | "failed";

/**
 * A button's meaning. Exactly one button is `safe`: Escape, a click outside
 * the layer, and the button itself dismiss the layer. `confirm` and
 * `destructive` buttons never take a key and never activate on the first
 * click; `alternative` buttons may declare a key.
 */
export type SheetButtonRole =
  | "safe"
  | "confirm"
  | "destructive"
  | "alternative";

/** One button in a sheet's or form's button row. */
export interface SheetButton<A> {
  readonly id: string;
  readonly label: string;
  readonly role: SheetButtonRole;
  /** What the button runs; required except on the safe button, which dismisses. */
  readonly action?: A;
  /** Defaults to true. The package disables more buttons on its own rules. */
  readonly enabled?: boolean;
  /** Shown in place of the footnote while the disabled button has focus. */
  readonly disabledReason?: string;
  /** Activates the button while focus is not in a text field; alternatives only. */
  readonly key?: KeyChord;
  /** Enabled only while the sheet's challenge field matches exactly; destructive only. */
  readonly requiresChallenge?: boolean;
}

/**
 * A typed confirmation: destructive buttons that require it stay disabled
 * until the field's text equals `mustEqual` exactly. The package owns the
 * value.
 */
export interface SheetChallenge {
  readonly fieldId: string;
  /** The words above the field, such as `Type <name> to remove it`. */
  readonly label: readonly InlineRun[];
  readonly mustEqual: string;
  /** Replaces the package's remaining-characters hint beside the field. */
  readonly hint?: readonly InlineRun[];
}

/** A line across the top of a sheet, such as a notice that its subject changed. */
export interface SheetBanner {
  readonly tone: TerminalTextTone;
  readonly runs: readonly InlineRun[];
}

/** One step of an operation a sheet shows while it runs. */
export interface ActivityStep {
  readonly id: string;
  readonly label: string;
  readonly state: "pending" | "active" | "done" | "failed" | "skipped";
  /** Clock time the step started, on the application clock. */
  readonly startedAt?: number;
  readonly endedAt?: number;
}

/**
 * The steps of a running operation, in order. Finished steps show their
 * duration, the active step its running time, and the title row the total.
 */
export interface ActivitySteps {
  readonly steps: readonly ActivityStep[];
  /** Clock time the operation started. */
  readonly startedAt: number;
  /** The usual duration; a meter compares the total against it. */
  readonly typicalMs?: number;
  /** Words after the total beside the meter, such as `usually about 1m`. */
  readonly typicalLabel?: string;
  /** Lines above the steps while the operation waits. */
  readonly waits?: readonly (readonly InlineRun[])[];
  /** Work that follows, under a `Then` label. */
  readonly then?: readonly (readonly InlineRun[])[];
}

/**
 * A question before an effect: consequences first, optional disclosures,
 * an optional typed challenge, and a button row whose safe choice is one
 * key away. The body is never elided or shortened; it scrolls, and with
 * `requireFullRead` the confirm and destructive buttons stay disabled until
 * every body line has been on screen.
 */
export interface ApplicationSheet<A> extends ApplicationLayerBase {
  readonly kind: "sheet";
  readonly title: string;
  readonly aside?: readonly InlineRun[];
  readonly state: SheetState;
  /** The busy line while `loading` or `working`, such as `Checking…`. */
  readonly busy?: string;
  readonly banner?: SheetBanner;
  readonly body: readonly DetailBlock[];
  /** Defaults to true when a confirm or destructive button exists. */
  readonly requireFullRead?: boolean;
  /** Words after the unread count, such as `to read before applying`. */
  readonly readHint?: string;
  readonly disclosures?: readonly LayerDisclosure[];
  readonly challenge?: SheetChallenge;
  readonly footnote?: readonly InlineRun[];
  readonly buttons: readonly SheetButton<A>[];
  /**
   * Progress mode: the steps replace the body and the challenge, and the
   * buttons are the safe one (such as Hide) and at most one destructive
   * one (such as Stop).
   */
  readonly activity?: ActivitySteps;
  /**
   * In progress mode, false hides the button row: Escape stays the safe
   * choice and Enter does nothing. Defaults to true.
   */
  readonly buttonRow?: boolean;
}

/** One menu row that runs an action. */
export interface MenuItem<A> {
  readonly id: string;
  readonly label: string;
  /** Shown in the key column; runs the item when the menu lets letters activate. */
  readonly key?: KeyChord;
  readonly action: A;
  readonly tone?: "danger";
  /** Muted runs after the label on the row itself. */
  readonly detail?: readonly InlineRun[];
  /** Shown beneath the menu while the item is highlighted. */
  readonly description?: readonly InlineRun[];
}

/** A titled run of menu items. */
export interface MenuSection<A> {
  readonly title: string;
  readonly tone?: TerminalTextTone;
  readonly items: readonly MenuItem<A>[];
  /**
   * Items of this section that cannot run now, shown after its items with
   * their sentence beside them; Enter shows the sentence in full and never
   * activates.
   */
  readonly unavailable?: readonly UnavailableMenuItem[];
}

/** A menu row that cannot run now, with the sentence that says why. */
export interface UnavailableMenuItem {
  readonly id: string;
  readonly label: string;
  readonly sentence: string;
  /** Pressing it shows the sentence; it never activates anything. */
  readonly key?: KeyChord;
}

/**
 * A list of actions. Up and Down move in reading order — down the first
 * column, then the second — Enter or Right runs the highlighted item, and
 * `/` filters. Unavailable items fold into one section that Enter opens;
 * Enter on one of them shows its sentence and never activates.
 */
export interface ApplicationMenu<A> extends ApplicationLayerBase {
  readonly kind: "menu";
  readonly title: string;
  readonly aside?: string;
  /** Two columns read top to bottom, left then right; sections never split. */
  readonly columns?: 1 | 2;
  readonly sections: readonly MenuSection<A>[];
  readonly unavailable?: {
    readonly title: string;
    readonly items: readonly UnavailableMenuItem[];
  };
  /** Highlighted on open; defaults to the first item. */
  readonly initialItemId?: string;
  /** Item keys run their item, so the menu teaches them. */
  readonly lettersActivate?: boolean;
  /**
   * The word the footer gives Enter, such as `Open`; defaults to the
   * highlighted item's label.
   */
  readonly enterLabel?: string;
  /** Offer `/` to filter the menu; defaults to true. */
  readonly filter?: boolean;
  /** Runs beneath the menu, after the highlighted item's description. */
  readonly footnote?: readonly InlineRun[];
}

/** One palette result. Its meta and key render in their own columns. */
export interface PaletteItem<A> {
  readonly id: string;
  readonly label: string;
  /** Muted text after the label, such as the item it concerns. */
  readonly context?: string;
  readonly meta?: readonly InlineRun[];
  /** A key that reaches the same thing outside the palette, shown for learning. */
  readonly key?: KeyChord;
  readonly action: A;
  /** Text only the search reads. */
  readonly keywords?: string;
}

/** A titled run of palette items. */
export interface PaletteSection<A> {
  readonly title: string;
  readonly items: readonly PaletteItem<A>[];
}

/**
 * A searchable list of everything the screen can do. Typing ranks items
 * fuzzily across sections; Up and Down move while typing; Enter runs; Escape
 * clears the query, then closes.
 */
export interface ApplicationPalette<A> extends ApplicationLayerBase {
  readonly kind: "palette";
  readonly placeholder: string;
  readonly sections: readonly PaletteSection<A>[];
}

/** A one-line or multi-line text field. */
export interface FormTextField<A> {
  readonly kind: "text";
  readonly id: string;
  readonly label: string;
  readonly initial: string;
  /** Runs beneath the field, such as a value derived from it. */
  readonly hint?: readonly InlineRun[];
  /** Confirm buttons stay disabled while the field is blank. */
  readonly required?: boolean;
  readonly multiline?: boolean;
  /**
   * A chord that hands the text to an external editor: it runs `action`,
   * which returns a foreground command, and the caller writes the result
   * back with `context.setField`. Multi-line fields only.
   */
  readonly editor?: {
    readonly key: KeyChord;
    readonly action: A;
    readonly label?: string;
  };
}

/** One choice of a choice field. */
export interface FormChoiceOption {
  readonly id: string;
  readonly label: string;
  /** Present when the option cannot be chosen now. */
  readonly disabledReason?: string;
}

/** A field whose value is one of its options. Left and Right change it. */
export interface FormChoiceField {
  readonly kind: "choice";
  readonly id: string;
  readonly label: string;
  /** The option id chosen first. */
  readonly initial: string;
  readonly options: readonly FormChoiceOption[];
}

/** Fields folded behind one row, with a summary of their values beside it. */
export interface FormFieldGroup<A> {
  readonly kind: "disclosure";
  readonly id: string;
  readonly label: string;
  readonly summary?: string;
  readonly initiallyOpen?: boolean;
  readonly fields: readonly (FormTextField<A> | FormChoiceField)[];
}

/** One form control. */
export type FormField<A> =
  | FormTextField<A>
  | FormChoiceField
  | FormFieldGroup<A>;

/**
 * Fields, a live preview the caller recomputes from `onField` values,
 * disclosures, and a button row. Focus starts in the first text field;
 * Enter there moves to the safe button; Tab cycles controls; letters never
 * confirm.
 */
export interface ApplicationForm<A> extends ApplicationLayerBase {
  readonly kind: "form";
  readonly title: string;
  readonly aside?: string;
  readonly fields: readonly FormField<A>[];
  readonly preview?: readonly DetailBlock[];
  readonly disclosures?: readonly LayerDisclosure[];
  readonly footnote?: readonly InlineRun[];
  readonly buttons: readonly SheetButton<A>[];
}

/**
 * A full-height document: blocks that scroll, optional focusable rows such
 * as files whose Enter runs their primary action, and keys of its own.
 * Escape or Left goes back.
 */
export interface ApplicationReader<A> extends ApplicationLayerBase {
  readonly kind: "reader";
  readonly title: string;
  readonly aside?: readonly InlineRun[];
  readonly blocks: readonly DetailBlock[];
  readonly rows?: GroupedList<A>;
  /** Keys that run their action while the reader is on top. */
  readonly keys?: readonly ActionHint<A>[];
  /**
   * Two lays the blocks out in two columns read top to bottom, left then
   * right, never splitting a block, when the reader is at least 56 cells
   * wide.
   */
  readonly columns?: 1 | 2;
  /** Runs after the blocks and rows. */
  readonly footnote?: readonly InlineRun[];
}

/** Any layer, bottom to top in the view's `layers`. */
export type ApplicationLayer<A> =
  | ApplicationSheet<A>
  | ApplicationMenu<A>
  | ApplicationPalette<A>
  | ApplicationForm<A>
  | ApplicationReader<A>;

/** The kinds of layer. */
export type ApplicationLayerKind = ApplicationLayer<unknown>["kind"];

/** How many layers may be open at once. */
export const APPLICATION_LAYER_DEPTH = 2;
