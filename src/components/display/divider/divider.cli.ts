/**
 * Pure terminal renderer and deterministic example states for Divider.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import {
  motifPassthrough,
  type TerminalMotifOptions,
} from "../../../cli/motif.ts";
import type {
  TerminalSemanticTone,
  TerminalThemeVariant,
} from "../../../cli/theme.ts";
import {
  type MotifDirection,
  type MotifPatternOrientation,
  renderMotifDivider,
  renderMotifPattern,
  renderMotifSectionRule,
} from "../../../cli/motifs.ts";
import type { DividerSurface } from "./divider.types.ts";

/** Semantic terminal treatments owned by Divider. */
export type DividerCliTreatment = "rule" | "ribbon";

/** Inputs accepted by the terminal Divider renderer. */
export interface DividerCliProps extends TerminalMotifOptions {
  readonly label?: string;
  readonly surface?: DividerSurface;
  readonly treatment?: DividerCliTreatment;
  readonly orientation?: MotifPatternOrientation;
  readonly length?: number;
  readonly phase?: number;
  readonly direction?: MotifDirection;
  readonly tone?: TerminalSemanticTone;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** Deterministic Divider states rendered by `deno task catalogue:cli divider`. */
export const cliExamples: readonly CliExample<DividerCliProps>[] = [
  { name: "rule", props: { width: 24 } },
  { name: "labelled", props: { label: "Section", width: 32 } },
  { name: "ribbon", props: { treatment: "ribbon", width: 24 } },
] as const;

/** Render Divider's centred and leading-marker rules plus vertical patterns. */
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
      ...motifPassthrough(props),
    };
    return renderMotifSectionRule(props.label, options, capabilities);
  }

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
  const direction = props.direction ?? "forward";
  const phase = props.phase ?? 0;
  const tone = props.tone ??
    (props.surface === "surface" ? "neutral" : "accent");
  if (orientation === "horizontal") {
    return renderMotifDivider(
      {
        width: length,
        alignment: treatment === "ribbon" ? "start" : "center",
        tone,
        ...(props.theme === undefined ? {} : { theme: props.theme }),
        ...motifPassthrough(props),
      },
      capabilities,
    );
  }
  return renderMotifPattern(
    {
      length,
      orientation,
      phase,
      direction,
      tone,
      ...(props.theme === undefined ? {} : { theme: props.theme }),
      ...motifPassthrough(props),
    },
    capabilities,
  );
};

export default renderDividerCli;
