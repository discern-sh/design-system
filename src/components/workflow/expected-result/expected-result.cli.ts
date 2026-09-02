/**
 * Pure terminal renderer and deterministic example states for Expected result.
 *
 * @module
 */

import type {
  CliExample,
  CliPresentationOptions,
  CliRenderer,
} from "../../../cli/contracts.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { ExpectedResultVariant } from "./expected-result.types.ts";
import meta, { componentExampleVocabulary } from "./expected-result.meta.ts";
import {
  assertWorkflowCliText,
  styleWorkflowHeading,
  workflowCliWidth,
  workflowIndentedLines,
  workflowPrefixedLines,
} from "../workflow-cli.ts";

/** Inputs accepted by the terminal Expected result renderer. */
export interface ExpectedResultCliProps extends CliPresentationOptions {
  readonly value: string;
  readonly label?: string;
  readonly variant?: ExpectedResultVariant;
  readonly maxWidth?: number;
}

const cliExampleImplementations = [
  {
    name: "output",
    props: {
      value: "On branch main\nnothing to commit, working tree clean",
    },
  },
  {
    name: "state",
    props: {
      value:
        "The test process exits successfully and returns control to the shell.",
      variant: "state",
    },
  },
] as const satisfies readonly CliExample<ExpectedResultCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Expected result states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<ExpectedResultCliProps>[] =
  cliExampleImplementations;

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
      props,
    ),
    ...workflowIndentedLines(props.value, width),
  ].join("\n");
};

export default renderExpectedResultCli;
