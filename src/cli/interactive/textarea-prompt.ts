/**
 * Multiline textarea prompt state machine.
 *
 * @module
 */

import type {
  InteractiveFrameLifecycle,
  TextareaFrameState,
} from "../interactive-states.ts";
import type { TerminalCapabilities } from "../capabilities.ts";
import type { TerminalThemeVariant } from "../theme.ts";
import renderTextareaCli from "../../components/forms/textarea/textarea.cli.ts";
import { type PromptMachine, runPrompt } from "./driver.ts";
import { GraphemeTextEditor } from "./editor.ts";
import { isNamedKey, type TerminalKey } from "./keys.ts";
import type { PromptOptions, PromptRuntime } from "./types.ts";

function renderTextareaFrame(
  state: TextareaFrameState,
  capabilities: TerminalCapabilities,
  theme: TerminalThemeVariant | undefined,
): string {
  return renderTextareaCli({
    ...state,
    ...(theme === undefined ? {} : { theme }),
  }, capabilities);
}

/** Options for a grapheme-aware multiline textarea. */
export interface TextareaPromptOptions extends PromptOptions<string> {
  readonly placeholder?: string;
  readonly initialValue?: string;
  readonly rows?: number;
}

function textareaRows(value: number | undefined): number {
  const rows = value ?? 5;
  if (!Number.isSafeInteger(rows) || rows < 1) {
    throw new TypeError(
      `textarea rows must be a positive safe integer; received ${rows}`,
    );
  }
  return rows;
}

class TextareaPromptMachine
  implements PromptMachine<string, TextareaFrameState> {
  readonly #editor: GraphemeTextEditor;
  readonly #rows: number;

  constructor(readonly options: TextareaPromptOptions) {
    this.#editor = new GraphemeTextEditor(options.initialValue ?? "");
    this.#rows = textareaRows(options.rows);
  }

  handle(key: TerminalKey): boolean {
    if (isNamedKey(key, "ctrl-d")) return true;
    this.#editor.handle(key, { multiline: true });
    return false;
  }

  value(): string {
    return this.#editor.value;
  }

  frame(lifecycle: InteractiveFrameLifecycle): TextareaFrameState {
    return {
      kind: "textarea",
      label: this.options.label,
      lifecycle,
      value: this.#editor.value,
      cursor: this.#editor.cursor,
      rows: this.#rows,
      ...(this.options.hint === undefined
        ? { hint: "Ctrl+D to submit" }
        : { hint: this.options.hint }),
      ...(this.options.placeholder === undefined
        ? {}
        : { placeholder: this.options.placeholder }),
    };
  }
}

/** Prompt for multiline text, submitted with Ctrl+D. */
export async function promptTextarea(
  options: TextareaPromptOptions,
  runtime: PromptRuntime = {},
): Promise<string> {
  return await runPrompt(
    options,
    new TextareaPromptMachine(options),
    runtime,
    renderTextareaFrame,
  );
}
