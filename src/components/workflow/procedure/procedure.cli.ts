/**
 * Pure terminal renderer and deterministic example states for Procedure.
 *
 * @module
 */

import {
  type CliExample,
  type CliPresentationOptions,
  cliPresentationPassthrough,
  type CliRenderer,
} from "../../../cli/contracts.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { SequentialStepStatus } from "../../../cli/interactive-states.ts";
import {
  renderMotifSectionRule,
  renderMotifWorkflowStepper,
} from "../../../cli/motifs.ts";
import meta, { componentExampleVocabulary } from "./procedure.meta.ts";
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
export interface ProcedureCliProps extends CliPresentationOptions {
  readonly title: string;
  readonly description?: string;
  readonly prerequisites?: readonly PrerequisiteListCliItem[];
  readonly steps: readonly ProcedureCliStep[];
  readonly completion: string;
  readonly completionLabel?: string;
  readonly maxWidth?: number;
}

const cliExampleImplementations = [
  {
    name: "default",
    props: {
      title: "Back up and restore a directory",
      description:
        "Create a verified archive before restoring into a separate destination.",
      prerequisites: [{
        requirement: "The source directory is readable.",
        state: "satisfied",
      }],
      steps: [
        { title: "Create the archive", status: "pending" },
        { title: "Choose the next path", status: "pending" },
      ],
      completion:
        "The archive is readable and the original source remains available.",
    },
  },
  {
    name: "interrupted",
    props: {
      title: "Resume an interrupted archive",
      description: "Separate partial output before starting afresh.",
      steps: [
        { title: "Separate the partial output", status: "complete" },
        { title: "Create a fresh archive", status: "pending" },
      ],
      completion: "The new archive is readable and partial output is named.",
    },
  },
  {
    name: "active",
    props: {
      title: "Publish a documentation update",
      description: "Complete and verify each reviewable stage.",
      prerequisites: [{
        requirement: "Source approved",
        state: "satisfied",
      }],
      steps: [
        { title: "Prepare the draft", status: "complete" },
        { title: "Run the verification suite", status: "active", phase: 1 },
        { title: "Request final review", status: "pending" },
      ],
      completion: "The published page matches the approved source.",
    },
  },
  {
    name: "long-procedure",
    props: {
      title: "Move a large directory in reviewable stages",
      description: "Keep a long sequence legible at narrow widths.",
      maxWidth: 42,
      steps: [
        { title: "Record the source location", status: "complete" },
        { title: "Create the destination", status: "complete" },
        { title: "Copy without deleting", status: "active", phase: 1 },
        { title: "Compare directory sizes", status: "pending" },
        { title: "Open representative files", status: "pending" },
        { title: "Choose whether to retain the source", status: "pending" },
        { title: "Record the handoff", status: "pending" },
      ],
      completion: "Every copied path is checked before deletion is considered.",
    },
  },
] as const satisfies readonly CliExample<ProcedureCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Procedure states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<ProcedureCliProps>[] =
  cliExampleImplementations;

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
      props,
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
          ...cliPresentationPassthrough(props),
          items: props.prerequisites,
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
      ...cliPresentationPassthrough(props),
      width,
      treatment: "quiet",
    }, capabilities),
    renderMotifWorkflowStepper(
      props.steps.map((step) => ({
        label: step.title,
        status: step.status,
        ...(step.phase === undefined ? {} : { phase: step.phase }),
      })),
      { ...capabilities, columns: width },
      cliPresentationPassthrough(props),
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
