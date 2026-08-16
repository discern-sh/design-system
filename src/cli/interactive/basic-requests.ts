/**
 * Text, masked-text, confirmation, and acknowledgement interaction state
 * machines.
 *
 * @module
 */

import type {
  AcknowledgementFrameState,
  ConfirmFrameState,
  InteractiveFrameLifecycle,
  MaskedInputFrameState,
  TextInputFrameState,
} from "../interactive-states.ts";
import type { TerminalCapabilities } from "../capabilities.ts";
import type { CliPresentationOptions } from "../contracts.ts";
import renderFieldCli from "../../components/forms/field/field.cli.ts";
import renderInputCli from "../../components/forms/input/input.cli.ts";
import renderSwitchCli from "../../components/forms/switch/switch.cli.ts";
import { GraphemeTextEditor, segmentGraphemes } from "./editor.ts";
import { type InteractionMachine, runInteraction } from "./driver.ts";
import { isNamedKey, type TerminalKey } from "./keys.ts";
import type { InteractionOptions, InteractionRuntime } from "./types.ts";

function renderInputFrame(
  state: TextInputFrameState | MaskedInputFrameState,
  capabilities: TerminalCapabilities,
  presentation: CliPresentationOptions,
): string {
  return renderInputCli({
    ...state,
    ...presentation,
  }, capabilities);
}

function renderConfirmFrame(
  state: ConfirmFrameState,
  capabilities: TerminalCapabilities,
  presentation: CliPresentationOptions,
): string {
  return renderSwitchCli({
    ...state,
    ...presentation,
  }, capabilities);
}

/** Options for one editable line of text. */
export interface TextRequestOptions extends InteractionOptions<string> {
  readonly placeholder?: string;
  readonly initialValue?: string;
}

class TextInteractionMachine
  implements InteractionMachine<string, TextInputFrameState> {
  readonly #editor: GraphemeTextEditor;

  constructor(readonly options: TextRequestOptions) {
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

/** Request one grapheme-aware editable line. */
export async function requestText(
  options: TextRequestOptions,
  runtime: InteractionRuntime = {},
): Promise<string> {
  return await runInteraction(
    options,
    new TextInteractionMachine(options),
    runtime,
    renderInputFrame,
  );
}

/** Options for one masked editable line. */
export interface MaskedTextRequestOptions extends InteractionOptions<string> {
  readonly placeholder?: string;
}

class MaskedTextInteractionMachine
  implements InteractionMachine<string, MaskedInputFrameState> {
  readonly #editor = new GraphemeTextEditor();

  constructor(readonly options: MaskedTextRequestOptions) {}

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

/** Request text whose raw value never enters a frame state or terminal write. */
export async function requestMaskedText(
  options: MaskedTextRequestOptions,
  runtime: InteractionRuntime = {},
): Promise<string> {
  return await runInteraction(
    options,
    new MaskedTextInteractionMachine(options),
    runtime,
    renderInputFrame,
  );
}

/** Options for a yes/no confirmation interaction. */
export interface ConfirmationRequestOptions
  extends InteractionOptions<boolean> {
  readonly initialValue?: boolean;
  readonly yesLabel?: string;
  readonly noLabel?: string;
}

class ConfirmationInteractionMachine
  implements InteractionMachine<boolean, ConfirmFrameState> {
  #value: boolean;

  constructor(readonly options: ConfirmationRequestOptions) {
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

/** Request a boolean decision. */
export async function requestConfirmation(
  options: ConfirmationRequestOptions,
  runtime: InteractionRuntime = {},
): Promise<boolean> {
  return await runInteraction(
    options,
    new ConfirmationInteractionMachine(options),
    runtime,
    renderConfirmFrame,
  );
}

function renderAcknowledgementFrame(
  state: AcknowledgementFrameState,
  capabilities: TerminalCapabilities,
  presentation: CliPresentationOptions,
): string {
  return renderFieldCli({
    ...state,
    ...presentation,
  }, capabilities);
}

/** Options for a message acknowledged with Enter or Space. */
export interface AcknowledgementRequestOptions extends
  Pick<
    InteractionOptions<undefined>,
    "label" | "hint" | "reservedRows"
  > {
  /** The message to acknowledge; long lines wrap inside the frame. */
  readonly message: string;
}

function assertAcknowledgementMessage(message: string): void {
  if (message.trim() === "") {
    throw new TypeError("acknowledgement message must be non-empty");
  }
  if (/[^\P{Cc}\n]/u.test(message)) {
    throw new TypeError(
      "acknowledgement message must be control-free apart from newlines",
    );
  }
}

class AcknowledgementInteractionMachine
  implements InteractionMachine<undefined, AcknowledgementFrameState> {
  constructor(readonly options: AcknowledgementRequestOptions) {
    assertAcknowledgementMessage(options.message);
  }

  handle(key: TerminalKey): boolean {
    return isNamedKey(key, "enter") ||
      (key.kind === "text" && key.text === " ");
  }

  value(): undefined {
    return undefined;
  }

  frame(lifecycle: InteractiveFrameLifecycle): AcknowledgementFrameState {
    return {
      kind: "acknowledgement",
      label: this.options.label,
      lifecycle,
      message: this.options.message,
      hint: this.options.hint ?? "Press Enter to continue.",
    };
  }
}

/**
 * Present a message until the person acknowledges it with Enter or Space.
 * Cancellation follows the standard contract: Escape dismisses, Ctrl+C
 * cancels, and end of input ends the request.
 */
export async function requestAcknowledgement(
  options: AcknowledgementRequestOptions,
  runtime: InteractionRuntime = {},
): Promise<void> {
  await runInteraction(
    {
      label: options.label,
      ...(options.reservedRows === undefined
        ? {}
        : { reservedRows: options.reservedRows }),
    },
    new AcknowledgementInteractionMachine(options),
    runtime,
    renderAcknowledgementFrame,
  );
}
