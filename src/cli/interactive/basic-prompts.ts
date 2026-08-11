/**
 * Text, masked-text, and confirmation prompt state machines.
 *
 * @module
 */

import type {
  ConfirmFrameState,
  InteractiveFrameLifecycle,
  MaskedInputFrameState,
  TextInputFrameState,
} from "../interactive-states.ts";
import type { TerminalCapabilities } from "../capabilities.ts";
import type { TerminalThemeVariant } from "../theme.ts";
import renderInputCli from "../../components/forms/input/input.cli.ts";
import renderSwitchCli from "../../components/forms/switch/switch.cli.ts";
import { GraphemeTextEditor, segmentGraphemes } from "./editor.ts";
import { type PromptMachine, runPrompt } from "./driver.ts";
import { isNamedKey, type TerminalKey } from "./keys.ts";
import type { PromptOptions, PromptRuntime } from "./types.ts";

function renderInputFrame(
  state: TextInputFrameState | MaskedInputFrameState,
  capabilities: TerminalCapabilities,
  theme: TerminalThemeVariant | undefined,
): string {
  return renderInputCli({
    ...state,
    ...(theme === undefined ? {} : { theme }),
  }, capabilities);
}

function renderConfirmFrame(
  state: ConfirmFrameState,
  capabilities: TerminalCapabilities,
  theme: TerminalThemeVariant | undefined,
): string {
  return renderSwitchCli({
    ...state,
    ...(theme === undefined ? {} : { theme }),
  }, capabilities);
}

/** Options for one editable line of text. */
export interface TextPromptOptions extends PromptOptions<string> {
  readonly placeholder?: string;
  readonly initialValue?: string;
}

class TextPromptMachine implements PromptMachine<string, TextInputFrameState> {
  readonly #editor: GraphemeTextEditor;

  constructor(readonly options: TextPromptOptions) {
    this.#editor = new GraphemeTextEditor(options.initialValue ?? "");
  }

  handle(key: TerminalKey): boolean {
    if (isNamedKey(key, "enter")) return true;
    this.#editor.handle(key);
    return false;
  }

  value(): string {
    return this.#editor.value;
  }

  frame(lifecycle: InteractiveFrameLifecycle): TextInputFrameState {
    return {
      kind: "text-input",
      label: this.options.label,
      lifecycle,
      value: this.#editor.value,
      cursor: this.#editor.cursor,
      ...(this.options.hint === undefined ? {} : { hint: this.options.hint }),
      ...(this.options.placeholder === undefined
        ? {}
        : { placeholder: this.options.placeholder }),
    };
  }
}

/** Prompt for one grapheme-aware editable line. */
export async function promptText(
  options: TextPromptOptions,
  runtime: PromptRuntime = {},
): Promise<string> {
  return await runPrompt(
    options,
    new TextPromptMachine(options),
    runtime,
    renderInputFrame,
  );
}

/** Options for one masked editable line. */
export interface MaskedPromptOptions extends PromptOptions<string> {
  readonly placeholder?: string;
}

class MaskedPromptMachine
  implements PromptMachine<string, MaskedInputFrameState> {
  readonly #editor = new GraphemeTextEditor();

  constructor(readonly options: MaskedPromptOptions) {}

  handle(key: TerminalKey): boolean {
    if (isNamedKey(key, "enter")) return true;
    this.#editor.handle(key);
    return false;
  }

  value(): string {
    return this.#editor.value;
  }

  frame(lifecycle: InteractiveFrameLifecycle): MaskedInputFrameState {
    return {
      kind: "masked-input",
      label: this.options.label,
      lifecycle,
      valueLength: segmentGraphemes(this.#editor.value).length,
      cursor: this.#editor.cursor,
      ...(this.options.hint === undefined ? {} : { hint: this.options.hint }),
      ...(this.options.placeholder === undefined
        ? {}
        : { placeholder: this.options.placeholder }),
    };
  }
}

/** Prompt for text whose raw value never enters a frame state or terminal write. */
export async function promptMasked(
  options: MaskedPromptOptions,
  runtime: PromptRuntime = {},
): Promise<string> {
  return await runPrompt(
    options,
    new MaskedPromptMachine(options),
    runtime,
    renderInputFrame,
  );
}

/** Options for a yes/no confirmation prompt. */
export interface ConfirmPromptOptions extends PromptOptions<boolean> {
  readonly initialValue?: boolean;
  readonly yesLabel?: string;
  readonly noLabel?: string;
}

class ConfirmPromptMachine
  implements PromptMachine<boolean, ConfirmFrameState> {
  #value: boolean;

  constructor(readonly options: ConfirmPromptOptions) {
    this.#value = options.initialValue ?? true;
  }

  handle(key: TerminalKey): boolean {
    if (isNamedKey(key, "enter")) return true;
    if (key.kind === "text" && /^[yY]$/u.test(key.text)) {
      this.#value = true;
    } else if (key.kind === "text" && /^[nN]$/u.test(key.text)) {
      this.#value = false;
    } else if (
      (key.kind === "text" && /^[hjkl]$/u.test(key.text)) ||
      (key.kind === "named" && [
        "tab",
        "shift-tab",
        "up",
        "down",
        "left",
        "right",
        "ctrl-b",
        "ctrl-f",
        "ctrl-n",
        "ctrl-p",
      ].includes(key.name))
    ) {
      this.#value = !this.#value;
    }
    return false;
  }

  value(): boolean {
    return this.#value;
  }

  frame(lifecycle: InteractiveFrameLifecycle): ConfirmFrameState {
    return {
      kind: "confirm",
      label: this.options.label,
      lifecycle,
      value: this.#value,
      yesLabel: this.options.yesLabel ?? "Yes",
      noLabel: this.options.noLabel ?? "No",
      ...(this.options.hint === undefined ? {} : { hint: this.options.hint }),
    };
  }
}

/** Prompt for a boolean decision. */
export async function promptConfirm(
  options: ConfirmPromptOptions,
  runtime: PromptRuntime = {},
): Promise<boolean> {
  return await runPrompt(
    options,
    new ConfirmPromptMachine(options),
    runtime,
    renderConfirmFrame,
  );
}
