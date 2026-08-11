/**
 * Pure terminal renderer and deterministic example states for Process steps.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type { SequentialFormFrameState } from "../../../cli/interactive-states.ts";
import { joinVertical } from "../../../cli/layout.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import {
  renderTriangleActivityBeacon,
  renderTriangleWorkflowStepper,
} from "../../../cli/triangles.ts";
import {
  marketingCliWidth,
  renderMarketingCliHeader,
  wrapMarketingCliText,
} from "../marketing-frame.ts";

/** Inputs accepted by the terminal Process steps renderer. */
export interface ProcessStepsCliProps extends SequentialFormFrameState {
  readonly description?: string;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** Deterministic Process steps states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<ProcessStepsCliProps>[] = [
  {
    name: "in-progress",
    props: {
      kind: "sequential-form",
      label: "A clear path from input to outcome",
      description: "Move through each proof-bearing phase.",
      lifecycle: { status: "active" },
      activePhase: 1,
      beaconPhase: 2,
      sections: [
        {
          id: "connect",
          label: "Connect",
          status: "complete",
          summary: "Inputs ready",
        },
        {
          id: "shape",
          label: "Shape",
          status: "active",
          summary: "Rules in progress",
        },
        { id: "prove", label: "Prove", status: "pending" },
      ],
    },
  },
  {
    name: "error",
    props: {
      kind: "sequential-form",
      label: "Release process",
      lifecycle: { status: "validation-error", message: "Proof failed" },
      activePhase: 3,
      sections: [
        { id: "build", label: "Build", status: "complete" },
        { id: "prove", label: "Prove", status: "error" },
        { id: "share", label: "Share", status: "pending" },
      ],
    },
  },
] as const;

/** Render a Wave 1 sequential frame through the package triangle stepper authority. */
const renderProcessStepsCli: CliRenderer<ProcessStepsCliProps> = (
  props,
  capabilities,
) => {
  if (props.sections.length === 0) {
    throw new TypeError("process steps requires at least one section");
  }
  const width = marketingCliWidth(props.width, capabilities);
  const boundedCapabilities = { ...capabilities, columns: width };
  const steps = props.sections.map((section, index) => ({
    label: section.label,
    status: section.status,
    phase: section.status === "active" ? props.activePhase : index,
  }));
  const summaries = props.sections.flatMap((section) =>
    section.summary === undefined
      ? []
      : [wrapMarketingCliText(`${section.label}: ${section.summary}`, width)]
  ).join("\n");
  const theme = terminalThemes[props.theme ?? "dark"];
  const lifecycle = props.lifecycle.status === "validation-error"
    ? `! ${props.lifecycle.message}`
    : props.lifecycle.status === "submitted"
    ? capabilities.unicode ? "✓ Complete" : "OK Complete"
    : props.lifecycle.status === "cancelled"
    ? `${capabilities.unicode ? "×" : "x"} ${props.lifecycle.reason}`
    : props.hint ?? "";
  return joinVertical([
    renderMarketingCliHeader({
      title: props.label,
      ...(props.description === undefined
        ? {}
        : { description: props.description }),
      ...(props.theme === undefined ? {} : { theme: props.theme }),
      width,
    }, capabilities),
    renderTriangleWorkflowStepper(steps, boundedCapabilities, {
      ...(props.theme === undefined ? {} : { theme: props.theme }),
    }),
    summaries,
    props.beaconPhase === undefined ? "" : renderTriangleActivityBeacon({
      width,
      phase: props.beaconPhase,
      ...(props.theme === undefined ? {} : { theme: props.theme }),
    }, boundedCapabilities),
    lifecycle === "" ? "" : styleText(lifecycle, {
      color: terminalToneColor(
        theme,
        props.lifecycle.status === "validation-error" ? "danger" : "neutral",
      ),
    }, capabilities),
  ], { spacing: 1 });
};

export default renderProcessStepsCli;
