/**
 * Pure terminal renderer and deterministic example states for Path reference.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import {
  terminalThemeColor,
  type TerminalThemeVariant,
} from "../../../cli/theme.ts";
import {
  assertWorkflowCliText,
  workflowCliTheme,
  workflowCliWidth,
  workflowPathText,
} from "../workflow-cli.ts";

/** Inputs accepted by the terminal Path reference renderer. */
export interface PathReferenceCliProps {
  readonly path: string;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Path reference states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<PathReferenceCliProps>[] = [
  { name: "source", props: { path: "src/components/workflow/mod.ts" } },
  { name: "directory", props: { path: "/tmp/discern/output/" } },
] as const;

/** Render one suffix-preserving terminal path reference. */
const renderPathReferenceCli: CliRenderer<PathReferenceCliProps> = (
  props,
  capabilities,
) => {
  assertWorkflowCliText(props.path, "path reference");
  const width = workflowCliWidth(props.maxWidth, capabilities, 4);
  const theme = workflowCliTheme(props.theme);
  return styleText(
    workflowPathText(props.path, width, capabilities),
    {
      ...theme.typography.annotation,
      color: terminalThemeColor(theme, "--discern-color-ink-muted"),
    },
    capabilities,
  );
};

export default renderPathReferenceCli;
