/**
 * Pure terminal renderer and deterministic example states for Procedure step.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type { SequentialStepStatus } from "../../../cli/interactive-states.ts";
import { renderTriangleWorkflowStepper } from "../../../cli/triangles.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
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
export interface ProcedureStepCliProps {
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

/** Deterministic Procedure step states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<ProcedureStepCliProps>[] = [
  {
    name: "active",
    props: {
      title: "Run the gate",
      status: "active",
      phase: 1,
      action: "Verify the committed tree.",
      command: { command: "discern done" },
      expectedResult: { value: "The full gate passes" },
      completionCriterion: "A gate proof is recorded.",
    },
  },
] as const;

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
  const theme = props.theme === undefined ? {} : { theme: props.theme };
  const lines = [
    renderTriangleWorkflowStepper(
      [{
        label: props.title,
        status: props.status,
        ...(props.phase === undefined ? {} : { phase: props.phase }),
      }],
      { ...capabilities, columns: width },
      theme,
    ),
    ...workflowIndentedLines(props.action, width),
  ];
  const innerWidth = width - 2;
  const innerCapabilities = { ...capabilities, columns: innerWidth };
  if (props.command !== undefined) {
    lines.push(indentFrame(renderCommandCli(
      {
        ...props.command,
        ...theme,
        maxWidth: innerWidth,
      },
      innerCapabilities,
    )));
  }
  if (props.expectedResult !== undefined) {
    lines.push(indentFrame(renderExpectedResultCli(
      {
        ...props.expectedResult,
        ...theme,
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
      { ...props.branch, ...theme, maxWidth: innerWidth },
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
