/**
 * Pure terminal renderer and deterministic example states for Rule.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./rule.meta.ts";
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
export const cliExamples = defineCliExamples(
  meta,
  componentExampleVocabulary,
  [
    {
      name: "default",
      props: {
        rule:
          "Commit generated outputs with the authored source that produced them.",
        origin: "CONTRIBUTING.md",
        scope: "Generated references",
      },
    },
    {
      name: "namespaced-styles",
      props: {
        rule: "Public classes and custom properties use the project namespace.",
        origin: "project.toml",
        scope: "Published styles",
      },
    },
  ] as const satisfies readonly CliExample<RuleCliProps>[],
);

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
