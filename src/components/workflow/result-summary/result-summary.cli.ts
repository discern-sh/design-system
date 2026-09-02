/**
 * Pure terminal renderer and deterministic example states for Result summary.
 *
 * @module
 */

import type {
  CliExample,
  CliPresentationOptions,
  CliRenderer,
} from "../../../cli/contracts.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import { wrapInlineCluster } from "../../../cli/layout.ts";
import { measureText, padText } from "../../../cli/text.ts";
import type { TerminalSemanticTone } from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./result-summary.meta.ts";
import {
  RESULT_SUMMARY_STATE_LABELS,
  RESULT_SUMMARY_STATES,
  type ResultSummaryState,
} from "./result-summary.types.ts";
import {
  assertWorkflowCliText,
  styleWorkflowHeading,
  workflowCliWidth,
  workflowFactLines,
  workflowPrefixedLines,
} from "../workflow-cli.ts";

interface ResultSummaryMarker {
  readonly unicode: string;
  readonly ascii: string;
}

const stateMarkers = {
  passed: { unicode: "✓", ascii: "+" },
  failed: { unicode: "✕", ascii: "x" },
  blocked: { unicode: "!", ascii: "!" },
  changed: { unicode: "◇", ascii: "*" },
  declared: { unicode: "·", ascii: "." },
  unchanged: { unicode: "=", ascii: "=" },
} as const satisfies Readonly<Record<ResultSummaryState, ResultSummaryMarker>>;

function resultSummaryMarker(
  state: ResultSummaryState,
  unicode: boolean,
): string {
  const marker = stateMarkers[state];
  return unicode ? marker.unicode : marker.ascii;
}

/** Visible prefix width used to align one Result summary collection. */
export function resultSummaryPrefixWidth(
  state: ResultSummaryState,
  capabilities: Parameters<CliRenderer<ResultSummaryCliProps>>[1],
): number {
  return measureText(
    `${resultSummaryMarker(state, capabilities.unicode)} ${
      RESULT_SUMMARY_STATE_LABELS[state]
    }:`,
  );
}

const stateTones: Readonly<Record<ResultSummaryState, TerminalSemanticTone>> = {
  passed: "success",
  failed: "danger",
  blocked: "warning",
  changed: "accent",
  declared: "neutral",
  unchanged: "neutral",
};

/** One supporting count accepted by the terminal Result summary renderer. */
export interface ResultSummaryCliCount {
  readonly label: string;
  readonly value: string;
}

/** Inputs accepted by the terminal Result summary renderer. */
export interface ResultSummaryCliProps extends CliPresentationOptions {
  readonly state: ResultSummaryState;
  readonly fact: string;
  readonly counts?: readonly ResultSummaryCliCount[];
  readonly duration?: string;
  readonly nextAction?: string;
  readonly machineReadable?: string;
  readonly maxWidth?: number;
}

const cliExampleProps = {
  passed: {
    state: "passed",
    fact: "All configured checks completed successfully.",
    counts: [
      { label: "Checks", value: "12" },
      { label: "Files", value: "8" },
      { label: "Findings", value: "0" },
    ],
    duration: "48 s",
    nextAction: "Review the recorded changes before continuing.",
    machineReadable: '{"ok":true,"checks":12,"files":8,"findings":0}',
  },
  failed: {
    state: "failed",
    fact: "Two checks did not complete.",
    counts: [
      { label: "Passed", value: "10" },
      { label: "Failed", value: "2" },
    ],
    nextAction: "Open the first diagnostic and reproduce the failure.",
  },
  blocked: {
    state: "blocked",
    fact: "The run stopped because a required credential is unavailable.",
    nextAction: "Provide the credential, then retry the run.",
  },
  changed: {
    state: "changed",
    fact: "Formatting updated three files.",
    counts: [{ label: "Files", value: "3" }],
    duration: "2 s",
  },
  declared: {
    state: "declared",
    fact: "The reviewer declared the condition met.",
    nextAction: "Continue with the recorded judgment.",
  },
  unchanged: {
    state: "unchanged",
    fact: "No tracked files changed.",
    nextAction: "Continue with the next planned check.",
  },
} as const satisfies Readonly<
  Record<ResultSummaryState, ResultSummaryCliProps>
>;

/** Deterministic Result summary states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<ResultSummaryCliProps>[] =
  defineCliExamples(
    meta,
    componentExampleVocabulary,
    RESULT_SUMMARY_STATES.map((state) => ({
      name: state,
      props: cliExampleProps[state],
    })) satisfies readonly CliExample<ResultSummaryCliProps>[],
  );

/** Render one outcome with an optional collection-owned prefix width. */
export function renderResultSummaryCliWithPrefixWidth(
  props: ResultSummaryCliProps,
  capabilities: Parameters<CliRenderer<ResultSummaryCliProps>>[1],
  prefixWidth?: number,
): string {
  assertWorkflowCliText(props.fact, "result summary fact", true);
  const width = workflowCliWidth(props.maxWidth, capabilities);
  const rawPrefix = `${
    resultSummaryMarker(props.state, capabilities.unicode)
  } ${RESULT_SUMMARY_STATE_LABELS[props.state]}:`;
  const resolvedPrefixWidth = prefixWidth ?? measureText(rawPrefix);
  const prefix = `${padText(rawPrefix, resolvedPrefixWidth)} `;
  const lines = [
    styleWorkflowHeading(
      workflowPrefixedLines(prefix, props.fact, width).join("\n"),
      stateTones[props.state],
      capabilities,
      props,
    ),
  ];
  const readings: string[] = [];
  for (const [index, count] of props.counts?.entries() ?? []) {
    assertWorkflowCliText(count.label, `result count ${index + 1} label`);
    assertWorkflowCliText(count.value, `result count ${index + 1} value`);
    readings.push(`${count.label}: ${count.value}`);
  }
  if (props.duration !== undefined) {
    assertWorkflowCliText(props.duration, "result duration");
    readings.push(`Duration: ${props.duration}`);
  }
  if (readings.length > 0) {
    lines.push(wrapInlineCluster(readings, { columns: width, gap: 3 }));
  }
  if (props.nextAction !== undefined) {
    assertWorkflowCliText(props.nextAction, "result next action", true);
    lines.push(...workflowFactLines("Next", props.nextAction, width));
  }
  if (props.machineReadable !== undefined) {
    assertWorkflowCliText(
      props.machineReadable,
      "machine-readable result",
      true,
    );
    lines.push(...workflowFactLines("Data", props.machineReadable, width));
  }
  return lines.join("\n");
}

/** Render one terse terminal outcome with readings and the next action. */
const renderResultSummaryCli: CliRenderer<ResultSummaryCliProps> = (
  props,
  capabilities,
) => renderResultSummaryCliWithPrefixWidth(props, capabilities);

export default renderResultSummaryCli;
