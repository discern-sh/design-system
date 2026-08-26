/**
 * Pure terminal renderer and deterministic example states for Command.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import type { ExpectedResultVariant } from "../expected-result/expected-result.types.ts";
import {
  assertWorkflowCliText,
  styleWorkflowHeading,
  workflowCliWidth,
  workflowFactLines,
  workflowPathText,
  workflowPrefixedLines,
} from "../workflow-cli.ts";

/** Inputs accepted by the terminal Command renderer. */
export interface CommandCliProps {
  readonly command: string;
  readonly workingDirectory?: string;
  readonly explanation?: string;
  readonly expectedResult?: string;
  readonly expectedResultLabel?: string;
  readonly expectedResultVariant?: ExpectedResultVariant;
  readonly failureNote?: string;
  readonly platform?: string;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Command states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<CommandCliProps>[] = [
  {
    name: "verified",
    props: {
      command: "deno task verify",
      workingDirectory: "/workspace",
      explanation: "Run the complete local check.",
      expectedResult: "All checks pass",
    },
  },
  {
    name: "guarded",
    props: {
      command: "discern accept",
      failureNote: "Keep the worktree and report the verification outcome.",
    },
  },
] as const;

/** Render one executable command with context, proof, and failure guidance. */
const renderCommandCli: CliRenderer<CommandCliProps> = (
  props,
  capabilities,
) => {
  assertWorkflowCliText(props.command, "command", true);
  const width = workflowCliWidth(props.maxWidth, capabilities);
  const lines: string[] = [];
  if (props.workingDirectory !== undefined) {
    assertWorkflowCliText(props.workingDirectory, "command working directory");
    lines.push(...workflowFactLines(
      "Run in",
      workflowPathText(
        props.workingDirectory,
        Math.max(1, width - "Run in: ".length),
        capabilities,
      ),
      width,
    ));
  }
  if (props.platform !== undefined) {
    assertWorkflowCliText(props.platform, "command platform");
    lines.push(...workflowFactLines("Platform", props.platform, width));
  }
  const command = workflowPrefixedLines("Run: ", props.command, width).join(
    "\n",
  );
  lines.push(
    styleWorkflowHeading(command, "accent", capabilities, props.theme),
  );
  if (props.explanation !== undefined) {
    assertWorkflowCliText(props.explanation, "command explanation", true);
    lines.push(...workflowPrefixedLines("", props.explanation, width));
  }
  if (props.expectedResult !== undefined) {
    assertWorkflowCliText(
      props.expectedResult,
      "command expected result",
      true,
    );
    const label = props.expectedResultLabel ??
      (props.expectedResultVariant === "state" ? "End state" : "Expect");
    assertWorkflowCliText(label, "command expected-result label");
    const marker = props.expectedResultVariant === "state"
      ? (capabilities.unicode ? "→" : ">")
      : (capabilities.unicode ? "✓" : "+");
    lines.push(
      ...workflowFactLines(`${marker} ${label}`, props.expectedResult, width),
    );
  }
  if (props.failureNote !== undefined) {
    assertWorkflowCliText(props.failureNote, "command failure note", true);
    lines.push(
      ...workflowFactLines("! If this fails", props.failureNote, width),
    );
  }
  return lines.join("\n");
};

export default renderCommandCli;
