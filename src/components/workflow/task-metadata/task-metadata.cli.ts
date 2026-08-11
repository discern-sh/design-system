/**
 * Pure terminal renderer and deterministic example states for Task metadata.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import type {
  TaskFileEffects,
  TaskRetrySafety,
} from "./task-metadata.types.ts";
import {
  assertWorkflowCliText,
  styleWorkflowHeading,
  workflowCliWidth,
  workflowFactLines,
  workflowPrefixedLines,
} from "../workflow-cli.ts";

const fileEffectLabels: Readonly<Record<TaskFileEffects, string>> = {
  none: "Does not change files",
  "may-change": "May change files",
  "changes-files": "Changes files",
};

const retrySafetyLabels: Readonly<Record<TaskRetrySafety, string>> = {
  safe: "Safe to retry",
  "check-first": "Check current state before retrying",
  "do-not-retry": "Do not retry",
};

/** Inputs accepted by the terminal Task metadata renderer. */
export interface TaskMetadataCliProps {
  readonly outcome: string;
  readonly audience: string;
  readonly prerequisites: string;
  readonly complexity: string;
  readonly fileEffects: TaskFileEffects;
  readonly retrySafety: TaskRetrySafety;
  readonly expectedState: string;
  readonly label?: string;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Task metadata states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<TaskMetadataCliProps>[] = [
  {
    name: "implementation",
    props: {
      outcome: "Workflow CLI parity",
      audience: "Design-system maintainers",
      prerequisites: "Wave 1 foundation",
      complexity: "Multi-component",
      fileEffects: "changes-files",
      retrySafety: "check-first",
      expectedState: "All owned CLI stances are decided",
    },
  },
] as const;

/** Render quiet terminal orientation facts for one operational task. */
const renderTaskMetadataCli: CliRenderer<TaskMetadataCliProps> = (
  props,
  capabilities,
) => {
  const width = workflowCliWidth(props.maxWidth, capabilities);
  for (
    const [name, value] of [
      ["outcome", props.outcome],
      ["audience", props.audience],
      ["prerequisites", props.prerequisites],
      ["complexity", props.complexity],
      ["expected state", props.expectedState],
    ] as const
  ) {
    assertWorkflowCliText(value, `task metadata ${name}`, true);
  }
  const label = props.label ?? "Task overview";
  assertWorkflowCliText(label, "task metadata label");
  return [
    styleWorkflowHeading(
      workflowPrefixedLines("", label, width).join("\n"),
      "neutral",
      capabilities,
      props.theme,
    ),
    ...workflowFactLines("Outcome", props.outcome, width),
    ...workflowFactLines("For", props.audience, width),
    ...workflowFactLines("Prerequisites", props.prerequisites, width),
    ...workflowFactLines("Complexity", props.complexity, width),
    ...workflowFactLines(
      "File effects",
      fileEffectLabels[props.fileEffects],
      width,
    ),
    ...workflowFactLines(
      "Retry safety",
      retrySafetyLabels[props.retrySafety],
      width,
    ),
    ...workflowFactLines("End state", props.expectedState, width),
  ].join("\n");
};

export default renderTaskMetadataCli;
