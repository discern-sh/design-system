/**
 * Search and ghost-text autocomplete interaction state machines.
 *
 * Provider calls never block the key loop: results are requested with a
 * monotonic tag and an abort signal, rapid edits may be debounced through an
 * injectable scheduler, a resolution superseded by a newer query is
 * discarded, and frames carry a pending truth while a call is scheduled or
 * in flight. Synchronous provider results still apply within the same frame.
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
  isInteractionChoice,
  moveEnabledIndex,
} from "./choice-navigation.ts";
import {
  type InteractionMachine,
  type InteractionMachineContext,
  runInteraction,
} from "./driver.ts";
import { GraphemeTextEditor } from "./editor.ts";
import { isNamedKey, type TerminalKey } from "./keys.ts";
import type { InteractionFrameViewport } from "./viewport-budget.ts";
import type {
  InteractionDelayScheduler,
  InteractionEntry,
  InteractionOptions,
  InteractionRuntime,
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

/**
 * Pacing shared by provider-backed discovery requests. Debounce paces
 * provider calls only; a static suggestion array filters synchronously and
 * needs no pacing.
 */
export interface DiscoveryRequestPacing {
  /**
   * Milliseconds of editing quiet before the provider is called; an edit
   * inside the window restarts it. Zero — the default — calls the provider
   * on every edit.
   */
  readonly debounceMs?: number;
  /** Injectable scheduler driving deterministic debounce tests. */
  readonly scheduler?: InteractionDelayScheduler;
}

const systemDelayScheduler: InteractionDelayScheduler = {
  delay(callback, delayMs) {
    const timer = setTimeout(callback, delayMs);
    return () => clearTimeout(timer);
  },
};

function discoveryDebounceMs(value: number | undefined): number {
  const debounce = value ?? 0;
  if (!Number.isSafeInteger(debounce) || debounce < 0) {
    throw new TypeError(
      `discovery debounce must be a non-negative safe integer of milliseconds; received ${debounce}`,
    );
  }
  return debounce;
}

function isThenable<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof value === "object" && value !== null && "then" in value &&
    typeof (value as { then: unknown }).then === "function";
}

/**
 * One provider conversation: debounced scheduling, monotonic call tagging,
 * abort of superseded calls, and discard of stale resolutions. Constructed
 * pending, because its first refresh is already owed to the initial frame.
 */
class DiscoveryProviderCalls<Result> {
  #context: InteractionMachineContext | undefined;
  #generation = 0;
  #pending = true;
  #cancelDelay: (() => void) | undefined;
  #controller: AbortController | undefined;

  constructor(
    readonly options: {
      readonly call: (
        query: string,
        signal: AbortSignal,
      ) => Result | Promise<Result>;
      readonly apply: (result: Result) => void;
      readonly debounceMs: number;
      readonly scheduler: InteractionDelayScheduler;
    },
  ) {}

  /** Whether shown results still answer an earlier query. */
  get pending(): boolean {
    return this.#pending;
  }

  connect(context: InteractionMachineContext): void {
    this.#context = context;
  }

  /** Issue the initial provider call immediately; debounce paces edits only. */
  prime(query: string): void {
    this.#issue(query);
  }

  /** Request results for the newest query, debouncing rapid edits. */
  refresh(query: string): void {
    this.#cancelDelay?.();
    this.#cancelDelay = undefined;
    if (this.options.debounceMs === 0) {
      this.#issue(query);
      return;
    }
    this.#pending = true;
    this.#cancelDelay = this.options.scheduler.delay(() => {
      this.#cancelDelay = undefined;
      this.#issue(query);
    }, this.options.debounceMs);
  }

  /** Cancel scheduled and in-flight provider work at interaction end. */
  dispose(): void {
    this.#cancelDelay?.();
    this.#cancelDelay = undefined;
    this.#generation += 1;
    this.#controller?.abort();
    this.#controller = undefined;
  }

  #issue(query: string): void {
    const run = ++this.#generation;
    this.#controller?.abort();
    const controller = new AbortController();
    this.#controller = controller;
    this.#pending = true;
    try {
      const result = this.options.call(query, controller.signal);
      if (!isThenable(result)) {
        this.#settle(run, result);
        return;
      }
      result.then(
        (value) => {
          try {
            this.#settle(run, value);
          } catch (error) {
            this.#context?.fail(error);
          }
        },
        (error) => {
          if (run !== this.#generation) return;
          this.#context?.fail(error);
        },
      );
    } catch (error) {
      this.#context?.fail(error);
    }
  }

  #settle(run: number, result: Result): void {
    if (run !== this.#generation) return;
    this.#pending = false;
    this.options.apply(result);
    this.#context?.repaint();
  }
}

/** Synchronous or asynchronous choice provider used by search interactions. */
export type SearchProvider<T> = (
  query: string,
  /** Aborts when a newer query supersedes this call or the request ends. */
  signal: AbortSignal,
) =>
  | readonly InteractionEntry<T>[]
  | Promise<readonly InteractionEntry<T>[]>;

/** Options for a query-driven selectable search interaction. */
export interface SearchRequestOptions<T>
  extends InteractionOptions<T | undefined>, DiscoveryRequestPacing {
  readonly search: SearchProvider<T>;
  /** Stable enabled choice ID highlighted from the initial provider result. */
  readonly initialId?: string;
  readonly placeholder?: string;
  /** Requested upper bound on result rows; the viewport may reduce it per frame. */
  readonly visibleCount?: number;
}

class SearchInteractionMachine<T>
  implements InteractionMachine<T | undefined, SearchFrameState> {
  readonly #editor = new GraphemeTextEditor();
  readonly #visibleCount: number;
  readonly #calls: DiscoveryProviderCalls<readonly InteractionEntry<T>[]>;
  #matches: readonly InteractionEntry<T>[] = [];
  #highlighted: number | undefined;
  #rememberedId: string | undefined;

  constructor(readonly options: SearchRequestOptions<T>) {
    this.#visibleCount = choiceVisibleCount(options.visibleCount);
    this.#rememberedId = options.initialId;
    this.#calls = new DiscoveryProviderCalls({
      call: (query, signal) => options.search(query, signal),
      apply: (entries) => this.#apply(entries),
      debounceMs: discoveryDebounceMs(options.debounceMs),
      scheduler: options.scheduler ?? systemDelayScheduler,
    });
  }

  start(context: InteractionMachineContext): void {
    this.#calls.connect(context);
    this.#calls.prime(this.#editor.value);
  }

  dispose(): void {
    this.#calls.dispose();
  }

  handle(key: TerminalKey): boolean {
    if (isNamedKey(key, "enter")) {
      if (this.#highlighted === undefined) {
        const first = moveEnabledIndex(this.#matches, -1, 1);
        if (first < 0) return this.options.required === false;
        this.#highlighted = first;
        this.#rememberHighlighted();
        return false;
      }
      const entry = this.#matches[this.#highlighted];
      return entry !== undefined && isInteractionChoice(entry) &&
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
      this.#calls.refresh(this.#editor.value);
    }
    return false;
  }

  value(): T | undefined {
    if (this.#highlighted === undefined) return undefined;
    const entry = this.#matches[this.#highlighted];
    return entry === undefined || !isInteractionChoice(entry) ||
        entry.disabled === true
      ? undefined
      : entry.value;
  }

  frame(
    lifecycle: InteractiveFrameLifecycle,
    viewport: InteractionFrameViewport,
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
      ...(this.#calls.pending ? { pending: true } : {}),
      ...(highlightedIndex < 0 ? {} : { highlightedIndex }),
      ...(this.options.hint === undefined ? {} : { hint: this.options.hint }),
      ...(this.options.placeholder === undefined
        ? {}
        : { placeholder: this.options.placeholder }),
    };
  }

  #apply(entries: readonly InteractionEntry<T>[]): void {
    const choices = [...entries];
    assertChoices(choices);
    this.#matches = choices;
    const remembered = this.#rememberedId === undefined
      ? -1
      : choices.findIndex((entry) =>
        isInteractionChoice(entry) && entry.id === this.#rememberedId &&
        entry.disabled !== true
      );
    this.#highlighted = remembered < 0 ? undefined : remembered;
  }

  #rememberHighlighted(): void {
    if (this.#highlighted === undefined) return;
    const entry = this.#matches[this.#highlighted];
    if (
      entry !== undefined && isInteractionChoice(entry) &&
      entry.disabled !== true
    ) {
      this.#rememberedId = entry.id;
    }
  }
}

/** Request a value returned by a synchronous or asynchronous search. */
export async function requestSearch<T>(
  options: SearchRequestOptions<T>,
  runtime: InteractionRuntime = {},
): Promise<T | undefined> {
  const requiredOptions: SearchRequestOptions<T> = {
    ...options,
    required: options.required ?? true,
  };
  return await runInteraction(
    requiredOptions,
    new SearchInteractionMachine(requiredOptions),
    runtime,
    renderSearchFrame,
  );
}

/** Synchronous or asynchronous source for autocomplete candidates. */
export type AutocompleteProvider = (
  query: string,
  /** Aborts when a newer value supersedes this call or the request ends. */
  signal: AbortSignal,
) => readonly string[] | Promise<readonly string[]>;

/** Options for an editable line with one inline ghost completion. */
export interface AutocompleteRequestOptions
  extends InteractionOptions<string>, DiscoveryRequestPacing {
  readonly suggestions: readonly string[] | AutocompleteProvider;
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

class AutocompleteInteractionMachine
  implements InteractionMachine<string, AutocompleteFrameState> {
  readonly #editor: GraphemeTextEditor;
  readonly #calls: DiscoveryProviderCalls<readonly string[]> | undefined;
  readonly #static: readonly string[] | undefined;
  #suggestions: readonly string[] = [];
  #highlighted = 0;

  constructor(readonly options: AutocompleteRequestOptions) {
    this.#editor = new GraphemeTextEditor(options.initialValue ?? "");
    if (typeof options.suggestions === "function") {
      const provider = options.suggestions;
      this.#calls = new DiscoveryProviderCalls({
        call: (query, signal) => provider(query, signal),
        apply: (suggestions) => this.#apply(suggestions),
        debounceMs: discoveryDebounceMs(options.debounceMs),
        scheduler: options.scheduler ?? systemDelayScheduler,
      });
    } else {
      this.#static = options.suggestions;
      this.#refresh();
    }
  }

  start(context: InteractionMachineContext): void {
    if (this.#calls === undefined) return;
    this.#calls.connect(context);
    this.#calls.prime(this.#editor.value);
  }

  dispose(): void {
    this.#calls?.dispose();
  }

  handle(key: TerminalKey): boolean {
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
      this.#refresh();
      return false;
    }
    if (this.#editor.handle(key)) this.#refresh();
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
      ...(this.#calls?.pending === true ? { pending: true } : {}),
      ...(this.options.hint === undefined ? {} : { hint: this.options.hint }),
      ...(this.options.placeholder === undefined
        ? {}
        : { placeholder: this.options.placeholder }),
    };
  }

  #refresh(): void {
    if (this.#static !== undefined) {
      this.#apply(
        this.#static.filter((suggestion) =>
          suggestion.toLocaleLowerCase().startsWith(
            this.#editor.value.toLocaleLowerCase(),
          )
        ),
      );
      return;
    }
    this.#calls?.refresh(this.#editor.value);
  }

  #apply(suggestions: readonly string[]): void {
    assertSuggestions(suggestions);
    this.#suggestions = [...suggestions];
    this.#highlighted = Math.min(
      this.#highlighted,
      Math.max(0, suggestions.length - 1),
    );
  }

  #moveSuggestion(direction: -1 | 1): number {
    if (this.#suggestions.length === 0) return 0;
    return ((this.#highlighted + direction) % this.#suggestions.length +
      this.#suggestions.length) % this.#suggestions.length;
  }
}

/** Request text with a ghost completion accepted by Tab or Right Arrow. */
export async function requestAutocomplete(
  options: AutocompleteRequestOptions,
  runtime: InteractionRuntime = {},
): Promise<string> {
  return await runInteraction(
    options,
    new AutocompleteInteractionMachine(options),
    runtime,
    renderAutocompleteFrame,
  );
}
