/**
 * Pure terminal renderer and deterministic example states for Retry notice.
 *
 * @module
 */

import type {
  CliExample,
  CliPresentationOptions,
  CliRenderer,
} from "../../../cli/contracts.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import meta, { componentExampleVocabulary } from "./retry-notice.meta.ts";
import {
  assertWorkflowCliText,
  styleWorkflowHeading,
  workflowCliWidth,
  workflowIndentedLines,
  workflowPrefixedLines,
} from "../workflow-cli.ts";

/** Inputs accepted by the terminal Retry notice renderer. */
export interface RetryNoticeCliProps extends CliPresentationOptions {
  readonly safeToRetry: boolean;
  readonly reason: string;
  readonly label?: string;
  readonly maxWidth?: number;
}

const cliExampleImplementations = [
  {
    name: "safe",
    props: {
      safeToRetry: true,
      label: "Read-only check",
      reason:
        "The check reads the current state and does not modify its inputs.",
    },
  },
  {
    name: "unsafe",
    props: {
      safeToRetry: false,
      label: "Inspect state before continuing",
      reason:
        "The first run may already have moved the source. Inspect both locations before choosing a recovery path.",
    },
  },
] as const satisfies readonly CliExample<RetryNoticeCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Retry notice states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<RetryNoticeCliProps>[] =
  cliExampleImplementations;

/** Render one visible retry-safety decision and its reason. */
const renderRetryNoticeCli: CliRenderer<RetryNoticeCliProps> = (
  props,
  capabilities,
) => {
  assertWorkflowCliText(props.reason, "retry reason", true);
  const width = workflowCliWidth(props.maxWidth, capabilities);
  const state = props.safeToRetry ? "Safe to retry" : "Do not retry";
  const label = props.label === undefined
    ? ""
    : `${capabilities.unicode ? " — " : " - "}${props.label}`;
  if (props.label !== undefined) {
    assertWorkflowCliText(props.label, "retry label");
  }
  const marker = props.safeToRetry ? (capabilities.unicode ? "✓" : "+") : "!";
  return [
    styleWorkflowHeading(
      workflowPrefixedLines(`${marker} `, `${state}${label}`, width).join("\n"),
      props.safeToRetry ? "success" : "danger",
      capabilities,
      props,
    ),
    ...workflowIndentedLines(props.reason, width),
  ].join("\n");
};

export default renderRetryNoticeCli;
