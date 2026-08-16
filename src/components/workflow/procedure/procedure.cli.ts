/**
 * Pure terminal renderer and deterministic example states for Procedure.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type { SequentialStepStatus } from "../../../cli/interactive-states.ts";
import {
  motifPassthrough,
  type TerminalMotifOptions,
} from "../../../cli/motif.ts";
import {
  renderMotifSectionRule,
  renderMotifWorkflowStepper,
} from "../../../cli/motifs.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import renderPrerequisiteListCli, {
  type PrerequisiteListCliItem,
} from "../prerequisite-list/prerequisite-list.cli.ts";
import {
  assertWorkflowCliText,
  styleWorkflowHeading,
  workflowCliWidth,
  workflowFactLines,
  workflowIndentedLines,
  workflowPrefixedLines,
} from "../workflow-cli.ts";

/** One semantic step accepted by the terminal Procedure renderer. */
export interface ProcedureCliStep {
  readonly title: string;
  readonly status: SequentialStepStatus;
  readonly phase?: number;
}

/** Inputs accepted by the terminal Procedure renderer. */
export interface ProcedureCliProps extends TerminalMotifOptions {
  readonly title: string;
  readonly description?: string;
  readonly prerequisites?: readonly PrerequisiteListCliItem[];
  readonly steps: readonly ProcedureCliStep[];
  readonly completion: string;
  readonly completionLabel?: string;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Procedure states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<ProcedureCliProps>[] = [
  {
    name: "active",
    props: {
      title: "Ship the renderer wave",
      description: "Complete and verify every owned component.",
      prerequisites: [{ requirement: "Wave 1", state: "satisfied" }],
      steps: [
        { title: "Implement renderers", status: "complete" },
        { title: "Run the gate", status: "active", phase: 1 },
        { title: "Accept the branch", status: "pending" },
      ],
      completion: "The branch is landed on main.",
    },
  },
] as const;

/** Render a complete semantic workflow rail and its completion proof. */
const renderProcedureCli: CliRenderer<ProcedureCliProps> = (
  props,
  capabilities,
) => {
  if (props.steps.length === 0) {
    throw new TypeError("procedure requires at least one step");
  }
  const width = workflowCliWidth(props.maxWidth, capabilities, 18);
  assertWorkflowCliText(props.title, "procedure title");
  assertWorkflowCliText(props.completion, "procedure completion", true);
  const lines = [
    styleWorkflowHeading(
      workflowPrefixedLines("", props.title, width).join("\n"),
      "accent",
      capabilities,
      props.theme,
    ),
  ];
  if (props.description !== undefined) {
    assertWorkflowCliText(props.description, "procedure description", true);
    lines.push(...workflowIndentedLines(props.description, width));
  }
  if (props.prerequisites !== undefined) {
    lines.push(
      "",
      renderPrerequisiteListCli(
        {
          items: props.prerequisites,
          ...(props.theme === undefined ? {} : { theme: props.theme }),
          maxWidth: width,
        },
        { ...capabilities, columns: width },
      ),
    );
  }
  for (const [index, step] of props.steps.entries()) {
    assertWorkflowCliText(step.title, `procedure step ${index + 1} title`);
  }
  lines.push(
    "",
    renderMotifSectionRule("Steps", {
      width,
      ...(props.theme === undefined ? {} : { theme: props.theme }),
      ...motifPassthrough(props),
    }, capabilities),
    renderMotifWorkflowStepper(
      props.steps.map((step) => ({
        label: step.title,
        status: step.status,
        ...(step.phase === undefined ? {} : { phase: step.phase }),
      })),
      { ...capabilities, columns: width },
      {
        ...(props.theme === undefined ? {} : { theme: props.theme }),
        ...motifPassthrough(props),
      },
    ),
  );
  const completionLabel = props.completionLabel ?? "Done when";
  assertWorkflowCliText(completionLabel, "procedure completion label");
  lines.push(
    "",
    ...workflowFactLines(completionLabel, props.completion, width),
  );
  return lines.join("\n");
};

export default renderProcedureCli;
