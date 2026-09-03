/**
 * Pure terminal renderer and deterministic example states for Worklog.
 *
 * @module
 */

import {
  type CliExample,
  type CliPresentationOptions,
  cliPresentationPassthrough,
  type CliRenderer,
} from "../../../cli/contracts.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import { renderMotifActivityBeacon } from "../../../cli/motifs.ts";
import { triangleGlyph, TRIANGLES } from "../../../cli/triangles.ts";
import type { TerminalSemanticTone } from "../../../cli/theme.ts";
import type { WorklogStatus } from "./worklog.types.ts";
import meta, { componentExampleVocabulary } from "./worklog.meta.ts";
import {
  agentsCliWidth,
  agentsFactLines,
  agentsIndentedLines,
  agentsPrefixedLines,
  assertAgentsCliText,
  styleAgentsHeading,
} from "../agents-cli.ts";

const statusTones: Readonly<Record<WorklogStatus, TerminalSemanticTone>> = {
  done: "success",
  active: "accent",
  queued: "neutral",
  failed: "danger",
  skipped: "neutral",
};

/** One framework-neutral entry accepted by the terminal Worklog renderer. */
export interface WorklogCliEntry {
  readonly label: string;
  readonly status: WorklogStatus;
  readonly statusLabel?: string;
  readonly detail?: string;
  readonly meta?: string;
  /** Semantic phase consumed by the package activity beacon. */
  readonly phase?: number;
}

/** Inputs accepted by the terminal Worklog renderer. */
export interface WorklogCliProps extends CliPresentationOptions {
  readonly entries: readonly WorklogCliEntry[];
  readonly maxWidth?: number;
}

const cliExampleImplementations = [
  {
    name: "default",
    props: {
      entries: [
        { label: "Generate registry", status: "done", meta: "120ms" },
        {
          label: "Run exact-frame tests",
          status: "active",
          detail: "Testing every capability level.",
          phase: 2,
        },
        { label: "Hand off for review", status: "queued" },
      ],
    },
  },
  {
    name: "failure",
    props: {
      entries: [
        { label: "Format and build", status: "done", meta: "11s" },
        {
          label: "Run the test suite",
          status: "failed",
          detail: "2 of 184 cases failing",
          meta: "38s",
        },
        { label: "Publish the preview", status: "skipped" },
      ],
    },
  },
] as const satisfies readonly CliExample<WorklogCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Worklog states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<WorklogCliProps>[] =
  cliExampleImplementations;

function staticMarker(
  status: Exclude<WorklogStatus, "active">,
  unicode: boolean,
): string {
  if (status === "done") return unicode ? "✓" : "+";
  if (status === "queued") return unicode ? "·" : ".";
  if (status === "failed") return unicode ? "✕" : "x";
  return unicode ? "–" : "-";
}

/** Render a compact status feed with a caller-phased active beacon. */
const renderWorklogCli: CliRenderer<WorklogCliProps> = (
  props,
  capabilities,
) => {
  if (props.entries.length === 0) {
    throw new TypeError("worklog requires at least one entry");
  }
  const width = agentsCliWidth(props.maxWidth, capabilities, 16);
  const lines: string[] = [];
  for (const [index, entry] of props.entries.entries()) {
    assertAgentsCliText(entry.label, `worklog entry ${index + 1} label`);
    if (entry.statusLabel !== undefined) {
      assertAgentsCliText(
        entry.statusLabel,
        `worklog entry ${index + 1} status label`,
      );
    }
    if (entry.detail !== undefined) {
      assertAgentsCliText(
        entry.detail,
        `worklog entry ${index + 1} detail`,
        true,
      );
    }
    if (entry.meta !== undefined) {
      assertAgentsCliText(
        entry.meta,
        `worklog entry ${index + 1} metadata`,
        true,
      );
    }
    const marker = entry.status === "active"
      ? renderMotifActivityBeacon(
        {
          ...cliPresentationPassthrough(props),
          width: 8,
          phase: entry.phase ?? 0,
          marker: triangleGlyph(TRIANGLES.filledSmall.up, capabilities.unicode),
        },
        { ...capabilities, columns: 8 },
      )
      : styleAgentsHeading(
        staticMarker(entry.status, capabilities.unicode),
        statusTones[entry.status],
        capabilities,
        props,
      );
    lines.push(...agentsPrefixedLines(
      `${marker} `,
      `${entry.label} [${entry.statusLabel ?? entry.status}]`,
      width,
    ));
    if (entry.detail !== undefined) {
      lines.push(...agentsIndentedLines(entry.detail, width));
    }
    if (entry.meta !== undefined) {
      lines.push(...agentsFactLines("Meta", entry.meta, width));
    }
  }
  return lines.join("\n");
};

export default renderWorklogCli;
