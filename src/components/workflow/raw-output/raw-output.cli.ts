/**
 * Pure terminal renderer and deterministic example states for Raw output.
 *
 * @module
 */

import type {
  CliExample,
  CliPresentationOptions,
  CliRenderer,
} from "../../../cli/contracts.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import { triangleGlyph, TRIANGLES } from "../../../cli/triangles.ts";
import meta, { componentExampleVocabulary } from "./raw-output.meta.ts";
import {
  assertWorkflowCliText,
  styleWorkflowHeading,
  workflowCliWidth,
  workflowIndentedLines,
  workflowPrefixedLines,
} from "../workflow-cli.ts";

/** Inputs accepted by the terminal Raw output renderer. */
export interface RawOutputCliProps extends CliPresentationOptions {
  readonly output: string;
  readonly label?: string;
  readonly expanded?: boolean;
  readonly maxWidth?: number;
}

const cliExampleImplementations = [
  {
    name: "default",
    props: {
      output: "error: expected a string\nat src/example.ts:18:7",
      expanded: false,
    },
  },
  {
    name: "expanded",
    props: {
      label: "Complete response",
      output: '{\n  "ok": false,\n  "reason": "invalid input"\n}',
    },
  },
] as const satisfies readonly CliExample<RawOutputCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Raw output states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<RawOutputCliProps>[] =
  cliExampleImplementations;

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
  const marker = triangleGlyph(
    expanded ? TRIANGLES.filledSmall.down : TRIANGLES.filledSmall.right,
    capabilities.unicode,
  );
  const heading = styleWorkflowHeading(
    workflowPrefixedLines(`${marker} `, label, width).join("\n"),
    "neutral",
    capabilities,
    props,
  );
  return expanded
    ? [heading, ...workflowIndentedLines(props.output, width)].join("\n")
    : heading;
};

export default renderRawOutputCli;
