import { denseTranscriptTurns } from "../operational-examples.ts";
/**
 * Pure terminal renderer and deterministic example states for Transcript.
 *
 * @module
 */

import type {
  CliExample,
  CliPresentationOptions,
  CliRenderer,
} from "../../../cli/contracts.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import { transcriptPositions } from "./transcript.types.ts";
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
  /** Explicit routine group; omission separates turns. */
  readonly routineGroup?: string;
  /** Stable caller-owned speaker identity. */
  readonly speakerId?: string;
}

/** Inputs accepted by the terminal Transcript renderer. */
export interface TranscriptCliProps extends CliPresentationOptions {
  readonly turns: readonly TranscriptCliTurn[];
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
  { name: "dense", props: { turns: denseTranscriptTurns } },
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
  const positions = transcriptPositions(props.turns);
  for (const [index, turn] of props.turns.entries()) {
    if (turn.routineGroup !== undefined) {
      assertAgentsCliText(turn.routineGroup, "transcript routine group");
    }
    assertAgentsCliText(turn.speaker, `transcript turn ${index + 1} speaker`);
    assertAgentsCliText(turn.body, `transcript turn ${index + 1} body`, true);
    if (turn.aside !== undefined) {
      assertAgentsCliText(turn.aside, `transcript turn ${index + 1} aside`);
    }
    const position = positions[index];
    if (position?.continued) {
      if (turn.aside !== undefined) {
        lines.push(...agentsPrefixedLines("  ", turn.aside, width));
      }
      lines.push(...agentsIndentedLines(turn.body, width));
      continue;
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
      props,
    ));
    if (position !== undefined) {
      lines.push(
        ...agentsPrefixedLines(
          "  ",
          `${position.label} (${position.size} entries)`,
          width,
        ),
      );
    }
    lines.push(...agentsIndentedLines(turn.body, width));
  }
  return lines.join("\n");
};

export default renderTranscriptCli;
