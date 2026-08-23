/** Semantic authoring and validated data contracts for cycle diagrams. */

import type { ValidatedDiagramSpec } from "../../dispatch.ts";
import type { DiagramCommonSpec } from "../../spec.ts";

/** One stable stage in authored repeating order. */
export interface CycleStageSpec {
  readonly id: string;
  readonly label: string;
  readonly annotation?: string;
}

/** Optional concept shared by every stage, placed at the centre of the loop. */
export interface CycleHubSpec {
  readonly id: string;
  readonly label: string;
  readonly annotation?: string;
}

/** Direction of one named stage-to-hub relationship. */
export type CycleSpokeDirection = "to-hub" | "from-hub";

/** One labelled relationship between a stage and the optional hub. */
export interface CycleSpokeSpec {
  readonly id: string;
  readonly stageId: string;
  readonly direction: CycleSpokeDirection;
  readonly label: string;
}

/** JSON-safe documentation-scale repeating sequence. */
export interface CycleDiagramSpec extends DiagramCommonSpec {
  readonly kind: "cycle";
  readonly stages: readonly CycleStageSpec[];
  readonly hub?: CycleHubSpec;
  readonly spokes?: readonly CycleSpokeSpec[];
}

/** Normalized stage consumed by descriptions and layout. */
export interface ValidatedCycleStage extends CycleStageSpec {
  readonly sourceOrder: number;
}

/** Normalized hub consumed by descriptions and layout. */
export interface ValidatedCycleHub extends CycleHubSpec {}

/** Normalized spoke consumed by descriptions and layout. */
export interface ValidatedCycleSpoke extends CycleSpokeSpec {
  readonly sourceOrder: number;
}

/** Fully checked cycle consumed by descriptions and layout. */
export interface ValidatedCycleDiagram extends ValidatedDiagramSpec {
  readonly kind: "cycle";
  readonly title: string;
  readonly summary: string;
  readonly stages: readonly ValidatedCycleStage[];
  readonly hub?: ValidatedCycleHub;
  readonly spokes: readonly ValidatedCycleSpoke[];
}
