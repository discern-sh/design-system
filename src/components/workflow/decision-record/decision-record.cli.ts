/**
 * Pure terminal renderer and deterministic example states for Decision record.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import type { DecisionRecordStatus } from "./decision-record.types.ts";
import meta, { componentExampleVocabulary } from "./decision-record.meta.ts";
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

const cliExampleImplementations = [
  {
    name: "default",
    props: {
      identifier: "ADR 0012",
      title: "Generated references have one authored source",
      status: "accepted",
      date: "2026-04-14",
      dateLabel: "14 April 2026",
      context: "Several generated references repeat the same facts.",
      decision: "The source schema is their single authored source.",
      consequences: "Contributors regenerate references after schema edits.",
    },
  },
  {
    name: "superseded",
    props: {
      identifier: "ADR 0007",
      title: "Routes are registered by hand",
      status: "superseded",
      date: "2025-09-03",
      dateLabel: "3 September 2025",
      context: "The initial service used a short handwritten route index.",
      decision: "Each route was added to that index manually.",
      consequences: "Schema-driven routing replaces the handwritten index.",
    },
  },
] as const satisfies readonly CliExample<DecisionRecordCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Decision record states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<DecisionRecordCliProps>[] =
  cliExampleImplementations;

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
