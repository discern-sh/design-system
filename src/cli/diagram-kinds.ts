/**
 * Pure contracts for generated enhanced diagram-kind terminal projection.
 * This module belongs exclusively to the `./cli` graph.
 *
 * @module
 */

import type { TerminalCapabilities } from "./capabilities.ts";
import type { TerminalThemeVariant } from "./theme.ts";
import type { DiagramSpec } from "../generated/diagram-spec.ts";

/** Stable reason an enhanced projector cannot preserve a spec coherently. */
export type DiagramKindCliDeclineCode =
  | "width"
  | "title-width"
  | "summary-wrap"
  | "node-count"
  | "edge-count"
  | "rank-depth"
  | "rank-width"
  | "branching"
  | "return-edges"
  | "node-wrap"
  | "edge-wrap"
  | "stage-count"
  | "spoke-count"
  | "stage-wrap"
  | "relationship-wrap"
  | "participant-count"
  | "message-count"
  | "participant-wrap"
  | "message-wrap"
  | "note-wrap";

/** Typed, non-error refusal that routes the caller to universal description. */
export interface DiagramKindCliDecline {
  readonly kind: "declined";
  readonly code: DiagramKindCliDeclineCode;
  readonly fact: number;
  readonly limit: number;
}

/** Complete enhanced terminal frame that preserves the authored facts. */
export interface DiagramKindCliFrame {
  readonly kind: "frame";
  readonly frame: string;
}

/** Result of opportunistic enhanced terminal projection. */
export type DiagramKindCliProjection =
  | DiagramKindCliDecline
  | DiagramKindCliFrame;

/** Explicit environment supplied to a pure enhanced kind projector. */
export interface DiagramKindCliProjectorContext {
  readonly capabilities: TerminalCapabilities;
  readonly maxWidth: number;
  readonly theme: TerminalThemeVariant;
  readonly description: string;
}

/** Pure enhanced projector for one normalized built-in kind. */
export type DiagramKindCliProjector<
  Kind extends DiagramSpec["kind"] = DiagramSpec["kind"],
> = (
  spec: Extract<DiagramSpec, { readonly kind: Kind }>,
  context: DiagramKindCliProjectorContext,
) => DiagramKindCliProjection;

/** Generated entry for a kind that always uses universal description. */
export interface DiagramKindCliDescriptionEntry {
  readonly stance: "description";
}

/** Generated entry carrying the imported pure enhanced projector. */
export interface DiagramKindCliEnhancedEntry<
  Kind extends DiagramSpec["kind"] = DiagramSpec["kind"],
> {
  readonly stance: "enhanced";
  readonly project: DiagramKindCliProjector<Kind>;
}

/** Exhaustive callable CLI registry derived from authored kind Metadata. */
export type DiagramKindCliRegistry = {
  readonly [Kind in DiagramSpec["kind"]]:
    | DiagramKindCliDescriptionEntry
    | DiagramKindCliEnhancedEntry<Kind>;
};
