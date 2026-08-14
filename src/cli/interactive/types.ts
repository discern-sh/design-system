/**
 * Public option and runtime contracts shared by terminal interactions.
 *
 * @module
 */

import type { TerminalThemeVariant } from "../theme.ts";
import type { TerminalIO } from "./io.ts";
import type { TerminalSignalOptions } from "./signals.ts";

/** Synchronous or asynchronous validation performed before interaction submission. */
export type InteractionValidator<T> = (
  value: T,
) => string | undefined | Promise<string | undefined>;

/** Required-value policy with an optional caller-authored error message. */
export type InteractionRequired = boolean | string;

/**
 * Synchronous canonicalisation applied to a submitted value before any
 * validation. The transformed value is what the required check and validator
 * see and what the interaction returns; the frame keeps presenting the value
 * as edited, and a masked value stays masked throughout.
 */
export type InteractionTransform<T> = (value: T) => T;

/** Options shared by every value-producing interaction. */
export interface InteractionOptions<T> {
  readonly label: string;
  readonly hint?: string;
  readonly required?: InteractionRequired;
  /**
   * Terminal rows above the frame that the caller's own composition
   * occupies — a board header, a task preamble. Frame fitting targets the
   * live viewport minus this reservation, so a full-budget frame never
   * scrolls the caller's rows away. Zero — the default — keeps frames
   * byte-identical to an unreserved request, and a reservation taller than
   * the viewport degrades exactly like a too-short terminal.
   */
  readonly reservedRows?: number;
  /** Runs first: transform, then the required check, then `validate`. */
  readonly transform?: InteractionTransform<T>;
  readonly validate?: InteractionValidator<T>;
}

/**
 * Injectable one-shot scheduler behind time-advancing request machinery,
 * mirroring the spinner's injectable repetition: tests advance debounce
 * windows deterministically instead of sleeping through real timers.
 */
export interface InteractionDelayScheduler {
  /** Call `callback` once after `delayMs`; returns an idempotent cancellation. */
  delay(callback: () => void, delayMs: number): () => void;
}

/**
 * Injectable process and presentation facts shared by interaction loops,
 * including the SIGINT posture forwarded to the raw-terminal bracket.
 */
export interface InteractionRuntime extends TerminalSignalOptions {
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
