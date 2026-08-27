/**
 * Pure terminal renderer and deterministic example states for Raw output.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
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
export interface RawOutputCliProps {
  readonly output: string;
  readonly label?: string;
  readonly expanded?: boolean;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Raw output states rendered by the CLI catalogue. */
export const cliExamples = defineCliExamples(
  meta,
  componentExampleVocabulary,
  [
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
  ] as const satisfies readonly CliExample<RawOutputCliProps>[],
);

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
    props.theme,
  );
  return expanded
    ? [heading, ...workflowIndentedLines(props.output, width)].join("\n")
    : heading;
};

export default renderRawOutputCli;
