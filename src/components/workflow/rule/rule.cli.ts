/**
 * Pure terminal renderer and deterministic example states for Rule.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import {
  assertWorkflowCliText,
  styleWorkflowHeading,
  workflowCliWidth,
  workflowFactLines,
  workflowIndentedLines,
} from "../workflow-cli.ts";

/** Inputs accepted by the terminal Rule renderer. */
export interface RuleCliProps {
  readonly rule: string;
  readonly origin: string;
  readonly scope: string;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Rule states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<RuleCliProps>[] = [
  {
    name: "generated-files",
    props: {
      rule: "Never hand-edit generated surfaces.",
      origin: "AGENTS.md",
      scope: "src/generated/ and styleguide/generated/",
    },
  },
] as const;

/** Render one binding terminal instruction with origin and scope. */
const renderRuleCli: CliRenderer<RuleCliProps> = (props, capabilities) => {
  for (
    const [name, value] of [
      ["body", props.rule],
      ["origin", props.origin],
      ["scope", props.scope],
    ] as const
  ) {
    assertWorkflowCliText(value, `rule ${name}`, true);
  }
  const width = workflowCliWidth(props.maxWidth, capabilities);
  return [
    styleWorkflowHeading("RULE", "accent", capabilities, props.theme),
    ...workflowIndentedLines(props.rule, width),
    ...workflowFactLines("Origin", props.origin, width),
    ...workflowFactLines("Scope", props.scope, width),
  ].join("\n");
};

export default renderRuleCli;
