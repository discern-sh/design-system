/**
 * Pure terminal renderer and deterministic example states for Docs layout.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type {
  CliExample,
  CliPresentationOptions,
  CliRenderer,
} from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import { wrapText } from "../../../cli/text.ts";
import { resolveTerminalTheme, terminalToneColor } from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./docs-layout.meta.ts";

/** Inputs accepted by the terminal Docs layout renderer. */
export interface DocsLayoutCliProps extends CliPresentationOptions {
  /** The document, rendered between the navigation and the rail. */
  readonly body: string;
  readonly navigation?: string;
  readonly navigationLabel?: string;
  readonly rail?: string;
  readonly railLabel?: string;
  readonly maxWidth?: number;
}

const cliExampleImplementations = [{
  name: "default",
  props: {
    navigation:
      "Orientation\n· Overview\n· Getting started\nReference\n· Configuration",
    navigationLabel: "Navigation",
    body:
      "Getting started\nInstall the tool, then run its setup command from the project root. The command writes one configuration file and explains what it configured.",
    rail: "01 Install\n02 Configure\n03 Verify",
    railLabel: "On this page",
  },
}, {
  name: "plain",
  props: {
    body:
      "Release notes\nEach release lists its public API changes first, then the components and verification that changed.",
    rail: "01 Public API\n02 Components",
    railLabel: "On this page",
  },
}] as const satisfies readonly CliExample<DocsLayoutCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Docs layout states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<DocsLayoutCliProps>[] =
  cliExampleImplementations;

function wrapBlock(value: string, width: number): string {
  return value.split("\n").flatMap((line) => wrapText(line, width)).join("\n");
}

/** Render navigation, document, and contents rail in terminal reading order. */
const renderDocsLayoutCli: CliRenderer<DocsLayoutCliProps> = (
  props,
  capabilities,
) => {
  const requested = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requested) || requested < 12) {
    throw new TypeError(
      `docs layout width must be a safe integer of at least 12; received ${requested}`,
    );
  }
  if (props.body.trim() === "") {
    throw new TypeError("docs layout body must be non-empty");
  }
  const width = Math.min(requested, capabilities.columns);
  const theme = resolveTerminalTheme(props);
  const labelled = (label: string, value: string): string =>
    joinVertical([
      styleText(`[${label}]`, {
        ...theme.typography.strong,
        color: terminalToneColor(theme, "accent"),
      }, capabilities),
      wrapBlock(value, width),
    ]);
  const blocks: string[] = [];
  if (props.navigation !== undefined) {
    blocks.push(
      labelled(props.navigationLabel ?? "Navigation", props.navigation),
    );
  }
  blocks.push(wrapBlock(props.body, width));
  if (props.rail !== undefined) {
    blocks.push(labelled(props.railLabel ?? "Page context", props.rail));
  }
  return joinVertical(blocks, { spacing: 1 });
};

export default renderDocsLayoutCli;
