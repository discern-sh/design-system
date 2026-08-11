/**
 * Pure terminal renderer and deterministic example states for Agent handoff.
 *
 * @module
 */

import { renderBox } from "../../../cli/box.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import {
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
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

/** Deterministic Agent handoff states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<AgentHandoffCliProps>[] = [
  {
    name: "review",
    props: {
      title: "Review the CLI frames",
      prompt: "Inspect the exact frames and report any semantic drift.",
      description: "A self-contained prompt for the reviewing agent.",
    },
  },
] as const;

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
