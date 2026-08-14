/**
 * Pure terminal renderer and deterministic example states for Agent mention.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { truncateText } from "../../../cli/text.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import {
  agentsCliWidth,
  assertAgentsCliText,
  styleAgentsHeading,
} from "../agents-cli.ts";

/** Inputs accepted by the terminal Agent mention renderer. */
export interface AgentMentionCliProps {
  readonly name: string;
  readonly sigil?: string;
  readonly href?: string;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Agent mention states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<AgentMentionCliProps>[] = [
  { name: "static", props: { name: "reviewer" } },
  {
    name: "linked",
    props: { name: "release", href: "https://example.test/agents/release" },
  },
] as const;

/** Render one sigil-led agent mention with an optional link target. */
const renderAgentMentionCli: CliRenderer<AgentMentionCliProps> = (
  props,
  capabilities,
) => {
  assertAgentsCliText(props.name, "agent mention name");
  if (props.sigil !== undefined) {
    assertAgentsCliText(props.sigil, "agent mention sigil");
  }
  if (props.href !== undefined) {
    assertAgentsCliText(props.href, "agent mention href");
  }
  const width = agentsCliWidth(props.maxWidth, capabilities, 4);
  const sigil = props.sigil ?? (capabilities.unicode ? "❯" : ">");
  const frame = `${sigil} @${props.name}${
    props.href === undefined ? "" : ` <${props.href}>`
  }`;
  return styleAgentsHeading(
    truncateText(frame, width, capabilities.unicode ? "…" : "."),
    "accent",
    capabilities,
    props.theme,
  );
};

export default renderAgentMentionCli;
