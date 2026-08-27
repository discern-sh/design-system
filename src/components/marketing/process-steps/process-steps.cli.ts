/**
 * Pure terminal renderer and deterministic example states for Process steps.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type { SequentialFormFrameState } from "../../../cli/interactive-states.ts";
import { joinVertical } from "../../../cli/layout.ts";
import {
  motifPassthrough,
  type TerminalMotifOptions,
} from "../../../cli/motif.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import {
  renderMotifActivityBeacon,
  renderMotifWorkflowStepper,
} from "../../../cli/motifs.ts";
import { triangleGlyph, TRIANGLES } from "../../../cli/triangles.ts";
import {
  marketingCliWidth,
  renderMarketingCliHeader,
  wrapMarketingCliText,
} from "../marketing-frame.ts";
import meta, { componentExampleVocabulary } from "./process-steps.meta.ts";

/** Inputs accepted by the terminal Process steps renderer. */
export interface ProcessStepsCliProps
  extends SequentialFormFrameState, TerminalMotifOptions {
  readonly description?: string;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** Deterministic Process steps states rendered by the CLI catalogue. */
export const cliExamples = defineCliExamples(
  meta,
  componentExampleVocabulary,
  [
    {
      name: "default",
      props: {
        kind: "sequential-form",
        label: "A clear path from input to outcome.",
        description:
          "Use the sequence to make a new process feel understandable before the reader commits.",
        lifecycle: { status: "active" },
        activePhase: 1,
        beaconPhase: 2,
        sections: [
          {
            id: "connect",
            label: "Connect",
            status: "complete",
            summary: "Complete",
          },
          {
            id: "shape",
            label: "Shape",
            status: "active",
            summary: "In progress",
          },
          {
            id: "build",
            label: "Build",
            status: "pending",
            summary: "Waiting",
          },
          {
            id: "prove",
            label: "Prove",
            status: "pending",
            summary: "Waiting",
          },
          {
            id: "share",
            label: "Share",
            status: "pending",
            summary: "Waiting",
          },
        ],
      },
    },
    {
      name: "error",
      props: {
        kind: "sequential-form",
        label: "Resolve the blocked step before continuing.",
        description: "The highlighted correction keeps the sequence legible.",
        lifecycle: {
          status: "validation-error",
          message: "Shape needs attention",
        },
        activePhase: 1,
        sections: [
          { id: "connect", label: "Connect", status: "complete" },
          { id: "shape", label: "Shape", status: "error" },
          { id: "build", label: "Build", status: "pending" },
        ],
      },
    },
  ] as const satisfies readonly CliExample<ProcessStepsCliProps>[],
);

/** Render a sequential frame through the package motif-stepper authority. */
const renderProcessStepsCli: CliRenderer<ProcessStepsCliProps> = (
  props,
  capabilities,
) => {
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
    steps.length === 0
      ? "No applicable steps."
      : renderMotifWorkflowStepper(steps, boundedCapabilities, {
        ...(props.theme === undefined ? {} : { theme: props.theme }),
        ...motifPassthrough(props),
      }),
    summaries,
    props.beaconPhase === undefined ? "" : renderMotifActivityBeacon({
      width,
      phase: props.beaconPhase,
      marker: triangleGlyph(TRIANGLES.filledSmall.up, capabilities.unicode),
      ...(props.theme === undefined ? {} : { theme: props.theme }),
      ...motifPassthrough(props),
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
