/** Semantic authoring and validated data contracts for flow diagrams. */

import type { ValidatedDiagramSpec } from "../../dispatch.ts";
import type { DiagramCommonSpec } from "../../spec.ts";

/** Primary rank direction for a documentation flow. */
export type FlowDirection = "top-to-bottom" | "left-to-right";

/** Restrained semantic role with a matching non-colour shape cue. */
export type FlowNodeRole = "step" | "decision" | "start" | "end";

/** Progression importance or an explicitly backwards loop. */
export type FlowEdgeEmphasis = "primary" | "secondary" | "return";

/** One stable process entity. */
export interface FlowNodeSpec {
  readonly id: string;
  readonly label: string;
  readonly annotation?: string;
  readonly role?: FlowNodeRole;
}

/** One directed semantic relationship between process entities. */
export interface FlowEdgeSpec {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly label?: string;
  readonly emphasis?: FlowEdgeEmphasis;
}

/** JSON-safe documentation-scale directed process. */
export interface FlowDiagramSpec extends DiagramCommonSpec {
  readonly kind: "flow";
  readonly direction?: FlowDirection;
  readonly nodes: readonly FlowNodeSpec[];
  readonly edges: readonly FlowEdgeSpec[];
}

/** Normalized node returned by complete flow preflight. */
export interface ValidatedFlowNode {
  readonly id: string;
  readonly label: string;
  readonly annotation?: string;
  readonly role: FlowNodeRole;
  readonly sourceOrder: number;
  readonly rank: number;
  readonly rankOrder: number;
}

/** Normalized edge returned by complete flow preflight. */
export interface ValidatedFlowEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly label?: string;
  readonly emphasis: FlowEdgeEmphasis;
  readonly sourceOrder: number;
}

/** Fully checked flow consumed by descriptions and layout. */
export interface ValidatedFlowDiagram extends ValidatedDiagramSpec {
  readonly kind: "flow";
  readonly title: string;
  readonly summary: string;
  readonly direction: FlowDirection;
  readonly nodes: readonly ValidatedFlowNode[];
  readonly edges: readonly ValidatedFlowEdge[];
  readonly ranks: readonly (readonly string[])[];
}
