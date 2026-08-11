/**
 * Pure terminal renderer and deterministic example states for Expected result.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import type { ExpectedResultVariant } from "./expected-result.types.ts";
import {
  assertWorkflowCliText,
  styleWorkflowHeading,
  workflowCliWidth,
  workflowIndentedLines,
  workflowPrefixedLines,
} from "../workflow-cli.ts";

/** Inputs accepted by the terminal Expected result renderer. */
export interface ExpectedResultCliProps {
  readonly value: string;
  readonly label?: string;
  readonly variant?: ExpectedResultVariant;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Expected result states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<ExpectedResultCliProps>[] = [
  { name: "output", props: { value: "All checks passed" } },
  {
    name: "state",
    props: { value: "The worktree is clean", variant: "state" },
  },
] as const;

/** Render one observable result or end-state proof. */
const renderExpectedResultCli: CliRenderer<ExpectedResultCliProps> = (
  props,
  capabilities,
) => {
  assertWorkflowCliText(props.value, "expected result", true);
  const label = props.label ?? "You should see";
  assertWorkflowCliText(label, "expected result label");
  const width = workflowCliWidth(props.maxWidth, capabilities);
  const marker = props.variant === "state"
    ? (capabilities.unicode ? "→" : ">")
    : (capabilities.unicode ? "✓" : "+");
  const heading = workflowPrefixedLines(`${marker} `, label, width).join("\n");
  return [
    styleWorkflowHeading(
      heading,
      "success",
      capabilities,
      props.theme,
    ),
    ...workflowIndentedLines(props.value, width),
  ].join("\n");
};

export default renderExpectedResultCli;
