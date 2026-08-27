/**
 * Pure terminal renderer and deterministic example states for Task metadata.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import type {
  TaskFileEffects,
  TaskRetrySafety,
} from "./task-metadata.types.ts";
import meta, { componentExampleVocabulary } from "./task-metadata.meta.ts";
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
export const cliExamples = defineCliExamples(
  meta,
  componentExampleVocabulary,
  [
    {
      name: "default",
      props: {
        outcome: "Confirm that a configuration matches its schema.",
        audience: "Maintainers reviewing a project configuration.",
        prerequisites: "A local checkout and the validation command.",
        complexity: "About 5 minutes",
        fileEffects: "none",
        retrySafety: "safe",
        expectedState:
          "Validation succeeds and the project files remain unchanged.",
      },
    },
    {
      name: "file-changing",
      props: {
        outcome: "Regenerate a derived reference from its source registry.",
        audience: "Maintainers changing a public contract.",
        prerequisites:
          "The source registry is current and the project files have no unrelated changes.",
        complexity: "About 15 minutes",
        fileEffects: "changes-files",
        retrySafety: "check-first",
        expectedState:
          "The reference matches its source and only expected files have changed.",
      },
    },
  ] as const satisfies readonly CliExample<TaskMetadataCliProps>[],
);

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
