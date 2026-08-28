export type OverflowCueAxis = "block" | "inline" | "both";
export type RtlScrollType = "default" | "negative" | "reverse";

export interface OverflowCueMetrics {
  readonly scrollTop: number;
  readonly scrollLeft: number;
  readonly scrollWidth: number;
  readonly scrollHeight: number;
  readonly clientWidth: number;
  readonly clientHeight: number;
  readonly direction: "ltr" | "rtl";
}

export interface OverflowCueState {
  readonly blockStart: boolean;
  readonly blockEnd: boolean;
  readonly inlineStart: boolean;
  readonly inlineEnd: boolean;
}

export const overflowCueAxes: readonly ["block", "inline", "both"];

export const overflowCueMarkupAttributes: {
  readonly root: "data-discern-overflow-cue";
  readonly target: "data-discern-overflow-cue-target";
  readonly axis: "data-discern-overflow-cue-axis";
  readonly enhanced: "data-discern-overflow-cue-enhanced";
};

export const overflowCueEdgeNames: {
  readonly blockStart: "block-start";
  readonly blockEnd: "block-end";
  readonly inlineStart: "inline-start";
  readonly inlineEnd: "inline-end";
};

export const overflowCueStateAttributes: {
  readonly blockStart: "data-discern-overflow-cue-block-start";
  readonly blockEnd: "data-discern-overflow-cue-block-end";
  readonly inlineStart: "data-discern-overflow-cue-inline-start";
  readonly inlineEnd: "data-discern-overflow-cue-inline-end";
};

export function logicalInlineScrollOffset(
  scrollLeft: number,
  maximum: number,
  direction: "ltr" | "rtl",
  rtlScrollType: RtlScrollType,
): number;

export function measureOverflowCueState(
  metrics: OverflowCueMetrics,
  axis: OverflowCueAxis,
  rtlScrollType: RtlScrollType,
  direction?: "ltr" | "rtl",
): OverflowCueState;
