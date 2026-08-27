/**
 * Pure terminal renderer and deterministic example states for Prerequisite list.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type {
  TerminalSemanticTone,
  TerminalThemeVariant,
} from "../../../cli/theme.ts";
import type { PrerequisiteState } from "./prerequisite-list.types.ts";
import meta, { componentExampleVocabulary } from "./prerequisite-list.meta.ts";
import {
  assertWorkflowCliText,
  styleWorkflowHeading,
  workflowCliWidth,
  workflowIndentedLines,
  workflowPrefixedLines,
} from "../workflow-cli.ts";

const stateLabels: Readonly<Record<PrerequisiteState, string>> = {
  required: "Required",
  satisfied: "Satisfied",
  unresolved: "Unresolved",
};

const stateTones: Readonly<Record<PrerequisiteState, TerminalSemanticTone>> = {
  required: "neutral",
  satisfied: "success",
  unresolved: "warning",
};

/** One framework-neutral terminal prerequisite. */
export interface PrerequisiteListCliItem {
  readonly requirement: string;
  readonly state: PrerequisiteState;
  readonly detail?: string;
}

/** Inputs accepted by the terminal Prerequisite list renderer. */
export interface PrerequisiteListCliProps {
  readonly title?: string;
  readonly items: readonly PrerequisiteListCliItem[];
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

const cliExampleImplementations = [
  {
    name: "default",
    props: {
      items: [
        {
          requirement: "The destination path is known.",
          state: "required",
          detail: "Confirm the path before starting the restore.",
        },
        {
          requirement: "A current backup exists outside the source.",
          state: "satisfied",
          detail: "Verified by listing its contents.",
        },
        {
          requirement: "The destination path is empty.",
          state: "unresolved",
          detail: "Inspect it before starting the restore.",
        },
      ],
    },
  },
] as const satisfies readonly CliExample<PrerequisiteListCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Prerequisite list states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<PrerequisiteListCliProps>[] =
  cliExampleImplementations;

/** Render text-and-shape prerequisite states without relying on colour. */
const renderPrerequisiteListCli: CliRenderer<PrerequisiteListCliProps> = (
  props,
  capabilities,
) => {
  if (props.items.length === 0) {
    throw new TypeError("prerequisite list requires at least one item");
  }
  const width = workflowCliWidth(props.maxWidth, capabilities);
  const title = props.title ?? "Before you start";
  assertWorkflowCliText(title, "prerequisite list title");
  const lines = [
    styleWorkflowHeading(
      workflowPrefixedLines("", title, width).join("\n"),
      "neutral",
      capabilities,
      props.theme,
    ),
  ];
  for (const [index, item] of props.items.entries()) {
    assertWorkflowCliText(item.requirement, `prerequisite ${index + 1}`, true);
    if (item.detail !== undefined) {
      assertWorkflowCliText(
        item.detail,
        `prerequisite ${index + 1} detail`,
        true,
      );
    }
    const marker = item.state === "satisfied"
      ? (capabilities.unicode ? "✓" : "+")
      : item.state === "required"
      ? (capabilities.unicode ? "•" : "*")
      : "!";
    const itemLines = workflowPrefixedLines(
      `${marker} `,
      `${item.requirement} [${stateLabels[item.state]}]`,
      width,
    );
    lines.push(styleWorkflowHeading(
      itemLines.join("\n"),
      stateTones[item.state],
      capabilities,
      props.theme,
    ));
    if (item.detail !== undefined) {
      lines.push(...workflowIndentedLines(item.detail, width));
    }
  }
  return lines.join("\n");
};

export default renderPrerequisiteListCli;
