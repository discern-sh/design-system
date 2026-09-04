/**
 * Pure contracts for generated enhanced chart-kind terminal projection.
 * This module belongs exclusively to the `./cli` graph.
 *
 * @module
 */

import type { TerminalCapabilities } from "./capabilities.ts";
import type { TerminalAppearance, TerminalThemeVariant } from "./theme.ts";
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
  | "collision-count"
  | "mixed-series-collision";

/** Reader-facing dimension and practical recovery for every decline class. */
export const CHART_KIND_CLI_DECLINE_GUIDANCE = {
  width: {
    dimension: "terminal width",
    remedy: "Widen the terminal or use the lossless description table.",
  },
  "title-width": {
    dimension: "title width",
    remedy: "Shorten the title or widen the terminal.",
  },
  "label-wrap": {
    dimension: "unbreakable label width",
    remedy: "Shorten the named label or widen the terminal.",
  },
  "segment-resolution": {
    dimension: "segment resolution",
    remedy:
      "Widen the terminal, aggregate the smallest members, or split the figure.",
  },
  "mono-series": {
    dimension: "colourless series count",
    remedy: "Reduce the series count, enable colour, or split the figure.",
  },
  "collision-count": {
    dimension: "points in one quantized cell",
    remedy:
      "Split overlapping observations into focused figures or use the lossless description table.",
  },
  "mixed-series-collision": {
    dimension: "mixed-series quantized cells",
    remedy:
      "Separate the colliding series into focused figures or use the lossless description table.",
  },
} as const satisfies Readonly<
  Record<ChartKindCliDeclineCode, {
    readonly dimension: string;
    readonly remedy: string;
  }>
>;

/** Typed, non-error refusal that routes the caller to universal description. */
export interface ChartKindCliDecline {
  readonly kind: "declined";
  readonly code: ChartKindCliDeclineCode;
  readonly fact: number;
  readonly limit: number;
  readonly dimension: string;
  readonly remedy: string;
}

/** Construct one decline from the exhaustive guidance authority. */
export function chartKindCliDecline(
  code: ChartKindCliDeclineCode,
  fact: number,
  limit: number,
): ChartKindCliDecline {
  const guidance = CHART_KIND_CLI_DECLINE_GUIDANCE[code];
  return { kind: "declined", code, fact, limit, ...guidance };
}

/** Reader-facing explanation rendered before the lossless fallback table. */
export function chartKindCliDeclineMessage(
  decline: ChartKindCliDecline,
): string {
  const comparison = decline.code === "width"
    ? `${decline.fact} columns is below the ${decline.limit}-column minimum`
    : `${decline.fact} exceeds the supported limit ${decline.limit}`;
  return `Enhanced chart unavailable: ${decline.dimension} (${comparison}). ${decline.remedy}`;
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
  readonly appearance?: TerminalAppearance;
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
