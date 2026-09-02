/**
 * Pure terminal renderer and deterministic example states for Empty state.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import { renderBox } from "../../../cli/box.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type {
  CliExample,
  CliPresentationOptions,
  CliRenderer,
} from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import { resolveTerminalTheme, terminalToneColor } from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./empty-state.meta.ts";

/** Inputs accepted by the terminal Empty state renderer. */
export interface EmptyStateCliProps extends CliPresentationOptions {
  readonly title: string;
  readonly description?: string;
  readonly action?: string;
  readonly width?: number;
}

const cliExampleImplementations = [
  {
    name: "default",
    props: {
      title: "Nothing here yet",
      description: "Create the first item to get started.",
      action: "Create item",
    },
  },
  { name: "compact", props: { title: "No results" } },
] as const satisfies readonly CliExample<EmptyStateCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Empty state states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<EmptyStateCliProps>[] =
  cliExampleImplementations;

/** Render one framed terminal placeholder with an optional next action. */
const renderEmptyStateCli: CliRenderer<EmptyStateCliProps> = (
  props,
  capabilities,
) => {
  if (props.title.trim() === "") {
    throw new TypeError("empty-state title must be non-empty");
  }
  const theme = resolveTerminalTheme(props);
  const mark = capabilities.unicode ? "◇" : "*";
  const action = props.action === undefined ? "" : styleText(
    `${capabilities.unicode ? "→" : "->"} ${props.action}`,
    {
      ...theme.typography.strong,
      color: terminalToneColor(theme, "accent"),
    },
    capabilities,
  );
  const body = joinVertical([
    styleText(`${mark} ${props.title}`, theme.typography.strong, capabilities),
    props.description ?? "",
    action,
  ], { spacing: 1 });
  return renderBox({
    body,
    title: "Empty",
    width: props.width ?? Math.min(56, capabilities.columns),
    borderStyle: { color: terminalToneColor(theme, "neutral") },
  }, capabilities);
};

export default renderEmptyStateCli;
