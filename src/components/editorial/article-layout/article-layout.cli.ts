/**
 * Pure terminal renderer and deterministic example states for Article layout.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import { wrapText } from "../../../cli/text.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./article-layout.meta.ts";

/** Inputs accepted by the terminal Article layout renderer. */
export interface ArticleLayoutCliProps {
  readonly body: string;
  readonly navigation?: string;
  readonly navigationLabel?: string;
  readonly rail?: string;
  readonly railLabel?: string;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Article layout states rendered by the CLI catalogue. */
export const cliExamples = defineCliExamples(
  meta,
  componentExampleVocabulary,
  [{
    name: "default",
    props: {
      navigation: "01 · Context\n02 · Method",
      navigationLabel: "On this page",
      body:
        "A reading shell with room to think.\nThe central column carries the narrative while optional rails hold orientation and supporting detail without interrupting the argument.",
      rail: "Filed under\nPractice",
      railLabel: "Article context",
    },
  }] as const satisfies readonly CliExample<ArticleLayoutCliProps>[],
);

function wrapBlock(value: string, width: number): string {
  return value.split("\n").flatMap((line) => wrapText(line, width)).join("\n");
}

/** Render navigation, article body, and context in terminal reading order. */
const renderArticleLayoutCli: CliRenderer<ArticleLayoutCliProps> = (
  props,
  capabilities,
) => {
  const requested = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requested) || requested < 12) {
    throw new TypeError(
      `article layout width must be a safe integer of at least 12; received ${requested}`,
    );
  }
  if (props.body.trim() === "") {
    throw new TypeError("article layout body must be non-empty");
  }
  const width = Math.min(requested, capabilities.columns);
  const theme = terminalThemes[props.theme ?? "dark"];
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
      labelled(props.navigationLabel ?? "Article navigation", props.navigation),
    );
  }
  blocks.push(wrapBlock(props.body, width));
  if (props.rail !== undefined) {
    blocks.push(labelled(props.railLabel ?? "Article context", props.rail));
  }
  return joinVertical(blocks, { spacing: 1 });
};

export default renderArticleLayoutCli;
