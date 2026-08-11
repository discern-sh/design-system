/**
 * Pure terminal renderer and deterministic example states for Divider.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type {
  TerminalSemanticTone,
  TerminalThemeVariant,
} from "../../../cli/theme.ts";
import {
  renderTrianglePattern,
  renderTriangleSectionRule,
  type TriangleDirection,
  type TrianglePatternOrientation,
} from "../../../cli/triangles.ts";
import type { DividerSurface } from "./divider.types.ts";

/** Semantic terminal treatments owned by Divider. */
export type DividerCliTreatment = "rule" | "ribbon" | "field" | "weave";

/** Inputs accepted by the terminal Divider renderer. */
export interface DividerCliProps {
  readonly label?: string;
  readonly surface?: DividerSurface;
  readonly treatment?: DividerCliTreatment;
  readonly orientation?: TrianglePatternOrientation;
  readonly length?: number;
  readonly thickness?: number;
  readonly phase?: number;
  readonly direction?: TriangleDirection;
  readonly tone?: TerminalSemanticTone;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

const TREATMENT_THICKNESS: Readonly<Record<DividerCliTreatment, number>> = {
  rule: 1,
  ribbon: 2,
  field: 3,
  weave: 4,
};

/** Deterministic Divider states rendered by `deno task catalogue:cli divider`. */
export const cliExamples: readonly CliExample<DividerCliProps>[] = [
  { name: "rule", props: { width: 24 } },
  { name: "labelled", props: { label: "Section", width: 32 } },
  { name: "ribbon", props: { treatment: "ribbon", width: 24 } },
  { name: "field", props: { treatment: "field", width: 24, phase: 1 } },
  {
    name: "vertical-weave",
    props: { treatment: "weave", orientation: "vertical", length: 6 },
  },
] as const;

/** Render Divider's authoritative triangle rules, ribbons, fields, and weaves. */
const renderDividerCli: CliRenderer<DividerCliProps> = (
  props,
  capabilities,
) => {
  const treatment = props.treatment ?? "rule";
  const orientation = props.orientation ?? "horizontal";
  const requestedWidth = props.width ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 1) {
    throw new TypeError(
      `divider width must be a positive safe integer; received ${requestedWidth}`,
    );
  }
  const width = Math.min(requestedWidth, capabilities.columns);
  if (props.label !== undefined) {
    if (orientation !== "horizontal" || treatment !== "rule") {
      throw new TypeError(
        "labelled dividers require the horizontal rule treatment",
      );
    }
    const options = {
      width,
      ...(props.phase === undefined ? {} : { phase: props.phase }),
      ...(props.direction === undefined ? {} : { direction: props.direction }),
      ...(props.theme === undefined ? {} : { theme: props.theme }),
    };
    return renderTriangleSectionRule(props.label, options, capabilities);
  }

  const requestedThickness = props.thickness ?? TREATMENT_THICKNESS[treatment];
  if (!Number.isSafeInteger(requestedThickness) || requestedThickness < 1) {
    throw new TypeError(
      `divider thickness must be a positive safe integer; received ${requestedThickness}`,
    );
  }
  const thickness = Math.min(requestedThickness, width);
  const defaultLength = orientation === "horizontal" ? width : 6;
  const requestedLength = props.length ?? defaultLength;
  if (!Number.isSafeInteger(requestedLength) || requestedLength < 1) {
    throw new TypeError(
      `divider length must be a positive safe integer; received ${requestedLength}`,
    );
  }
  const length = orientation === "horizontal"
    ? Math.min(requestedLength, width)
    : requestedLength;
  const direction = props.direction ??
    (treatment === "weave" ? "reverse" : "forward");
  const phase = props.phase ?? (treatment === "weave" ? 1 : 0);
  const tone = props.tone ??
    (props.surface === "surface" ? "neutral" : "accent");
  return renderTrianglePattern(
    {
      length,
      orientation,
      thickness,
      phase,
      direction,
      tone,
      ...(props.theme === undefined ? {} : { theme: props.theme }),
    },
    capabilities,
  );
};

export default renderDividerCli;
