/**
 * Pure terminal renderer and deterministic example states for Procedure step.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { SequentialStepStatus } from "../../../cli/interactive-states.ts";
import {
  motifPassthrough,
  type TerminalMotifOptions,
} from "../../../cli/motif.ts";
import { renderMotifWorkflowStepper } from "../../../cli/motifs.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./procedure-step.meta.ts";
import renderBranchChoiceCli, {
  type BranchChoiceCliProps,
} from "../branch-choice/branch-choice.cli.ts";
import renderCommandCli, {
  type CommandCliProps,
} from "../command/command.cli.ts";
import renderExpectedResultCli, {
  type ExpectedResultCliProps,
} from "../expected-result/expected-result.cli.ts";
import {
  assertWorkflowCliText,
  workflowCliWidth,
  workflowFactLines,
  workflowIndentedLines,
} from "../workflow-cli.ts";

/** Inputs accepted by the terminal Procedure step renderer. */
export interface ProcedureStepCliProps extends TerminalMotifOptions {
  readonly title: string;
  readonly status: SequentialStepStatus;
  readonly phase?: number;
  readonly action: string;
  readonly command?: CommandCliProps;
  readonly expectedResult?: ExpectedResultCliProps;
  readonly completionCriterion?: string;
  readonly recovery?: string;
  readonly recoveryLabel?: string;
  readonly branch?: BranchChoiceCliProps;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

const cliExampleImplementations = [
  {
    name: "default",
    props: {
      title: "Verify the generated output",
      status: "pending",
      action: "Rebuild the output from its authored inputs.",
      command: { command: "deno task build" },
      expectedResult: {
        value: "The build reports no stale generated files.",
        variant: "state",
      },
      completionCriterion: "The derived output matches the authored source.",
    },
  },
  {
    name: "branch",
    props: {
      title: "Choose the verification depth",
      status: "pending",
      action:
        "Select the path that matches the evidence needed for this handoff.",
      branch: {
        choices: [
          {
            label: "A focused check is enough",
            path: "Run the affected test",
          },
          {
            label: "The public contract changed",
            path: "Run the full release gate",
          },
        ],
      },
    },
  },
  {
    name: "active",
    props: {
      title: "Run the verification suite",
      status: "active",
      phase: 1,
      action: "Verify the current changes.",
      command: { command: "deno task verify" },
      expectedResult: { value: "Every configured check passes" },
      completionCriterion: "The verification report records no failures.",
    },
  },
] as const satisfies readonly CliExample<ProcedureStepCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Procedure step states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<ProcedureStepCliProps>[] =
  cliExampleImplementations;

function indentFrame(frame: string): string {
  return frame.split("\n").map((line) => `  ${line}`).join("\n");
}

/** Render one semantic workflow step frame without advancing its state. */
const renderProcedureStepCli: CliRenderer<ProcedureStepCliProps> = (
  props,
  capabilities,
) => {
  const width = workflowCliWidth(props.maxWidth, capabilities, 20);
  assertWorkflowCliText(props.title, "procedure step title");
  assertWorkflowCliText(props.action, "procedure step action", true);
  const presentation = {
    ...(props.theme === undefined ? {} : { theme: props.theme }),
    ...motifPassthrough(props),
  };
  const lines = [
    renderMotifWorkflowStepper(
      [{
        label: props.title,
        status: props.status,
        ...(props.phase === undefined ? {} : { phase: props.phase }),
      }],
      { ...capabilities, columns: width },
      presentation,
    ),
    ...workflowIndentedLines(props.action, width),
  ];
  const innerWidth = width - 2;
  const innerCapabilities = { ...capabilities, columns: innerWidth };
  if (props.command !== undefined) {
    lines.push(indentFrame(renderCommandCli(
      {
        ...props.command,
        ...presentation,
        maxWidth: innerWidth,
      },
      innerCapabilities,
    )));
  }
  if (props.expectedResult !== undefined) {
    lines.push(indentFrame(renderExpectedResultCli(
      {
        ...props.expectedResult,
        ...presentation,
        maxWidth: innerWidth,
      },
      innerCapabilities,
    )));
  }
  if (props.completionCriterion !== undefined) {
    assertWorkflowCliText(
      props.completionCriterion,
      "procedure step completion criterion",
      true,
    );
    lines.push(...workflowFactLines(
      "Complete when",
      props.completionCriterion,
      width,
    ));
  }
  if (props.branch !== undefined) {
    lines.push(indentFrame(renderBranchChoiceCli(
      { ...props.branch, ...presentation, maxWidth: innerWidth },
      innerCapabilities,
    )));
  }
  if (props.recovery !== undefined) {
    assertWorkflowCliText(props.recovery, "procedure step recovery", true);
    const label = props.recoveryLabel ?? "If this fails";
    assertWorkflowCliText(label, "procedure step recovery label");
    lines.push(...workflowFactLines(label, props.recovery, width));
  }
  return lines.join("\n");
};

export default renderProcedureStepCli;
