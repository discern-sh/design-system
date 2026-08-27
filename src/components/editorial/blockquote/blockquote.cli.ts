/**
 * Pure terminal renderer and deterministic example states for Blockquote.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import {
  type CliBlock,
  createCliBlock,
  renderCliBlocks,
} from "../../../cli/block-composition.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import {
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
} from "../../../cli/theme.ts";
import renderParagraphCli from "../paragraph/paragraph.cli.ts";
import meta, { componentExampleVocabulary } from "./blockquote.meta.ts";

/** Inputs accepted by the terminal Blockquote renderer. */
export interface BlockquoteCliProps {
  /** Opaque package Component blocks rendered within the quotation. */
  readonly children: readonly CliBlock[];
  /** Terminal Theme variant; defaults to dark. */
  readonly theme?: TerminalThemeVariant;
  /** Maximum quotation measure in cells, bounded by terminal columns. */
  readonly maxWidth?: number;
}

const RAIL_WIDTH = 2;

/** Render semantic child blocks behind a quiet capability-aware quote rail. */
const renderBlockquoteCli: CliRenderer<BlockquoteCliProps> = (
  props,
  capabilities,
) => {
  if (!Array.isArray(props.children) || props.children.length === 0) {
    throw new TypeError("blockquote requires one or more CLI block children");
  }
  const requested = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requested) || requested < RAIL_WIDTH + 1) {
    throw new TypeError(
      `blockquote width must be a safe integer of at least ${
        RAIL_WIDTH + 1
      }; received ${requested}`,
    );
  }
  const width = Math.min(requested, capabilities.columns);
  if (width < RAIL_WIDTH + 1) {
    throw new TypeError(
      `blockquote requires at least ${RAIL_WIDTH + 1} terminal columns`,
    );
  }

  const theme = terminalThemes[props.theme ?? "dark"];
  const rail = styleText(
    `${capabilities.unicode ? "│" : "|"} `,
    {
      ...theme.typography.muted,
      color: terminalThemeColor(theme, "--discern-color-ink-faint"),
    },
    capabilities,
  );
  const content = renderCliBlocks(props.children, capabilities, {
    maxWidth: width - RAIL_WIDTH,
  });
  return content.split("\n").map((line) => `${rail}${line}`).join("\n");
};

const cliExampleImplementations = [
  {
    name: "default",
    props: {
      children: [
        createCliBlock(renderParagraphCli, {
          content: [
            "A neutral quotation can carry ordinary prose and ",
            { kind: "emphasis", content: "inline meaning" },
            " without inventing an attribution.",
          ],
        }),
        createCliBlock(renderParagraphCli, {
          content: "A second block stays part of the same quotation.",
        }),
      ],
    },
  },
  {
    name: "nested-quotation",
    props: {
      children: [
        createCliBlock(renderParagraphCli, {
          content: "An outer quotation can introduce a quoted response.",
        }),
        createCliBlock(renderBlockquoteCli, {
          children: [createCliBlock(renderParagraphCli, {
            content:
              "Nested quoted material remains a semantic block of its own.",
          })],
        }),
      ],
    },
  },
] as const satisfies readonly CliExample<BlockquoteCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Blockquote states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<BlockquoteCliProps>[] =
  cliExampleImplementations;

export default renderBlockquoteCli;
