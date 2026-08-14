/**
 * Multiline textarea interaction state machine.
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
import { type InteractionMachine, runInteraction } from "./driver.ts";
import { GraphemeTextEditor } from "./editor.ts";
import { isNamedKey, type TerminalKey } from "./keys.ts";
import type { InteractionOptions, InteractionRuntime } from "./types.ts";
import type { InteractionFrameViewport } from "./viewport-budget.ts";

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
export interface TextareaRequestOptions extends InteractionOptions<string> {
  readonly placeholder?: string;
  readonly initialValue?: string;
  /** Requested upper bound on editable rows; the viewport may reduce it per frame. */
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

class TextareaInteractionMachine
  implements InteractionMachine<string, TextareaFrameState> {
  readonly #editor: GraphemeTextEditor;
  readonly #rows: number;

  constructor(readonly options: TextareaRequestOptions) {
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

  frame(
    lifecycle: InteractiveFrameLifecycle,
    viewport: InteractionFrameViewport,
  ): TextareaFrameState {
    return {
      kind: "textarea",
      label: this.options.label,
      lifecycle,
      value: this.#editor.value,
      cursor: this.#editor.cursor,
      rows: Math.min(this.#rows, viewport.maximumControlRows),
      ...(this.options.hint === undefined
        ? { hint: "Ctrl+D to submit" }
        : { hint: this.options.hint }),
      ...(this.options.placeholder === undefined
        ? {}
        : { placeholder: this.options.placeholder }),
    };
  }
}

/** Request multiline text, submitted with Ctrl+D. */
export async function requestTextarea(
  options: TextareaRequestOptions,
  runtime: InteractionRuntime = {},
): Promise<string> {
  return await runInteraction(
    options,
    new TextareaInteractionMachine(options),
    runtime,
    renderTextareaFrame,
  );
}
