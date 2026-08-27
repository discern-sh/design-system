/**
 * Pure terminal renderer and deterministic example states for Branch choice.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./branch-choice.meta.ts";
import {
  assertWorkflowCliText,
  styleWorkflowHeading,
  workflowCliWidth,
  workflowPrefixedLines,
} from "../workflow-cli.ts";

/** One labelled route accepted by the terminal Branch choice renderer. */
export interface BranchChoiceCliItem {
  readonly label: string;
  readonly path: string;
  readonly href?: string;
}

/** Inputs accepted by the terminal Branch choice renderer. */
export interface BranchChoiceCliProps {
  readonly title?: string;
  readonly choices: readonly BranchChoiceCliItem[];
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Branch choice states rendered by the CLI catalogue. */
export const cliExamples = defineCliExamples(
  meta,
  componentExampleVocabulary,
  [
    {
      name: "default",
      props: {
        title: "Match the route to what happened",
        choices: [
          { label: "It worked", path: "Continue to verification" },
          { label: "It failed", path: "Open recovery guidance" },
          {
            label: "The outcome is unclear",
            path: "Review the prerequisite",
          },
        ],
      },
    },
    {
      name: "next-action",
      props: {
        title: "Choose what happens next",
        choices: [
          {
            label: "Recommended — it worked",
            path: "Continue to the next task",
          },
          { label: "It failed", path: "Open troubleshooting" },
          { label: "I need the reference", path: "Read the command reference" },
          { label: "Hand it to an agent", path: "Open the agent handoff" },
        ],
      },
    },
  ] as const satisfies readonly CliExample<BranchChoiceCliProps>[],
);

/** Render a complete, ordered set of terminal workflow routes. */
const renderBranchChoiceCli: CliRenderer<BranchChoiceCliProps> = (
  props,
  capabilities,
) => {
  if (props.choices.length === 0) {
    throw new TypeError("branch choice requires at least one route");
  }
  const width = workflowCliWidth(props.maxWidth, capabilities);
  const title = props.title ?? "Choose what happens next";
  assertWorkflowCliText(title, "branch choice title");
  const lines = [
    styleWorkflowHeading(
      workflowPrefixedLines("", title, width).join("\n"),
      "accent",
      capabilities,
      props.theme,
    ),
  ];
  for (const [index, choice] of props.choices.entries()) {
    assertWorkflowCliText(choice.label, `branch choice ${index + 1} label`);
    assertWorkflowCliText(choice.path, `branch choice ${index + 1} path`, true);
    if (choice.href !== undefined) {
      assertWorkflowCliText(choice.href, `branch choice ${index + 1} href`);
    }
    const arrow = capabilities.unicode ? " → " : " -> ";
    const route = `${choice.label}${arrow}${choice.path}${
      choice.href === undefined ? "" : ` (${choice.href})`
    }`;
    lines.push(...workflowPrefixedLines(`${index + 1}. `, route, width));
  }
  return lines.join("\n");
};

export default renderBranchChoiceCli;
