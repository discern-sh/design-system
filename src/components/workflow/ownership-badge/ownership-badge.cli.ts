/**
 * Pure terminal renderer and deterministic example states for Ownership badge.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import { truncateText } from "../../../cli/text.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import type { ArtifactOwnership } from "./ownership-badge.types.ts";
import meta, { componentExampleVocabulary } from "./ownership-badge.meta.ts";
import { workflowCliWidth } from "../workflow-cli.ts";

const labels: Readonly<Record<ArtifactOwnership, string>> = {
  authored: "Authored",
  generated: "Generated",
  "project-owned": "Project-owned",
  "tool-owned": "Tool-owned",
};

/** Inputs accepted by the terminal Ownership badge renderer. */
export interface OwnershipBadgeCliProps {
  readonly ownership: ArtifactOwnership;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

const cliExampleImplementations = [
  { name: "authored", props: { ownership: "authored" } },
  { name: "generated", props: { ownership: "generated" } },
  { name: "project-owned", props: { ownership: "project-owned" } },
  { name: "tool-owned", props: { ownership: "tool-owned" } },
] as const satisfies readonly CliExample<OwnershipBadgeCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Ownership badge states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<OwnershipBadgeCliProps>[] =
  cliExampleImplementations;

/** Render one explicit terminal artifact-ownership chip. */
const renderOwnershipBadgeCli: CliRenderer<OwnershipBadgeCliProps> = (
  props,
  capabilities,
) => {
  const theme = terminalThemes[props.theme ?? "dark"];
  const width = workflowCliWidth(props.maxWidth, capabilities, 3);
  return styleText(
    `[${
      truncateText(
        labels[props.ownership],
        width - 2,
        capabilities.unicode ? "…" : ".",
      )
    }]`,
    {
      ...theme.typography.strong,
      color: terminalToneColor(theme, "neutral"),
    },
    capabilities,
  );
};

export default renderOwnershipBadgeCli;
