/**
 * Single-select and multi-select prompt state machines.
 *
 * @module
 */

import type {
  InteractiveFrameLifecycle,
  MultiselectFrameState,
  SelectFrameState,
} from "../interactive-states.ts";
import type { TerminalCapabilities } from "../capabilities.ts";
import type { TerminalThemeVariant } from "../theme.ts";
import renderCheckboxCli from "../../components/forms/checkbox/checkbox.cli.ts";
import renderSelectCli from "../../components/forms/select/select.cli.ts";
import {
  assertChoices,
  choiceVisibleCount,
  choiceVisibleStart,
  edgeEnabledIndex,
  frameChoices,
  initialHighlight,
  isBackwardChoiceKey,
  isForwardChoiceKey,
  isPromptChoice,
  moveEnabledIndex,
} from "./choice-navigation.ts";
import { type PromptMachine, runPrompt } from "./driver.ts";
import { isNamedKey, type TerminalKey } from "./keys.ts";
import type { PromptFrameViewport } from "./viewport-budget.ts";
import type {
  PromptChoiceEntry,
  PromptOptions,
  PromptRuntime,
} from "./types.ts";

function renderSelectFrame(
  state: SelectFrameState,
  capabilities: TerminalCapabilities,
  theme: TerminalThemeVariant | undefined,
): string {
  return renderSelectCli({
    ...state,
    ...(theme === undefined ? {} : { theme }),
  }, capabilities);
}

function renderMultiselectFrame(
  state: MultiselectFrameState,
  capabilities: TerminalCapabilities,
  theme: TerminalThemeVariant | undefined,
): string {
  return renderCheckboxCli({
    ...state,
    ...(theme === undefined ? {} : { theme }),
  }, capabilities);
}

/** Options for selecting zero or one value from a scrollable choice list. */
export interface SelectPromptOptions<T> extends PromptOptions<T | undefined> {
  readonly choices: readonly PromptChoiceEntry<T>[];
  /** Stable ID of the enabled choice highlighted initially. */
  readonly initialId?: string;
  /** Requested upper bound on choice rows; the viewport may reduce it per frame. */
  readonly visibleCount?: number;
}

/** Options for selecting zero or more values from a scrollable choice list. */
export interface MultiselectPromptOptions<T>
  extends PromptOptions<readonly T[]> {
  readonly choices: readonly PromptChoiceEntry<T>[];
  /** Stable IDs of initially selected choices, in caller choice order. */
  readonly initialIds?: readonly string[];
  /** Requested upper bound on choice rows; the viewport may reduce it per frame. */
  readonly visibleCount?: number;
}

class SelectPromptMachine<T>
  implements PromptMachine<T | undefined, SelectFrameState> {
  readonly #visibleCount: number;
  #highlighted: number;

  constructor(readonly options: SelectPromptOptions<T>) {
    assertChoices(options.choices, options.required !== false);
    this.#visibleCount = choiceVisibleCount(options.visibleCount);
    this.#highlighted = initialHighlight(options.choices, options.initialId);
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
    } else if (isNamedKey(key, "home")) {
      this.#highlighted = edgeEnabledIndex(this.options.choices, "first");
    } else if (isNamedKey(key, "end")) {
      this.#highlighted = edgeEnabledIndex(this.options.choices, "last");
    }
    if (!isNamedKey(key, "enter")) return false;
    const entry = this.options.choices[this.#highlighted];
    return (entry !== undefined && isPromptChoice(entry) &&
      entry.disabled !== true) ||
      this.options.required === false;
  }

  value(): T | undefined {
    const entry = this.options.choices[this.#highlighted];
    return entry === undefined || !isPromptChoice(entry) ||
        entry.disabled === true
      ? undefined
      : entry.value;
  }

  frame(
    lifecycle: InteractiveFrameLifecycle,
    viewport: PromptFrameViewport,
  ): SelectFrameState {
    const visibleCount = Math.min(
      this.#visibleCount,
      viewport.maximumControlRows,
    );
    const highlighted = this.options.choices[this.#highlighted];
    const selected = highlighted !== undefined && isPromptChoice(highlighted)
      ? highlighted
      : undefined;
    return {
      kind: "select",
      label: this.options.label,
      lifecycle,
      options: frameChoices(this.options.choices),
      highlightedIndex: this.#highlighted,
      visibleStart: choiceVisibleStart(
        this.#highlighted,
        this.options.choices.length,
        visibleCount,
      ),
      visibleCount,
      ...(selected === undefined ? {} : { selectedId: selected.id }),
      ...(this.options.hint === undefined ? {} : { hint: this.options.hint }),
    };
  }
}

/** Prompt for at most one value from a scrollable choice list. */
export async function promptSelect<T>(
  options: SelectPromptOptions<T>,
  runtime: PromptRuntime = {},
): Promise<T | undefined> {
  const requiredOptions: SelectPromptOptions<T> = {
    ...options,
    required: options.required ?? true,
  };
  return await runPrompt(
    requiredOptions,
    new SelectPromptMachine(requiredOptions),
    runtime,
    renderSelectFrame,
  );
}

class MultiselectPromptMachine<T>
  implements PromptMachine<readonly T[], MultiselectFrameState> {
  readonly #visibleCount: number;
  readonly #selectedIds: Set<string>;
  #highlighted: number;

  constructor(readonly options: MultiselectPromptOptions<T>) {
    assertChoices(options.choices);
    this.#visibleCount = choiceVisibleCount(options.visibleCount);
    const knownIds = new Set(options.choices.map((choice) => choice.id));
    this.#selectedIds = new Set(
      (options.initialIds ?? []).filter((id) =>
        knownIds.has(id) &&
        options.choices.some((entry) =>
          isPromptChoice(entry) && entry.id === id
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
      isPromptChoice(entry) && this.#selectedIds.has(entry.id)
        ? [entry.value]
        : []
    );
  }

  frame(
    lifecycle: InteractiveFrameLifecycle,
    viewport: PromptFrameViewport,
  ): MultiselectFrameState {
    const visibleCount = Math.min(
      this.#visibleCount,
      viewport.maximumControlRows,
    );
    return {
      kind: "multiselect",
      label: this.options.label,
      lifecycle,
      options: frameChoices(this.options.choices),
      highlightedIndex: this.#highlighted,
      selectedIds: this.options.choices.flatMap((entry) =>
        isPromptChoice(entry) && this.#selectedIds.has(entry.id)
          ? [entry.id]
          : []
      ),
      visibleStart: choiceVisibleStart(
        this.#highlighted,
        this.options.choices.length,
        visibleCount,
      ),
      visibleCount,
      ...(this.options.hint === undefined ? {} : { hint: this.options.hint }),
    };
  }

  #toggleHighlighted(): void {
    const entry = this.options.choices[this.#highlighted];
    if (
      entry === undefined || !isPromptChoice(entry) || entry.disabled === true
    ) return;
    if (this.#selectedIds.has(entry.id)) this.#selectedIds.delete(entry.id);
    else this.#selectedIds.add(entry.id);
  }

  #toggleAllEnabled(): void {
    const enabled = this.options.choices.filter((entry) =>
      isPromptChoice(entry) && entry.disabled !== true
    );
    const allSelected = enabled.length > 0 &&
      enabled.every((entry) => this.#selectedIds.has(entry.id));
    for (const entry of enabled) {
      if (allSelected) this.#selectedIds.delete(entry.id);
      else this.#selectedIds.add(entry.id);
    }
  }
}

/** Prompt for zero or more values from a scrollable choice list. */
export async function promptMultiselect<T>(
  options: MultiselectPromptOptions<T>,
  runtime: PromptRuntime = {},
): Promise<readonly T[]> {
  return await runPrompt(
    options,
    new MultiselectPromptMachine(options),
    runtime,
    renderMultiselectFrame,
  );
}
