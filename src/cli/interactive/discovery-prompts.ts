/**
 * Search and ghost-text autocomplete prompt state machines.
 *
 * @module
 */

import type {
  AutocompleteFrameState,
  InteractiveFrameLifecycle,
  SearchFrameState,
} from "../interactive-states.ts";
import type { TerminalCapabilities } from "../capabilities.ts";
import type { TerminalThemeVariant } from "../theme.ts";
import { interactiveChoiceWindow } from "../interactive-choice.ts";
import renderInputCli from "../../components/forms/input/input.cli.ts";
import renderRadioCli from "../../components/forms/radio/radio.cli.ts";
import {
  assertChoices,
  choiceVisibleCount,
  choiceVisibleStart,
  frameChoices,
  isPromptChoice,
  moveEnabledIndex,
} from "./choice-navigation.ts";
import { type PromptMachine, runPrompt } from "./driver.ts";
import { GraphemeTextEditor } from "./editor.ts";
import { isNamedKey, type TerminalKey } from "./keys.ts";
import type { PromptFrameViewport } from "./viewport-budget.ts";
import type {
  PromptChoiceEntry,
  PromptOptions,
  PromptRuntime,
} from "./types.ts";

function renderSearchFrame(
  state: SearchFrameState,
  capabilities: TerminalCapabilities,
  theme: TerminalThemeVariant | undefined,
): string {
  return renderRadioCli({
    ...state,
    ...(theme === undefined ? {} : { theme }),
  }, capabilities);
}

function renderAutocompleteFrame(
  state: AutocompleteFrameState,
  capabilities: TerminalCapabilities,
  theme: TerminalThemeVariant | undefined,
): string {
  return renderInputCli({
    ...state,
    ...(theme === undefined ? {} : { theme }),
  }, capabilities);
}

/** Synchronous or asynchronous choice provider used by search prompts. */
export type SearchPromptProvider<T> = (
  query: string,
) =>
  | readonly PromptChoiceEntry<T>[]
  | Promise<readonly PromptChoiceEntry<T>[]>;

/** Options for a query-driven selectable search prompt. */
export interface SearchPromptOptions<T> extends PromptOptions<T | undefined> {
  readonly search: SearchPromptProvider<T>;
  /** Stable enabled choice ID highlighted from the initial provider result. */
  readonly initialId?: string;
  readonly placeholder?: string;
  /** Requested upper bound on result rows; the viewport may reduce it per frame. */
  readonly visibleCount?: number;
}

class SearchPromptMachine<T>
  implements PromptMachine<T | undefined, SearchFrameState> {
  readonly #editor = new GraphemeTextEditor();
  readonly #visibleCount: number;
  #matches: readonly PromptChoiceEntry<T>[] = [];
  #highlighted: number | undefined;
  #rememberedId: string | undefined;

  constructor(readonly options: SearchPromptOptions<T>) {
    this.#visibleCount = choiceVisibleCount(options.visibleCount);
    this.#rememberedId = options.initialId;
  }

  async start(): Promise<void> {
    await this.#refresh();
  }

  async handle(key: TerminalKey): Promise<boolean> {
    if (isNamedKey(key, "enter")) {
      if (this.#highlighted === undefined) {
        const first = moveEnabledIndex(this.#matches, -1, 1);
        if (first < 0) return this.options.required === false;
        this.#highlighted = first;
        this.#rememberHighlighted();
        return false;
      }
      const entry = this.#matches[this.#highlighted];
      return entry !== undefined && isPromptChoice(entry) &&
        entry.disabled !== true;
    }
    if (
      isNamedKey(key, "up") || isNamedKey(key, "shift-tab") ||
      isNamedKey(key, "ctrl-p")
    ) {
      const highlighted = moveEnabledIndex(
        this.#matches,
        this.#highlighted ?? 0,
        -1,
      );
      this.#highlighted = highlighted < 0 ? undefined : highlighted;
      this.#rememberHighlighted();
      return false;
    }
    if (
      isNamedKey(key, "down") || isNamedKey(key, "tab") ||
      isNamedKey(key, "ctrl-n")
    ) {
      const highlighted = moveEnabledIndex(
        this.#matches,
        this.#highlighted ?? -1,
        1,
      );
      this.#highlighted = highlighted < 0 ? undefined : highlighted;
      this.#rememberHighlighted();
      return false;
    }
    if (this.#editor.handle(key)) {
      await this.#refresh();
    }
    return false;
  }

  value(): T | undefined {
    if (this.#highlighted === undefined) return undefined;
    const entry = this.#matches[this.#highlighted];
    return entry === undefined || !isPromptChoice(entry) ||
        entry.disabled === true
      ? undefined
      : entry.value;
  }

  frame(
    lifecycle: InteractiveFrameLifecycle,
    viewport: PromptFrameViewport,
  ): SearchFrameState {
    const visibleCount = Math.min(
      this.#visibleCount,
      viewport.maximumControlRows,
    );
    const anchor = this.#highlighted ?? 0;
    const start = choiceVisibleStart(
      anchor,
      this.#matches.length,
      visibleCount,
    );
    const visible = interactiveChoiceWindow(
      frameChoices(this.#matches),
      start,
      visibleCount,
    );
    const highlightedIndex = this.#highlighted === undefined
      ? -1
      : visible.findIndex(({ sourceIndex }) =>
        sourceIndex === this.#highlighted
      );
    return {
      kind: "search",
      label: this.options.label,
      lifecycle,
      query: this.#editor.value,
      cursor: this.#editor.cursor,
      results: visible.map(({ entry }) => entry),
      ...(highlightedIndex < 0 ? {} : { highlightedIndex }),
      ...(this.options.hint === undefined ? {} : { hint: this.options.hint }),
      ...(this.options.placeholder === undefined
        ? {}
        : { placeholder: this.options.placeholder }),
    };
  }

  async #refresh(): Promise<void> {
    const choices = [...await this.options.search(this.#editor.value)];
    assertChoices(choices);
    this.#matches = choices;
    const remembered = this.#rememberedId === undefined
      ? -1
      : choices.findIndex((entry) =>
        isPromptChoice(entry) && entry.id === this.#rememberedId &&
        entry.disabled !== true
      );
    this.#highlighted = remembered < 0 ? undefined : remembered;
  }

  #rememberHighlighted(): void {
    if (this.#highlighted === undefined) return;
    const entry = this.#matches[this.#highlighted];
    if (
      entry !== undefined && isPromptChoice(entry) && entry.disabled !== true
    ) {
      this.#rememberedId = entry.id;
    }
  }
}

/** Prompt for a value returned by a synchronous or asynchronous search. */
export async function promptSearch<T>(
  options: SearchPromptOptions<T>,
  runtime: PromptRuntime = {},
): Promise<T | undefined> {
  const requiredOptions: SearchPromptOptions<T> = {
    ...options,
    required: options.required ?? true,
  };
  return await runPrompt(
    requiredOptions,
    new SearchPromptMachine(requiredOptions),
    runtime,
    renderSearchFrame,
  );
}

/** Synchronous or asynchronous source for autocomplete candidates. */
export type AutocompletePromptProvider = (
  query: string,
) => readonly string[] | Promise<readonly string[]>;

/** Options for an editable line with one inline ghost completion. */
export interface AutocompletePromptOptions extends PromptOptions<string> {
  readonly suggestions: readonly string[] | AutocompletePromptProvider;
  readonly placeholder?: string;
  readonly initialValue?: string;
}

function assertSuggestions(suggestions: readonly string[]): void {
  for (const [index, suggestion] of suggestions.entries()) {
    if (suggestion === "" || /[\p{Cc}]/u.test(suggestion)) {
      throw new TypeError(`autocomplete suggestion ${index + 1} is invalid`);
    }
  }
}

class AutocompletePromptMachine
  implements PromptMachine<string, AutocompleteFrameState> {
  readonly #editor: GraphemeTextEditor;
  #suggestions: readonly string[] = [];
  #highlighted = 0;

  constructor(readonly options: AutocompletePromptOptions) {
    this.#editor = new GraphemeTextEditor(options.initialValue ?? "");
  }

  async start(): Promise<void> {
    await this.#refresh();
  }

  async handle(key: TerminalKey): Promise<boolean> {
    if (isNamedKey(key, "enter")) return true;
    if (isNamedKey(key, "up") || isNamedKey(key, "ctrl-p")) {
      this.#highlighted = this.#moveSuggestion(-1);
      return false;
    }
    if (isNamedKey(key, "down") || isNamedKey(key, "ctrl-n")) {
      this.#highlighted = this.#moveSuggestion(1);
      return false;
    }
    if (
      (isNamedKey(key, "tab") || isNamedKey(key, "right")) &&
      this.#editor.atEnd
    ) {
      const suggestion = this.#suggestions[this.#highlighted];
      if (suggestion !== undefined) this.#editor.replace(suggestion);
      await this.#refresh();
      return false;
    }
    if (this.#editor.handle(key)) await this.#refresh();
    return false;
  }

  value(): string {
    return this.#editor.value;
  }

  frame(lifecycle: InteractiveFrameLifecycle): AutocompleteFrameState {
    return {
      kind: "autocomplete",
      label: this.options.label,
      lifecycle,
      value: this.#editor.value,
      cursor: this.#editor.cursor,
      suggestions: this.#suggestions,
      highlightedIndex: this.#highlighted,
      ...(this.options.hint === undefined ? {} : { hint: this.options.hint }),
      ...(this.options.placeholder === undefined
        ? {}
        : { placeholder: this.options.placeholder }),
    };
  }

  #moveSuggestion(direction: -1 | 1): number {
    if (this.#suggestions.length === 0) return 0;
    return ((this.#highlighted + direction) % this.#suggestions.length +
      this.#suggestions.length) % this.#suggestions.length;
  }

  async #refresh(): Promise<void> {
    const source = this.options.suggestions;
    const suggestions = typeof source === "function"
      ? [...await source(this.#editor.value)]
      : source.filter((suggestion) =>
        suggestion.toLocaleLowerCase().startsWith(
          this.#editor.value.toLocaleLowerCase(),
        )
      );
    assertSuggestions(suggestions);
    this.#suggestions = suggestions;
    this.#highlighted = Math.min(
      this.#highlighted,
      Math.max(0, suggestions.length - 1),
    );
  }
}

/** Prompt for text with a ghost completion accepted by Tab or Right Arrow. */
export async function promptAutocomplete(
  options: AutocompletePromptOptions,
  runtime: PromptRuntime = {},
): Promise<string> {
  return await runPrompt(
    options,
    new AutocompletePromptMachine(options),
    runtime,
    renderAutocompleteFrame,
  );
}
