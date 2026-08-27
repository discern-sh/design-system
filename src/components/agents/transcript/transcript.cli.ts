/**
 * Pure terminal renderer and deterministic example states for Transcript.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./transcript.meta.ts";
import {
  agentsCliWidth,
  agentsIndentedLines,
  agentsPrefixedLines,
  assertAgentsCliText,
  styleAgentsHeading,
} from "../agents-cli.ts";

/** One framework-neutral turn accepted by the terminal Transcript renderer. */
export interface TranscriptCliTurn {
  readonly speaker: string;
  readonly body: string;
  readonly aside?: string;
}

/** Inputs accepted by the terminal Transcript renderer. */
export interface TranscriptCliProps {
  readonly turns: readonly TranscriptCliTurn[];
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

const cliExampleImplementations = [
  {
    name: "default",
    props: {
      turns: [
        { speaker: "Maintainer", body: "Run the complete gate." },
        {
          speaker: "Agent",
          aside: "after verification",
          body: "The gate passed and the proof is recorded.",
        },
      ],
    },
  },
] as const satisfies readonly CliExample<TranscriptCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Transcript states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<TranscriptCliProps>[] =
  cliExampleImplementations;

/** Render ordered speaker turns with bodies indented beneath their identity. */
const renderTranscriptCli: CliRenderer<TranscriptCliProps> = (
  props,
  capabilities,
) => {
  if (props.turns.length === 0) {
    throw new TypeError("transcript requires at least one turn");
  }
  const width = agentsCliWidth(props.maxWidth, capabilities);
  const lines: string[] = [];
  for (const [index, turn] of props.turns.entries()) {
    assertAgentsCliText(turn.speaker, `transcript turn ${index + 1} speaker`);
    assertAgentsCliText(turn.body, `transcript turn ${index + 1} body`, true);
    if (turn.aside !== undefined) {
      assertAgentsCliText(turn.aside, `transcript turn ${index + 1} aside`);
    }
    if (index > 0) lines.push("");
    const label = `${turn.speaker}${
      turn.aside === undefined
        ? ""
        : `${capabilities.unicode ? " · " : " - "}${turn.aside}`
    }`;
    lines.push(styleAgentsHeading(
      agentsPrefixedLines("", label, width).join("\n"),
      "accent",
      capabilities,
      props.theme,
    ));
    lines.push(...agentsIndentedLines(turn.body, width));
  }
  return lines.join("\n");
};

export default renderTranscriptCli;
