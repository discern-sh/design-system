/**
 * Pure terminal renderer and deterministic example states for Path reference.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import {
  terminalThemeColor,
  type TerminalThemeVariant,
} from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./path-reference.meta.ts";
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
export const cliExamples = defineCliExamples(
  meta,
  componentExampleVocabulary,
  [
    { name: "default", props: { path: "/path/to/project/deno.json" } },
    {
      name: "long-path",
      props: {
        path:
          "/path/to/a/deliberately/long/project/src/components/example/component.tsx",
        maxWidth: 36,
      },
    },
  ] as const satisfies readonly CliExample<PathReferenceCliProps>[],
);

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
