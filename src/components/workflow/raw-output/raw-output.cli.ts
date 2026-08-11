/**
 * Pure terminal renderer and deterministic example states for Raw output.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import {
  assertWorkflowCliText,
  styleWorkflowHeading,
  workflowCliWidth,
  workflowIndentedLines,
  workflowPrefixedLines,
} from "../workflow-cli.ts";

/** Inputs accepted by the terminal Raw output renderer. */
export interface RawOutputCliProps {
  readonly output: string;
  readonly label?: string;
  readonly expanded?: boolean;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Raw output states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<RawOutputCliProps>[] = [
  {
    name: "expanded",
    props: { output: "exit_code=0\nchecks=29" },
  },
  {
    name: "collapsed",
    props: { output: "hidden detail", expanded: false },
  },
] as const;

/** Render one explicit open or closed machine-output frame. */
const renderRawOutputCli: CliRenderer<RawOutputCliProps> = (
  props,
  capabilities,
) => {
  assertWorkflowCliText(props.output, "raw output", true);
  const label = props.label ?? "Raw output";
  assertWorkflowCliText(label, "raw output label");
  const width = workflowCliWidth(props.maxWidth, capabilities);
  const expanded = props.expanded ?? true;
  const marker = capabilities.unicode
    ? (expanded ? "▾" : "▸")
    : (expanded ? "v" : ">");
  const heading = styleWorkflowHeading(
    workflowPrefixedLines(`${marker} `, label, width).join("\n"),
    "neutral",
    capabilities,
    props.theme,
  );
  return expanded
    ? [heading, ...workflowIndentedLines(props.output, width)].join("\n")
    : heading;
};

export default renderRawOutputCli;
