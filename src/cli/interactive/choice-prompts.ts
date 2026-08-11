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
import {
  assertChoices,
  choiceVisibleCount,
  choiceVisibleStart,
  edgeEnabledIndex,
  frameChoices,
  initialHighlight,
  isBackwardChoiceKey,
  isForwardChoiceKey,
  moveEnabledIndex,
} from "./choice-navigation.ts";
import { type PromptMachine, runPrompt } from "./driver.ts";
import { isNamedKey, type TerminalKey } from "./keys.ts";
import type { PromptChoice, PromptOptions, PromptRuntime } from "./types.ts";

/** Options for selecting zero or one value from a scrollable choice list. */
export interface SelectPromptOptions<T> extends PromptOptions<T | undefined> {
  readonly choices: readonly PromptChoice<T>[];
  readonly initialId?: string;
  readonly visibleCount?: number;
}

/** Options for selecting zero or more values from a scrollable choice list. */
export interface MultiselectPromptOptions<T>
  extends PromptOptions<readonly T[]> {
  readonly choices: readonly PromptChoice<T>[];
  readonly initialIds?: readonly string[];
  readonly visibleCount?: number;
}

class SelectPromptMachine<T>
  implements PromptMachine<T | undefined, SelectFrameState> {
  readonly #visibleCount: number;
  #highlighted: number;

  constructor(readonly options: SelectPromptOptions<T>) {
    assertChoices(options.choices);
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
    const choice = this.options.choices[this.#highlighted];
    return choice?.disabled !== true &&
      (choice !== undefined || this.options.required === false);
  }

  value(): T | undefined {
    const choice = this.options.choices[this.#highlighted];
    return choice?.disabled === true ? undefined : choice?.value;
  }

  frame(lifecycle: InteractiveFrameLifecycle): SelectFrameState {
    const selected = this.options.choices[this.#highlighted];
    return {
      kind: "select",
      label: this.options.label,
      lifecycle,
      options: frameChoices(this.options.choices),
      highlightedIndex: this.#highlighted,
      visibleStart: choiceVisibleStart(
        this.#highlighted,
        this.options.choices.length,
        this.#visibleCount,
      ),
      visibleCount: this.#visibleCount,
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
      (options.initialIds ?? []).filter((id) => knownIds.has(id)),
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
    return this.options.choices.flatMap((choice) =>
      this.#selectedIds.has(choice.id) ? [choice.value] : []
    );
  }

  frame(lifecycle: InteractiveFrameLifecycle): MultiselectFrameState {
    return {
      kind: "multiselect",
      label: this.options.label,
      lifecycle,
      options: frameChoices(this.options.choices),
      highlightedIndex: this.#highlighted,
      selectedIds: this.options.choices.flatMap((choice) =>
        this.#selectedIds.has(choice.id) ? [choice.id] : []
      ),
      visibleStart: choiceVisibleStart(
        this.#highlighted,
        this.options.choices.length,
        this.#visibleCount,
      ),
      visibleCount: this.#visibleCount,
      ...(this.options.hint === undefined ? {} : { hint: this.options.hint }),
    };
  }

  #toggleHighlighted(): void {
    const choice = this.options.choices[this.#highlighted];
    if (choice === undefined || choice.disabled === true) return;
    if (this.#selectedIds.has(choice.id)) this.#selectedIds.delete(choice.id);
    else this.#selectedIds.add(choice.id);
  }

  #toggleAllEnabled(): void {
    const enabled = this.options.choices.filter((choice) =>
      choice.disabled !== true
    );
    const allSelected = enabled.length > 0 &&
      enabled.every((choice) => this.#selectedIds.has(choice.id));
    for (const choice of enabled) {
      if (allSelected) this.#selectedIds.delete(choice.id);
      else this.#selectedIds.add(choice.id);
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
  );
}
