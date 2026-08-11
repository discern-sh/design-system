/**
 * Pure terminal renderer and deterministic example states for Artifact card.
 *
 * @module
 */

import { renderBox } from "../../../cli/box.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import {
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import type { ArtifactOwnership } from "../ownership-badge/ownership-badge.types.ts";
import {
  assertWorkflowCliText,
  workflowCliTheme,
  workflowCliWidth,
  workflowPathText,
} from "../workflow-cli.ts";

const ownershipLabels: Readonly<Record<ArtifactOwnership, string>> = {
  authored: "Authored",
  generated: "Generated",
  "project-owned": "Project-owned",
  "tool-owned": "Tool-owned",
};

/** Inputs accepted by the terminal Artifact card renderer. */
export interface ArtifactCardCliProps {
  readonly name: string;
  readonly path: string;
  readonly summary: string;
  readonly ownership: ArtifactOwnership;
  readonly provenance: string;
  readonly source?: string;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Artifact card states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<ArtifactCardCliProps>[] = [
  {
    name: "generated",
    props: {
      name: "CLI renderer registry",
      path: "src/generated/cli-renderers.ts",
      summary: "Public aliases generated from component metadata.",
      ownership: "generated",
      provenance: "deno task codegen",
      source: "Component metadata",
    },
  },
] as const;

/** Render one terminal artifact account with ownership and provenance. */
const renderArtifactCardCli: CliRenderer<ArtifactCardCliProps> = (
  props,
  capabilities,
) => {
  for (
    const [name, value] of [
      ["name", props.name],
      ["path", props.path],
      ["summary", props.summary],
      ["provenance", props.provenance],
    ] as const
  ) {
    assertWorkflowCliText(value, `artifact ${name}`, name === "summary");
  }
  if (props.source !== undefined) {
    assertWorkflowCliText(props.source, "artifact source", true);
  }
  const width = workflowCliWidth(props.maxWidth, capabilities, 20);
  const theme = workflowCliTheme(props.theme);
  const body = [
    props.summary,
    "",
    `Path: ${
      workflowPathText(props.path, Math.max(1, width - 10), capabilities)
    }`,
    `Ownership: ${ownershipLabels[props.ownership]}`,
    `Provenance: ${props.provenance}`,
    ...(props.source === undefined ? [] : [`Source: ${props.source}`]),
  ].join("\n");
  return renderBox(
    {
      title: `Artifact: ${props.name}`,
      body,
      width,
      borderStyle: { color: terminalToneColor(theme, "neutral") },
    },
    capabilities,
  );
};

export default renderArtifactCardCli;
