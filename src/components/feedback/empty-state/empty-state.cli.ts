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
      title: "Create your first collection",
      description:
        "Collections keep related items together. Create one when you have something to save.",
      action: "Create collection",
    },
  },
  { name: "compact", props: { title: "No results" } },
  {
    name: "no-results",
    props: {
      title: "No results for 'field notes'",
      description: "Try fewer words or clear the filters to search all items.",
      action: "Clear filters",
    },
  },
  {
    name: "unavailable",
    props: {
      title: "This collection is unavailable",
      description:
        "It may have been moved or access may have changed. Return to your collections to choose another.",
      action: "Browse collections",
    },
  },
  {
    name: "recoverable-failure",
    props: {
      title: "Items could not be loaded",
      description:
        "Your collection is still saved. Check your connection, then try loading it again.",
      action: "Try loading again",
    },
  },
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
