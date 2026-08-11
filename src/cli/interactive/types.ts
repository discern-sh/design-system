/**
 * Public option and runtime contracts shared by interactive prompts.
 *
 * @module
 */

import type { TerminalThemeVariant } from "../theme.ts";
import type { TerminalIO } from "./io.ts";

/** Synchronous or asynchronous validation performed before prompt submission. */
export type PromptValidator<T> = (
  value: T,
) => string | undefined | Promise<string | undefined>;

/** Required-value policy with an optional caller-authored error message. */
export type PromptRequired = boolean | string;

/** Options shared by every value-producing prompt. */
export interface PromptOptions<T> {
  readonly label: string;
  readonly hint?: string;
  readonly required?: PromptRequired;
  readonly validate?: PromptValidator<T>;
}

/** Injectable process and presentation facts shared by prompt loops. */
export interface PromptRuntime {
  readonly io?: TerminalIO;
  readonly theme?: TerminalThemeVariant;
  /** Allow Ctrl+U to return control to a sequential form's prior step. */
  readonly canGoBack?: boolean;
}

/** One stable, labeled value offered by a choice prompt. */
export interface PromptChoice<T> {
  readonly id: string;
  readonly label: string;
  readonly value: T;
  readonly disabled?: boolean;
}
