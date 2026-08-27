/**
 * Pure terminal renderer and deterministic example states for Agent handoff.
 *
 * @module
 */

import { renderBox } from "../../../cli/box.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import {
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./agent-handoff.meta.ts";
import {
  assertWorkflowCliText,
  workflowCliTheme,
  workflowCliWidth,
} from "../workflow-cli.ts";

/** Inputs accepted by the terminal Agent handoff renderer. */
export interface AgentHandoffCliProps {
  readonly title: string;
  readonly prompt: string;
  readonly description?: string;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

const cliExampleImplementations = [
  {
    name: "default",
    props: {
      title: "Hand this review to an agent",
      prompt: `Review the configuration change in this project.
Run the project checks.
Report the files changed, the commands run, and any remaining risk.`,
      description:
        "The prompt carries the task boundary and the evidence expected back.",
    },
  },
  {
    name: "long-prompt",
    props: {
      title: "Hand off a reference update",
      description:
        "Long paths and instructions wrap as prose rather than scrolling like a command.",
      prompt: `Update the generated reference from its source registry.
Work only in the assigned project directory and preserve unrelated changes.
Inspect /path/to/a/deliberately/long/project/reference/source-registry.ts before editing.
Run the quality gate, then report the resulting files and evidence.`,
      maxWidth: 42,
    },
  },
] as const satisfies readonly CliExample<AgentHandoffCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Agent handoff states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<AgentHandoffCliProps>[] =
  cliExampleImplementations;

/** Render one self-contained, width-bounded terminal agent prompt. */
const renderAgentHandoffCli: CliRenderer<AgentHandoffCliProps> = (
  props,
  capabilities,
) => {
  assertWorkflowCliText(props.title, "agent handoff title");
  assertWorkflowCliText(props.prompt, "agent handoff prompt", true);
  if (props.description !== undefined) {
    assertWorkflowCliText(props.description, "agent handoff description", true);
  }
  const width = workflowCliWidth(props.maxWidth, capabilities, 20);
  const theme = workflowCliTheme(props.theme);
  const body = [
    props.description,
    props.description === undefined ? undefined : "",
    "Prompt:",
    props.prompt,
  ].filter((value): value is string => value !== undefined).join("\n");
  return renderBox(
    {
      title: `Handoff: ${props.title}`,
      body,
      width,
      borderStyle: { color: terminalToneColor(theme, "accent") },
    },
    capabilities,
  );
};

export default renderAgentHandoffCli;
