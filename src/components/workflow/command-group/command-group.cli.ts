/**
 * Pure terminal renderer and deterministic example states for Command group.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import renderCommandCli, {
  type CommandCliProps,
} from "../command/command.cli.ts";
import {
  assertWorkflowCliText,
  styleWorkflowHeading,
  workflowCliWidth,
  workflowPrefixedLines,
} from "../workflow-cli.ts";

/** One labelled terminal command alternative. */
export interface CommandGroupCliItem extends CommandCliProps {
  readonly label: string;
}

/** Inputs accepted by the terminal Command group renderer. */
export interface CommandGroupCliProps {
  readonly title?: string;
  readonly items: readonly CommandGroupCliItem[];
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Command group states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<CommandGroupCliProps>[] = [
  {
    name: "release",
    props: {
      title: "Release commands",
      items: [
        { label: "Check", command: "deno publish --dry-run" },
        { label: "Publish", command: "deno publish" },
      ],
    },
  },
] as const;

/** Render ordered, complete terminal command alternatives. */
const renderCommandGroupCli: CliRenderer<CommandGroupCliProps> = (
  props,
  capabilities,
) => {
  if (props.items.length === 0) {
    throw new TypeError("command group requires at least one item");
  }
  const width = workflowCliWidth(props.maxWidth, capabilities, 18);
  const lines: string[] = [];
  if (props.title !== undefined) {
    assertWorkflowCliText(props.title, "command group title");
    lines.push(
      styleWorkflowHeading(
        workflowPrefixedLines("", props.title, width).join("\n"),
        "accent",
        capabilities,
        props.theme,
      ),
    );
  }
  const indent = "   ";
  const innerCapabilities = { ...capabilities, columns: width - indent.length };
  for (const [index, item] of props.items.entries()) {
    assertWorkflowCliText(item.label, `command group item ${index + 1} label`);
    if (lines.length > 0) lines.push("");
    lines.push(...workflowPrefixedLines(`${index + 1}. `, item.label, width));
    const theme = item.theme ?? props.theme;
    const rendered = renderCommandCli(
      {
        ...item,
        ...(theme === undefined ? {} : { theme }),
        maxWidth: width - indent.length,
      },
      innerCapabilities,
    );
    lines.push(...rendered.split("\n").map((line) => `${indent}${line}`));
  }
  return lines.join("\n");
};

export default renderCommandGroupCli;
