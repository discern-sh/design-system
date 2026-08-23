/** Semantic authoring and validated data contracts for calendar timelines. */

import type { ValidatedDiagramSpec } from "../../dispatch.ts";
import type { DiagramCommonSpec } from "../../spec.ts";

/** Explicit half-open calendar range shared by the plan and every task. */
export interface TimelineDateRangeSpec {
  /** First included ISO calendar date. */
  readonly start: string;
  /** First excluded ISO calendar date. */
  readonly end: string;
}

/** One labelled plan boundary containing one or more rows. */
export interface TimelineGroupSpec {
  readonly id: string;
  readonly label: string;
  readonly annotation?: string;
}

/** One stable row owned by exactly one plan group. */
export interface TimelineRowSpec {
  readonly id: string;
  readonly groupId: string;
  readonly label: string;
}

/** One duration bar using the kind's fixed half-open date semantics. */
export interface TimelineTaskSpec extends TimelineDateRangeSpec {
  readonly id: string;
  readonly rowId: string;
  readonly label: string;
}

/** Semantic emphasis for a one-date gate. */
export type TimelineMilestoneEmphasis = "standard" | "critical";

/** One dated milestone or gate on a stable row. */
export interface TimelineMilestoneSpec {
  readonly id: string;
  readonly rowId: string;
  readonly label: string;
  readonly date: string;
  readonly emphasis?: TimelineMilestoneEmphasis;
}

/** JSON-safe bounded calendar plan; narrative event history uses Timeline. */
export interface TimelineDiagramSpec extends DiagramCommonSpec {
  readonly kind: "timeline";
  readonly range: TimelineDateRangeSpec;
  readonly groups: readonly TimelineGroupSpec[];
  readonly rows: readonly TimelineRowSpec[];
  readonly tasks: readonly TimelineTaskSpec[];
  readonly milestones?: readonly TimelineMilestoneSpec[];
}

/** Deterministically parsed Gregorian calendar date. */
export interface ValidatedTimelineDate {
  readonly iso: string;
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly ordinal: number;
}

/** Normalized group in authored order. */
export interface ValidatedTimelineGroup extends TimelineGroupSpec {
  readonly sourceOrder: number;
}

/** Normalized row in authored order. */
export interface ValidatedTimelineRow extends TimelineRowSpec {
  readonly sourceOrder: number;
}

/** Normalized half-open task in authored order. */
export interface ValidatedTimelineTask {
  readonly id: string;
  readonly rowId: string;
  readonly label: string;
  readonly start: ValidatedTimelineDate;
  readonly end: ValidatedTimelineDate;
  readonly sourceOrder: number;
}

/** Normalized one-date milestone in authored order. */
export interface ValidatedTimelineMilestone {
  readonly id: string;
  readonly rowId: string;
  readonly label: string;
  readonly date: ValidatedTimelineDate;
  readonly emphasis: TimelineMilestoneEmphasis;
  readonly sourceOrder: number;
}

/** Fully checked calendar plan consumed by description and layout. */
export interface ValidatedTimelineDiagram extends ValidatedDiagramSpec {
  readonly kind: "timeline";
  readonly title: string;
  readonly summary: string;
  readonly range: {
    readonly start: ValidatedTimelineDate;
    readonly end: ValidatedTimelineDate;
  };
  readonly groups: readonly ValidatedTimelineGroup[];
  readonly rows: readonly ValidatedTimelineRow[];
  readonly tasks: readonly ValidatedTimelineTask[];
  readonly milestones: readonly ValidatedTimelineMilestone[];
}
