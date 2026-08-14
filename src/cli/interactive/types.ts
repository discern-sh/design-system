/**
 * Public option and runtime contracts shared by terminal interactions.
 *
 * @module
 */

import type { TerminalThemeVariant } from "../theme.ts";
import type { TerminalIO } from "./io.ts";

/** Synchronous or asynchronous validation performed before interaction submission. */
export type InteractionValidator<T> = (
  value: T,
) => string | undefined | Promise<string | undefined>;

/** Required-value policy with an optional caller-authored error message. */
export type InteractionRequired = boolean | string;

/** Options shared by every value-producing interaction. */
export interface InteractionOptions<T> {
  readonly label: string;
  readonly hint?: string;
  readonly required?: InteractionRequired;
  readonly validate?: InteractionValidator<T>;
}

/** Injectable process and presentation facts shared by interaction loops. */
export interface InteractionRuntime {
  readonly io?: TerminalIO;
  readonly theme?: TerminalThemeVariant;
  /** Allow Ctrl+U to return control to a sequential form's prior step. */
  readonly canGoBack?: boolean;
}

/** One stable, labeled value offered by a choice interaction. */
export interface InteractionChoice<T> {
  /** Optional explicit discriminant; omitted choices remain source-compatible. */
  readonly kind?: "choice";
  readonly id: string;
  readonly label: string;
  readonly value: T;
  readonly disabled?: boolean;
}

/** A stable semantic group heading displayed inside a choice interaction. */
export interface InteractionGroupHeading {
  readonly kind: "group-heading";
  readonly id: string;
  readonly label: string;
  /** Group headings never carry a caller value. */
  readonly value?: never;
  /** Group headings are structural rather than disabled choices. */
  readonly disabled?: never;
}

/** Selectable values and semantic group headings accepted by choice interactions. */
export type InteractionEntry<T> =
  | InteractionChoice<T>
  | InteractionGroupHeading;
