/**
 * Single-select and multi-select interaction state machines.
 *
 * @module
 */

import type {
  InteractiveFrameLifecycle,
  MultiselectFrameState,
  SelectFrameState,
} from "../interactive-states.ts";
import type { TerminalCapabilities } from "../capabilities.ts";
import type { CliPresentationOptions } from "../contracts.ts";
import renderCheckboxCli from "../../components/forms/checkbox/checkbox.cli.ts";
import renderSelectCli from "../../components/forms/select/select.cli.ts";
import { interactiveChoiceOverflow } from "../interactive-choice.ts";
import {
  assertChoices,
  choiceVisibleCount,
  choiceVisibleStart,
  edgeEnabledIndex,
  frameChoices,
  initialHighlight,
  isBackwardChoiceKey,
  isForwardChoiceKey,
  isInteractionChoice,
  moveEnabledIndex,
  pageEnabledIndex,
} from "./choice-navigation.ts";
import { type InteractionMachine, runInteraction } from "./driver.ts";
import { isNamedKey, type TerminalKey } from "./keys.ts";
import type { InteractionFrameViewport } from "./viewport-budget.ts";
import type {
  InteractionEntry,
  InteractionOptions,
  InteractionRuntime,
} from "./types.ts";

function renderSelectFrame(
  state: SelectFrameState,
  capabilities: TerminalCapabilities,
  presentation: CliPresentationOptions,
): string {
  return renderSelectCli({
    ...state,
    ...presentation,
  }, capabilities);
}

function renderMultiselectFrame(
  state: MultiselectFrameState,
  capabilities: TerminalCapabilities,
  presentation: CliPresentationOptions,
): string {
  return renderCheckboxCli({
    ...state,
    ...presentation,
  }, capabilities);
}

/** Options for selecting zero or one value from a scrollable choice list. */
export interface SelectionRequestOptions<T>
  extends InteractionOptions<T | undefined> {
  readonly choices: readonly InteractionEntry<T>[];
  /** Stable ID of the enabled choice highlighted initially. */
  readonly initialId?: string;
  /** Requested upper bound on choice rows; the viewport may reduce it per frame. */
  readonly visibleCount?: number;
}

/** Options for selecting zero or more values from a scrollable choice list. */
export interface SelectionsRequestOptions<T>
  extends InteractionOptions<readonly T[]> {
  readonly choices: readonly InteractionEntry<T>[];
  /** Stable IDs of initially selected choices, in caller choice order. */
  readonly initialIds?: readonly string[];
  /** Requested upper bound on choice rows; the viewport may reduce it per frame. */
  readonly visibleCount?: number;
}

class SelectionInteractionMachine<T>
  implements InteractionMachine<T | undefined, SelectFrameState> {
  readonly #visibleCount: number;
  #highlighted: number;
  /** The most recently fitted visible window, sizing a paging jump. */
  #pageSize: number;

  constructor(readonly options: SelectionRequestOptions<T>) {
    assertChoices(options.choices, options.required !== false);
    this.#visibleCount = choiceVisibleCount(options.visibleCount);
    this.#highlighted = initialHighlight(options.choices, options.initialId);
    this.#pageSize = this.#visibleCount;
  }

  handle(key: TerminalKey): boolean {
    if (isBackwardChoiceKey(key)) {
      this.#highlighted = moveEnabledIndex(
        this.options.choices,
        this.#highlighted,
        -1,
      );
    } else if (isForwardChoiceKey(key)) {
      this.#highlighted = moveEnabledIndex(
        this.options.choices,
        this.#highlighted,
        1,
      );
    } else if (isNamedKey(key, "page-up")) {
      this.#highlighted = pageEnabledIndex(
        this.options.choices,
        this.#highlighted,
        -1,
        this.#pageSize,
      );
    } else if (isNamedKey(key, "page-down")) {
      this.#highlighted = pageEnabledIndex(
        this.options.choices,
        this.#highlighted,
        1,
        this.#pageSize,
      );
    } else if (isNamedKey(key, "home")) {
      this.#highlighted = edgeEnabledIndex(this.options.choices, "first");
    } else if (isNamedKey(key, "end")) {
      this.#highlighted = edgeEnabledIndex(this.options.choices, "last");
    }
    if (!isNamedKey(key, "enter")) return false;
    const entry = this.options.choices[this.#highlighted];
    return (entry !== undefined && isInteractionChoice(entry) &&
      entry.disabled !== true) ||
      this.options.required === false;
  }

  value(): T | undefined {
    const entry = this.options.choices[this.#highlighted];
    return entry === undefined || !isInteractionChoice(entry) ||
        entry.disabled === true
      ? undefined
      : entry.value;
  }

  frame(
    lifecycle: InteractiveFrameLifecycle,
    viewport: InteractionFrameViewport,
  ): SelectFrameState {
    const visibleCount = Math.min(
      this.#visibleCount,
      viewport.maximumControlRows,
    );
    this.#pageSize = visibleCount;
    const highlighted = this.options.choices[this.#highlighted];
    const selected =
      highlighted !== undefined && isInteractionChoice(highlighted)
        ? highlighted
        : undefined;
    const options = frameChoices(this.options.choices);
    const visibleStart = choiceVisibleStart(
      this.#highlighted,
      this.options.choices.length,
      visibleCount,
    );
    return {
      kind: "select",
      label: this.options.label,
      lifecycle,
      options,
      highlightedIndex: this.#highlighted,
      visibleStart,
      visibleCount,
      ...interactiveChoiceOverflow(options, visibleStart, visibleCount),
      ...(selected === undefined ? {} : { selectedId: selected.id }),
      ...(this.options.hint === undefined ? {} : { hint: this.options.hint }),
    };
  }
}

/** Request at most one value from a scrollable choice list. */
export async function requestSelection<T>(
  options: SelectionRequestOptions<T>,
  runtime: InteractionRuntime = {},
): Promise<T | undefined> {
  const requiredOptions: SelectionRequestOptions<T> = {
    ...options,
    required: options.required ?? true,
  };
  return await runInteraction(
    requiredOptions,
    new SelectionInteractionMachine(requiredOptions),
    runtime,
    renderSelectFrame,
  );
}

class SelectionsInteractionMachine<T>
  implements InteractionMachine<readonly T[], MultiselectFrameState> {
  readonly #visibleCount: number;
  readonly #selectedIds: Set<string>;
  #highlighted: number;
  /** The most recently fitted visible window, sizing a paging jump. */
  #pageSize: number;

  constructor(readonly options: SelectionsRequestOptions<T>) {
    assertChoices(options.choices);
    this.#visibleCount = choiceVisibleCount(options.visibleCount);
    this.#pageSize = this.#visibleCount;
    const knownIds = new Set(options.choices.map((choice) => choice.id));
    this.#selectedIds = new Set(
      (options.initialIds ?? []).filter((id) =>
        knownIds.has(id) &&
        options.choices.some((entry) =>
          isInteractionChoice(entry) && entry.id === id
        )
      ),
    );
    this.#highlighted = initialHighlight(options.choices, undefined);
  }

  handle(key: TerminalKey): boolean {
    if (isBackwardChoiceKey(key)) {
      this.#highlighted = moveEnabledIndex(
        this.options.choices,
        this.#highlighted,
        -1,
      );
    } else if (isForwardChoiceKey(key)) {
      this.#highlighted = moveEnabledIndex(
        this.options.choices,
        this.#highlighted,
        1,
      );
    } else if (isNamedKey(key, "page-up")) {
      this.#highlighted = pageEnabledIndex(
        this.options.choices,
        this.#highlighted,
        -1,
        this.#pageSize,
      );
    } else if (isNamedKey(key, "page-down")) {
      this.#highlighted = pageEnabledIndex(
        this.options.choices,
        this.#highlighted,
        1,
        this.#pageSize,
      );
    } else if (isNamedKey(key, "home")) {
      this.#highlighted = edgeEnabledIndex(this.options.choices, "first");
    } else if (isNamedKey(key, "end")) {
      this.#highlighted = edgeEnabledIndex(this.options.choices, "last");
    } else if (key.kind === "text" && key.text === " ") {
      this.#toggleHighlighted();
    } else if (isNamedKey(key, "ctrl-a")) {
      this.#toggleAllEnabled();
    }
    return isNamedKey(key, "enter");
  }

  value(): readonly T[] {
    return this.options.choices.flatMap((entry) =>
      isInteractionChoice(entry) && this.#selectedIds.has(entry.id)
        ? [entry.value]
        : []
    );
  }

  frame(
    lifecycle: InteractiveFrameLifecycle,
    viewport: InteractionFrameViewport,
  ): MultiselectFrameState {
    const visibleCount = Math.min(
      this.#visibleCount,
      viewport.maximumControlRows,
    );
    this.#pageSize = visibleCount;
    const options = frameChoices(this.options.choices);
    const visibleStart = choiceVisibleStart(
      this.#highlighted,
      this.options.choices.length,
      visibleCount,
    );
    return {
      kind: "multiselect",
      label: this.options.label,
      lifecycle,
      options,
      highlightedIndex: this.#highlighted,
      selectedIds: this.options.choices.flatMap((entry) =>
        isInteractionChoice(entry) && this.#selectedIds.has(entry.id)
          ? [entry.id]
          : []
      ),
      visibleStart,
      visibleCount,
      ...interactiveChoiceOverflow(options, visibleStart, visibleCount),
      ...(this.options.hint === undefined ? {} : { hint: this.options.hint }),
    };
  }

  #toggleHighlighted(): void {
    const entry = this.options.choices[this.#highlighted];
    if (
      entry === undefined || !isInteractionChoice(entry) ||
      entry.disabled === true
    ) return;
    if (this.#selectedIds.has(entry.id)) this.#selectedIds.delete(entry.id);
    else this.#selectedIds.add(entry.id);
  }

  #toggleAllEnabled(): void {
    const enabled = this.options.choices.filter((entry) =>
      isInteractionChoice(entry) && entry.disabled !== true
    );
    const allSelected = enabled.length > 0 &&
      enabled.every((entry) => this.#selectedIds.has(entry.id));
    for (const entry of enabled) {
      if (allSelected) this.#selectedIds.delete(entry.id);
      else this.#selectedIds.add(entry.id);
    }
  }
}

/** Request zero or more values from a scrollable choice list. */
export async function requestSelections<T>(
  options: SelectionsRequestOptions<T>,
  runtime: InteractionRuntime = {},
): Promise<readonly T[]> {
  return await runInteraction(
    options,
    new SelectionsInteractionMachine(options),
    runtime,
    renderMultiselectFrame,
  );
}
