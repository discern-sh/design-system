/**
 * Pure terminal renderer and deterministic example states for Fleet.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import {
  motifPassthrough,
  type TerminalMotifOptions,
} from "../../../cli/motif.ts";
import { measureText, padText, truncateText } from "../../../cli/text.ts";
import { renderMotifActivityBeacon } from "../../../cli/motifs.ts";
import { triangleGlyph, TRIANGLES } from "../../../cli/triangles.ts";
import type {
  TerminalSemanticTone,
  TerminalThemeVariant,
} from "../../../cli/theme.ts";
import type { AgentStatus } from "../agent-avatar/agent-avatar.types.ts";
import {
  agentsCliWidth,
  agentsFactLines,
  agentsPrefixedLines,
  assertAgentsCliText,
  styleAgentsHeading,
} from "../agents-cli.ts";

const statusTones: Readonly<Record<AgentStatus, TerminalSemanticTone>> = {
  working: "accent",
  waiting: "warning",
  blocked: "danger",
  done: "success",
  idle: "neutral",
};

/** One framework-neutral row accepted by the terminal Fleet renderer. */
export interface FleetCliRow {
  readonly persona: string;
  readonly branch?: string;
  readonly status?: AgentStatus;
  readonly statusLabel?: string;
  readonly ahead?: number;
  readonly behind?: number;
  readonly meta?: string;
  /** Semantic phase consumed by the package activity beacon. */
  readonly beaconPhase?: number;
}

/** Inputs accepted by the terminal Fleet renderer. */
export interface FleetCliProps extends TerminalMotifOptions {
  readonly rows: readonly FleetCliRow[];
  readonly label?: string;
  /** Preserve complete persona and branch text when compact cells cannot. */
  readonly identityMode?: "compact" | "lossless";
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Fleet states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<FleetCliProps>[] = [
  {
    name: "parallel-work",
    props: {
      rows: [
        {
          persona: "CLI 2B",
          branch: "agent/cli-2b",
          status: "working",
          ahead: 5,
          behind: 0,
          meta: "Workflow + Agents",
          beaconPhase: 2,
        },
        {
          persona: "CLI 2A",
          branch: "agent/cli-2a",
          status: "waiting",
          behind: 1,
        },
      ],
    },
  },
  {
    name: "lossless-identities",
    props: {
      identityMode: "lossless",
      maxWidth: 60,
      rows: [
        {
          persona: "Terminal contract audit",
          branch: "agent/terminal-contract-audit-with-complete-identities",
          status: "working",
          ahead: 3,
          meta: "Reviewing compatibility evidence",
          beaconPhase: 1,
        },
      ],
    },
  },
] as const;

function assertCount(value: number | undefined, name: string): void {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) {
    throw new TypeError(`${name} must be a non-negative safe integer`);
  }
}

function drift(row: FleetCliRow, unicode: boolean): string {
  const parts = [
    row.ahead === undefined ? undefined : `${unicode ? "↑" : "+"}${row.ahead}`,
    row.behind === undefined
      ? undefined
      : `${unicode ? "↓" : "-"}${row.behind}`,
  ].filter((value): value is string => value !== undefined);
  return parts.length === 0 ? (unicode ? "—" : "-") : parts.join(" ");
}

/** Render one status table of parallel agents and truthful activity frames. */
const renderFleetCli: CliRenderer<FleetCliProps> = (props, capabilities) => {
  if (props.rows.length === 0) {
    throw new TypeError("fleet requires at least one row");
  }
  const width = agentsCliWidth(props.maxWidth, capabilities, 20);
  const label = props.label ?? "Fleet";
  assertAgentsCliText(label, "fleet label");
  if (
    props.identityMode !== undefined && props.identityMode !== "compact" &&
    props.identityMode !== "lossless"
  ) {
    throw new TypeError("fleet identity mode must be compact or lossless");
  }
  const lossless = props.identityMode === "lossless";
  for (const [index, row] of props.rows.entries()) {
    assertAgentsCliText(row.persona, `fleet row ${index + 1} persona`);
    if (row.branch !== undefined) {
      assertAgentsCliText(row.branch, `fleet row ${index + 1} branch`);
    }
    if (row.statusLabel !== undefined) {
      assertAgentsCliText(
        row.statusLabel,
        `fleet row ${index + 1} status label`,
      );
    }
    if (row.meta !== undefined) {
      assertAgentsCliText(row.meta, `fleet row ${index + 1} metadata`, true);
    }
    assertCount(row.ahead, `fleet row ${index + 1} ahead`);
    assertCount(row.behind, `fleet row ${index + 1} behind`);
  }
  const lines = [
    styleAgentsHeading(label, "accent", capabilities, props.theme),
  ];
  if (width < 52) {
    for (const [index, row] of props.rows.entries()) {
      if (index > 0) lines.push("");
      const state = row.status === undefined
        ? "idle"
        : row.statusLabel ?? row.status;
      const identity = agentsPrefixedLines(
        "",
        `${row.persona}${capabilities.unicode ? " · " : " - "}${state}`,
        width,
      );
      lines.push(styleAgentsHeading(
        identity.join("\n"),
        row.status === undefined ? "neutral" : statusTones[row.status],
        capabilities,
        props.theme,
      ));
      if (lossless && !identity.join("\n").includes(row.persona)) {
        lines.push(`Persona: ${row.persona}`);
      }
      if (row.branch !== undefined) {
        const branch = agentsFactLines("Branch", row.branch, width);
        if (lossless && !branch.join("\n").includes(row.branch)) {
          lines.push(`Branch: ${row.branch}`);
        } else {
          lines.push(...branch);
        }
      }
      lines.push(
        ...agentsFactLines("Drift", drift(row, capabilities.unicode), width),
      );
      if (row.meta !== undefined) {
        lines.push(...agentsFactLines("Meta", row.meta, width));
      }
      if (row.status === "working" && row.beaconPhase !== undefined) {
        lines.push(`  ${
          renderMotifActivityBeacon(
            {
              width: Math.min(12, width - 2),
              phase: row.beaconPhase,
              marker: triangleGlyph(
                TRIANGLES.filledSmall.up,
                capabilities.unicode,
              ),
              ...(props.theme === undefined ? {} : { theme: props.theme }),
              ...motifPassthrough(props),
            },
            { ...capabilities, columns: width - 2 },
          )
        }`);
      }
    }
    return lines.join("\n");
  }

  const agentWidth = Math.max(12, Math.min(18, Math.floor(width * 0.25)));
  const stateWidth = 12;
  const driftWidth = 9;
  const gap = "  ";
  const branchWidth = width - agentWidth - stateWidth - driftWidth -
    3 * gap.length;
  lines.push(styleAgentsHeading(
    `${padText("AGENT", agentWidth)}${gap}${
      padText("BRANCH", branchWidth)
    }${gap}${padText("STATE", stateWidth)}${gap}DRIFT`,
    "neutral",
    capabilities,
    props.theme,
  ));
  for (const row of props.rows) {
    const state = row.status === undefined
      ? "idle"
      : row.statusLabel ?? row.status;
    const stateCell = styleAgentsHeading(
      padText(truncateText(state, stateWidth), stateWidth),
      row.status === undefined ? "neutral" : statusTones[row.status],
      capabilities,
      props.theme,
    );
    lines.push(
      `${padText(truncateText(row.persona, agentWidth), agentWidth)}${gap}${
        padText(
          truncateText(
            row.branch ?? (capabilities.unicode ? "—" : "-"),
            branchWidth,
          ),
          branchWidth,
        )
      }${gap}${stateCell}${gap}${
        truncateText(drift(row, capabilities.unicode), driftWidth)
      }`,
    );
    if (lossless && measureText(row.persona) > agentWidth) {
      lines.push(`  Persona: ${row.persona}`);
    }
    if (
      lossless && row.branch !== undefined &&
      measureText(row.branch) > branchWidth
    ) {
      lines.push(`  Branch: ${row.branch}`);
    }
    if (row.status === "working" && row.beaconPhase !== undefined) {
      const offset = agentWidth + gap.length + branchWidth + gap.length;
      lines.push(`${" ".repeat(offset)}${
        renderMotifActivityBeacon(
          {
            width: 8,
            phase: row.beaconPhase,
            marker: triangleGlyph(
              TRIANGLES.filledSmall.up,
              capabilities.unicode,
            ),
            ...(props.theme === undefined ? {} : { theme: props.theme }),
            ...motifPassthrough(props),
          },
          { ...capabilities, columns: 8 },
        )
      }`);
    }
    if (row.meta !== undefined) {
      lines.push(...agentsPrefixedLines("  ", row.meta, width));
    }
  }
  return lines.join("\n");
};

export default renderFleetCli;
