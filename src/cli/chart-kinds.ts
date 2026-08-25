/**
 * Pure contracts for generated enhanced chart-kind terminal projection.
 * This module belongs exclusively to the `./cli` graph.
 *
 * @module
 */

import type { TerminalCapabilities } from "./capabilities.ts";
import type { TerminalThemeVariant } from "./theme.ts";
import type { ChartSpec, ValidatedChart } from "../generated/chart-spec.ts";

/**
 * Stable reason an enhanced projector cannot stay inside its declared
 * honesty tier: the frame is narrower than the kind's minimum envelope, the
 * title cannot embed, a label would need an incoherent mid-word split, a
 * proportion segment cannot occupy one whole cell without rounding a stated
 * value away, a colourless frame cannot keep that many series apart, or a
 * quantized cell holds more coincident points than one digit can state.
 */
export type ChartKindCliDeclineCode =
  | "width"
  | "title-width"
  | "label-wrap"
  | "segment-resolution"
  | "mono-series"
  | "collision-count";

/** Typed, non-error refusal that routes the caller to universal description. */
export interface ChartKindCliDecline {
  readonly kind: "declined";
  readonly code: ChartKindCliDeclineCode;
  readonly fact: number;
  readonly limit: number;
}

/** Complete enhanced terminal frame inside the kind's declared honesty tier. */
export interface ChartKindCliFrame {
  readonly kind: "frame";
  readonly frame: string;
}

/** Result of opportunistic enhanced terminal projection. */
export type ChartKindCliProjection =
  | ChartKindCliDecline
  | ChartKindCliFrame;

/** Explicit environment supplied to a pure enhanced kind projector. */
export interface ChartKindCliProjectorContext {
  readonly capabilities: TerminalCapabilities;
  readonly maxWidth: number;
  readonly theme: TerminalThemeVariant;
  readonly description: string;
}

/** Pure enhanced projector for one normalized built-in kind. */
export type ChartKindCliProjector<
  Kind extends ChartSpec["kind"] = ChartSpec["kind"],
> = (
  spec: Extract<ValidatedChart, { readonly kind: Kind }>,
  context: ChartKindCliProjectorContext,
) => ChartKindCliProjection;

/** Generated entry for a kind that always uses universal description. */
export interface ChartKindCliDescriptionEntry {
  readonly stance: "description";
}

/** Generated entry carrying the imported pure enhanced projector. */
export interface ChartKindCliEnhancedEntry<
  Kind extends ChartSpec["kind"] = ChartSpec["kind"],
> {
  readonly stance: "enhanced";
  readonly project: ChartKindCliProjector<Kind>;
}

/** Exhaustive callable CLI registry derived from authored kind Metadata. */
export type ChartKindCliRegistry = {
  readonly [Kind in ChartSpec["kind"]]:
    | ChartKindCliDescriptionEntry
    | ChartKindCliEnhancedEntry<Kind>;
};
