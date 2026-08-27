/**
 * Pure terminal renderer and deterministic example states for Command.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./command.meta.ts";
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

const cliExampleImplementations = [
  {
    name: "default",
    props: {
      command: "git status",
      workingDirectory: "/path/to/project",
      explanation:
        "Shows the current branch and any tracked or untracked changes.",
      expectedResult: "On branch main\nnothing to commit, working tree clean",
      platform: "macOS · Linux · WSL2",
    },
  },
  {
    name: "failure",
    props: {
      command: "deno task test",
      explanation: "Runs the project's configured test task.",
      expectedResult: "All tests pass and the process exits successfully.",
      expectedResultVariant: "state",
      failureNote:
        "Confirm the task exists and that the test runner has permission to launch its local browser.",
    },
  },
  {
    name: "overflow",
    props: {
      command:
        "git status --short --branch --untracked-files=all --ignore-submodules=none",
      workingDirectory: "/path/to/a/project/with/a/deliberately/long/location",
      explanation: "A long command remains a faithful input at narrow width.",
      maxWidth: 42,
    },
  },
] as const satisfies readonly CliExample<CommandCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Command states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<CommandCliProps>[] =
  cliExampleImplementations;

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
