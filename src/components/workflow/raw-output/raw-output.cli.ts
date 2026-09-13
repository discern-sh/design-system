import { completeResponse } from "./raw-output.examples-data.ts";
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
import { outputExtent } from "./raw-output.types.ts";
import { wrapTextPreservingIndent } from "../../../cli/text.ts";
import meta, { componentExampleVocabulary } from "./raw-output.meta.ts";
import {
  assertWorkflowCliText,
  styleWorkflowHeading,
  workflowCliWidth,
  workflowPrefixedLines,
} from "../workflow-cli.ts";

/** Inputs accepted by the terminal Raw output renderer. */
export interface RawOutputCliProps extends CliPresentationOptions {
  readonly output: string;
  readonly label?: string;
  readonly expanded?: boolean;
  /** Caller-reported outcome shown in both closed and expanded frames. */
  readonly outcome?: string;
  readonly maxWidth?: number;
}

const cliExampleImplementations = [
  {
    name: "default",
    props: {
      output: "error: expected a string\nat src/example.ts:18:7",
      expanded: false,
      label: "Parser output",
      outcome: "Failed",
    },
  },
  {
    name: "expanded",
    props: {
      label: "Checkout fixture response",
      outcome: "2 failures",
      output: completeResponse,
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
  if (props.outcome !== undefined) {
    assertWorkflowCliText(props.outcome, "raw output outcome");
  }
  const width = workflowCliWidth(props.maxWidth, capabilities);
  const expanded = props.expanded ?? true;
  const marker = triangleGlyph(
    expanded ? TRIANGLES.filledSmall.down : TRIANGLES.filledSmall.right,
    capabilities.unicode,
  );
  const heading = styleWorkflowHeading(
    workflowPrefixedLines(
      `${marker} `,
      `${label} · ${outputExtent(props.output)}${
        props.outcome === undefined ? "" : ` · ${props.outcome}`
      }`.replaceAll(" · ", capabilities.unicode ? " · " : " - "),
      width,
    ).join("\n"),
    "neutral",
    capabilities,
    props,
  );
  return expanded
    ? [
      heading,
      ...wrapTextPreservingIndent(props.output, width - 2).map((line) =>
        `  ${line}`
      ),
    ].join("\n")
    : heading;
};

export default renderRawOutputCli;
