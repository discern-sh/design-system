/**
 * Pure terminal renderer and deterministic example states for Destructive action notice.
 *
 * @module
 */

import type {
  CliExample,
  CliPresentationOptions,
  CliRenderer,
} from "../../../cli/contracts.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { DestructiveActionNoticeTone } from "./destructive-action-notice.types.ts";
import meta, {
  componentExampleVocabulary,
} from "./destructive-action-notice.meta.ts";
import {
  assertWorkflowCliText,
  styleWorkflowHeading,
  workflowCliWidth,
  workflowFactLines,
  workflowPrefixedLines,
} from "../workflow-cli.ts";

/** Inputs accepted by the terminal Destructive action notice renderer. */
export interface DestructiveActionNoticeCliProps
  extends CliPresentationOptions {
  readonly label?: string;
  readonly scope: string;
  readonly impact: string;
  readonly recovery: string;
  readonly authority?: string;
  readonly tone?: DestructiveActionNoticeTone;
  readonly maxWidth?: number;
}

const cliExampleImplementations = [
  {
    name: "default",
    props: {
      label: "Owner approval required",
      scope: "The temporary directory selected for cleanup.",
      impact: "Its contents will no longer be available from that path.",
      authority: "Only the directory owner may approve removal.",
      recovery:
        "Move the directory to recoverable storage first when its contents have not been independently verified.",
    },
  },
  {
    name: "danger",
    props: {
      label: "Active data will be replaced",
      scope: "The current destination directory and every file below it.",
      impact: "Newer destination changes will be overwritten immediately.",
      recovery:
        "Stop now and create a dated copy of the destination before replacing it.",
      tone: "danger",
    },
  },
] as const satisfies readonly CliExample<DestructiveActionNoticeCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Destructive action notice states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<
  DestructiveActionNoticeCliProps
>[] = cliExampleImplementations;

/** Render explicit destructive scope, impact, authority, and recovery facts. */
const renderDestructiveActionNoticeCli: CliRenderer<
  DestructiveActionNoticeCliProps
> = (props, capabilities) => {
  const width = workflowCliWidth(props.maxWidth, capabilities);
  const tone = props.tone ?? "warning";
  const label = props.label ?? "Destructive action";
  assertWorkflowCliText(label, "destructive action label");
  for (
    const [name, value] of [
      ["scope", props.scope],
      ["impact", props.impact],
      ["recovery", props.recovery],
    ] as const
  ) {
    assertWorkflowCliText(value, `destructive action ${name}`, true);
  }
  const lines = [
    styleWorkflowHeading(
      workflowPrefixedLines(
        `${tone === "danger" ? "DANGER" : "WARNING"}: `,
        label,
        width,
      ).join("\n"),
      tone,
      capabilities,
      props,
    ),
    ...workflowFactLines("Scope", props.scope, width),
    ...workflowFactLines("Impact", props.impact, width),
  ];
  if (props.authority !== undefined) {
    assertWorkflowCliText(
      props.authority,
      "destructive action authority",
      true,
    );
    lines.push(...workflowFactLines("Authority", props.authority, width));
  }
  lines.push(...workflowFactLines("Recovery", props.recovery, width));
  return lines.join("\n");
};

export default renderDestructiveActionNoticeCli;
