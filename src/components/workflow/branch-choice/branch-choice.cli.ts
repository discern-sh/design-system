/**
 * Pure terminal renderer and deterministic example states for Branch choice.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
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
export const cliExamples: readonly CliExample<BranchChoiceCliProps>[] = [
  {
    name: "gate",
    props: {
      choices: [
        { label: "Gate passes", path: "Accept the worktree" },
        { label: "Gate fails", path: "Fix the first diagnostic" },
      ],
    },
  },
] as const;

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
