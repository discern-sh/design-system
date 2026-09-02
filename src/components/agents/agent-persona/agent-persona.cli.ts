/**
 * Pure terminal renderer and deterministic example states for Agent persona.
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
import renderAgentAvatarCli from "../agent-avatar/agent-avatar.cli.ts";
import type { AgentStatus } from "../agent-avatar/agent-avatar.types.ts";
import type { AgentPersonaSize } from "./agent-persona.types.ts";
import meta, { componentExampleVocabulary } from "./agent-persona.meta.ts";
import {
  agentsCliWidth,
  agentsIndentedLines,
  agentsPrefixedLines,
  assertAgentsCliText,
} from "../agents-cli.ts";

/** Inputs accepted by the terminal Agent persona renderer. */
export interface AgentPersonaCliProps extends CliPresentationOptions {
  readonly name: string;
  readonly detail?: string;
  readonly sigil?: string;
  readonly status?: AgentStatus;
  readonly statusLabel?: string;
  readonly size?: AgentPersonaSize;
  readonly maxWidth?: number;
}

const cliExampleImplementations = [
  {
    name: "default",
    props: { name: "Release agent", detail: "Runs publication gates" },
  },
  {
    name: "working",
    props: {
      name: "Release agent",
      detail: "Runs publication gates",
      status: "working",
    },
  },
] as const satisfies readonly CliExample<AgentPersonaCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Agent persona states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<AgentPersonaCliProps>[] =
  cliExampleImplementations;

/** Render one terminal agent identity lockup with detail and status. */
const renderAgentPersonaCli: CliRenderer<AgentPersonaCliProps> = (
  props,
  capabilities,
) => {
  assertAgentsCliText(props.name, "agent persona name");
  if (props.detail !== undefined) {
    assertAgentsCliText(props.detail, "agent persona detail", true);
  }
  if (props.sigil !== undefined) {
    assertAgentsCliText(props.sigil, "agent persona sigil");
  }
  if (props.statusLabel !== undefined) {
    assertAgentsCliText(props.statusLabel, "agent persona status label");
  }
  const width = agentsCliWidth(props.maxWidth, capabilities, 12);
  const avatar = renderAgentAvatarCli(
    {
      ...cliPresentationPassthrough(props),
      name: props.name,
      ...(props.sigil === undefined ? {} : { sigil: props.sigil }),
      ...(props.size === undefined ? {} : { size: props.size }),
      maxWidth: 4,
    },
    { ...capabilities, columns: width },
  );
  const status = props.status === undefined
    ? ""
    : `${capabilities.unicode ? " · " : " - "}${
      props.statusLabel ?? props.status
    }`;
  const lines = [
    ...agentsPrefixedLines(`${avatar} `, `${props.name}${status}`, width),
  ];
  if (props.detail !== undefined) {
    lines.push(...agentsIndentedLines(props.detail, width, 5));
  }
  return lines.join("\n");
};

export default renderAgentPersonaCli;
