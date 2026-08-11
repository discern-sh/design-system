/**
 * Pure terminal renderer and deterministic example states for Decision record.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import type { DecisionRecordStatus } from "./decision-record.types.ts";
import {
  assertWorkflowCliText,
  styleWorkflowHeading,
  workflowCliWidth,
  workflowFactLines,
  workflowPrefixedLines,
} from "../workflow-cli.ts";

const statusLabels: Readonly<Record<DecisionRecordStatus, string>> = {
  accepted: "Accepted",
  superseded: "Superseded",
};

/** Inputs accepted by the terminal Decision record renderer. */
export interface DecisionRecordCliProps {
  readonly identifier?: string;
  readonly title: string;
  readonly status: DecisionRecordStatus;
  readonly date: string;
  readonly dateLabel?: string;
  readonly context: string;
  readonly decision: string;
  readonly consequences: string;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Decision record states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<DecisionRecordCliProps>[] = [
  {
    name: "accepted",
    props: {
      identifier: "ADR-0002",
      title: "Keep CLI renderers React-free",
      status: "accepted",
      date: "2026-08-03",
      context: "Terminal consumers do not install React.",
      decision: "Renderers accept plain state and capabilities.",
      consequences: "The CLI graph remains framework-neutral.",
    },
  },
] as const;

/** Render one terminal architecture-decision account. */
const renderDecisionRecordCli: CliRenderer<DecisionRecordCliProps> = (
  props,
  capabilities,
) => {
  const width = workflowCliWidth(props.maxWidth, capabilities);
  for (
    const [name, value] of [
      ["title", props.title],
      ["date", props.date],
      ["context", props.context],
      ["decision", props.decision],
      ["consequences", props.consequences],
    ] as const
  ) {
    assertWorkflowCliText(value, `decision record ${name}`, true);
  }
  if (props.identifier !== undefined) {
    assertWorkflowCliText(props.identifier, "decision record identifier");
  }
  if (props.dateLabel !== undefined) {
    assertWorkflowCliText(props.dateLabel, "decision record date label");
  }
  const prefix = props.identifier === undefined
    ? ""
    : `${props.identifier}${capabilities.unicode ? " · " : " - "}`;
  const heading = workflowPrefixedLines(prefix, props.title, width).join("\n");
  return [
    styleWorkflowHeading(
      heading,
      props.status === "accepted" ? "success" : "neutral",
      capabilities,
      props.theme,
    ),
    ...workflowFactLines("Status", statusLabels[props.status], width),
    ...workflowFactLines("Date", props.dateLabel ?? props.date, width),
    ...workflowFactLines("Context", props.context, width),
    ...workflowFactLines("Decision", props.decision, width),
    ...workflowFactLines("Consequences", props.consequences, width),
  ].join("\n");
};

export default renderDecisionRecordCli;
