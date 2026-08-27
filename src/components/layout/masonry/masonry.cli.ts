/**
 * Pure terminal renderer and deterministic example states for Masonry.
 *
 * @module
 */

import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical, layoutColumns } from "../../../cli/layout.ts";
import { wrapText } from "../../../cli/text.ts";
import {
  type TerminalSpacingTokenName,
  terminalThemes,
  type TerminalThemeVariant,
} from "../../../cli/theme.ts";
import { responsiveColumnCount } from "../responsive-columns.ts";
import type { SpaceStep } from "../space.ts";
import meta, { componentExampleVocabulary } from "./masonry.meta.ts";

/** Inputs accepted by the terminal Masonry renderer. */
export interface MasonryCliProps {
  readonly blocks: readonly string[];
  readonly gap?: SpaceStep;
  readonly minimum?: number;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** Deterministic Masonry states rendered by `deno task catalogue:cli masonry`. */
export const cliExamples = defineCliExamples(
  meta,
  componentExampleVocabulary,
  [
    {
      name: "default",
      props: {
        blocks: [
          "A concise observation\nOne short supporting thought.",
          "A developed explanation\nNatural content height determines this item's footprint.\nThe next peer packs into the available lane without inventing a row.",
          "A visual note\nIndependent items can vary without truncation.\nTheir DOM sequence remains unchanged.\nMeaning never depends on which cards happen to become neighbours.",
          "A compact aside\nAnother deliberately brief item.",
        ],
        minimum: 10,
        width: 36,
      },
    },
    {
      name: "single-column",
      props: {
        blocks: [
          "A concise observation\nOne short supporting thought.",
          "A developed explanation\nNatural content height determines this item's footprint.",
          "A visual note\nIndependent items can vary without truncation.",
        ],
        minimum: 12,
        width: 12,
      },
    },
  ] as const satisfies readonly CliExample<MasonryCliProps>[],
);

/** Pack terminal blocks into the currently shortest responsive column. */
const renderMasonryCli: CliRenderer<MasonryCliProps> = (
  props,
  capabilities,
) => {
  if (
    props.blocks.some((block) =>
      /[\p{Cc}\p{Cf}]/u.test(block.replaceAll("\n", ""))
    )
  ) {
    throw new TypeError("masonry blocks must be control-free");
  }
  const blocks = props.blocks.filter((block) => block !== "");
  if (blocks.length === 0) return "";

  const requestedWidth = props.width ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 1) {
    throw new TypeError(
      `masonry width must be a positive safe integer; received ${requestedWidth}`,
    );
  }
  const width = Math.min(requestedWidth, capabilities.columns);
  const minimum = props.minimum ?? 14;
  if (!Number.isSafeInteger(minimum) || minimum < 1) {
    throw new TypeError(
      `masonry minimum must be a positive safe integer; received ${minimum}`,
    );
  }
  const step = props.gap ?? 5;
  const gap = step === 0 ? 0 : terminalThemes[props.theme ?? "dark"].spacing[
    `--discern-space-${step}` as TerminalSpacingTokenName
  ] ?? 1;
  const columnCount = responsiveColumnCount(
    blocks.length,
    width,
    minimum,
    gap,
  );
  const columnWidth = Math.floor(
    (width - gap * (columnCount - 1)) / columnCount,
  );
  const verticalSpacing = Math.max(0, gap - 1);
  const columns = Array.from({ length: columnCount }, () => [] as string[]);
  const heights = Array.from({ length: columnCount }, () => 0);

  for (const block of blocks) {
    const wrapped = wrapText(block, columnWidth).join("\n");
    const targetHeight = Math.min(...heights);
    const target = heights.indexOf(targetHeight);
    const column = columns[target];
    if (column === undefined) {
      throw new TypeError("masonry column selection drifted");
    }
    const hasEarlierBlock = column.length > 0;
    column.push(wrapped);
    heights[target] = targetHeight + wrapped.split("\n").length +
      (hasEarlierBlock ? verticalSpacing : 0);
  }

  return layoutColumns(
    columns.map((column) => joinVertical(column, { spacing: verticalSpacing })),
    { columns: width, gap },
  );
};

export default renderMasonryCli;
