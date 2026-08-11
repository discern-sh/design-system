/**
 * Pure terminal renderer and deterministic example states for Result summary.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { wrapInlineCluster } from "../../../cli/layout.ts";
import type {
  TerminalSemanticTone,
  TerminalThemeVariant,
} from "../../../cli/theme.ts";
import type { ResultSummaryState } from "./result-summary.types.ts";
import {
  assertWorkflowCliText,
  styleWorkflowHeading,
  workflowCliWidth,
  workflowFactLines,
  workflowPrefixedLines,
} from "../workflow-cli.ts";

const stateLabels: Readonly<Record<ResultSummaryState, string>> = {
  passed: "Passed",
  failed: "Failed",
  blocked: "Blocked",
  changed: "Changed",
  unchanged: "Unchanged",
};

const stateTones: Readonly<Record<ResultSummaryState, TerminalSemanticTone>> = {
  passed: "success",
  failed: "danger",
  blocked: "warning",
  changed: "accent",
  unchanged: "neutral",
};

/** One supporting count accepted by the terminal Result summary renderer. */
export interface ResultSummaryCliCount {
  readonly label: string;
  readonly value: string;
}

/** Inputs accepted by the terminal Result summary renderer. */
export interface ResultSummaryCliProps {
  readonly state: ResultSummaryState;
  readonly fact: string;
  readonly counts?: readonly ResultSummaryCliCount[];
  readonly duration?: string;
  readonly nextAction?: string;
  readonly machineReadable?: string;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Result summary states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<ResultSummaryCliProps>[] = [
  {
    name: "passed",
    props: {
      state: "passed",
      fact: "The full gate passed.",
      counts: [{ label: "Tests", value: "310" }],
      duration: "2m 18s",
      nextAction: "Accept the branch.",
    },
  },
  {
    name: "blocked",
    props: {
      state: "blocked",
      fact: "Landing authority has not arrived.",
    },
  },
] as const;

/** Render one terse terminal outcome with readings and the next action. */
const renderResultSummaryCli: CliRenderer<ResultSummaryCliProps> = (
  props,
  capabilities,
) => {
  assertWorkflowCliText(props.fact, "result summary fact", true);
  const width = workflowCliWidth(props.maxWidth, capabilities);
  const marker = props.state === "passed"
    ? (capabilities.unicode ? "✓" : "+")
    : props.state === "failed"
    ? (capabilities.unicode ? "✕" : "x")
    : props.state === "blocked"
    ? "!"
    : props.state === "changed"
    ? (capabilities.unicode ? "◇" : "*")
    : "=";
  const prefix = `${marker} ${stateLabels[props.state]}: `;
  const lines = [
    styleWorkflowHeading(
      workflowPrefixedLines(prefix, props.fact, width).join("\n"),
      stateTones[props.state],
      capabilities,
      props.theme,
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
};

export default renderResultSummaryCli;
