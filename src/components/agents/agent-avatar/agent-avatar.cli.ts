/**
 * Pure terminal renderer and deterministic example states for Agent avatar.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { measureText, truncateText } from "../../../cli/text.ts";
import type {
  TerminalSemanticTone,
  TerminalThemeVariant,
} from "../../../cli/theme.ts";
import { derivedInitials } from "../../initials.ts";
import type { AgentAvatarSize, AgentStatus } from "./agent-avatar.types.ts";
import {
  agentsCliWidth,
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

/** Inputs accepted by the terminal Agent avatar renderer. */
export interface AgentAvatarCliProps {
  readonly name: string;
  readonly sigil?: string;
  readonly size?: AgentAvatarSize;
  readonly status?: AgentStatus;
  readonly statusLabel?: string;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Agent avatar states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<AgentAvatarCliProps>[] = [
  { name: "identity", props: { name: "Release agent" } },
  {
    name: "working",
    props: { name: "Release agent", status: "working" },
  },
  { name: "blocked", props: { name: "Review", status: "blocked" } },
] as const;

/** Render one initials chip with an optional visible activity state. */
const renderAgentAvatarCli: CliRenderer<AgentAvatarCliProps> = (
  props,
  capabilities,
) => {
  assertAgentsCliText(props.name, "agent avatar name");
  if (props.sigil !== undefined) {
    assertAgentsCliText(props.sigil, "agent avatar sigil");
  }
  if (props.statusLabel !== undefined) {
    assertAgentsCliText(props.statusLabel, "agent avatar status label");
  }
  const width = agentsCliWidth(props.maxWidth, capabilities, 3);
  const size = props.size ?? "md";
  const mark = props.sigil ??
    derivedInitials(props.name, size === "xs" ? 1 : 2, /[\s\-_./]+/);
  const chip = `[${truncateText(mark, Math.max(1, width - 2))}]`;
  if (props.status === undefined || measureText(chip) + 2 >= width) {
    return styleAgentsHeading(
      truncateText(chip, width, capabilities.unicode ? "…" : "."),
      "accent",
      capabilities,
      props.theme,
    );
  }
  const marker = props.status === "working"
    ? (capabilities.unicode ? "●" : "*")
    : props.status === "waiting"
    ? (capabilities.unicode ? "◌" : "o")
    : props.status === "blocked"
    ? "!"
    : props.status === "done"
    ? (capabilities.unicode ? "✓" : "+")
    : (capabilities.unicode ? "·" : ".");
  const frame = truncateText(
    `${chip} ${marker} ${props.statusLabel ?? props.status}`,
    width,
    capabilities.unicode ? "…" : ".",
  );
  return styleAgentsHeading(
    frame,
    statusTones[props.status],
    capabilities,
    props.theme,
  );
};

export default renderAgentAvatarCli;
