/**
 * Pure terminal renderer and deterministic example states for Grid.
 *
 * @module
 */

import { defineCliExamples } from "../../../cli/component-examples.ts";
import type {
  CliExample,
  CliPresentationOptions,
  CliRenderer,
} from "../../../cli/contracts.ts";
import { joinVertical, layoutColumns } from "../../../cli/layout.ts";
import {
  resolveTerminalTheme,
  type TerminalSpacingTokenName,
} from "../../../cli/theme.ts";
import type { SpaceStep } from "../space.ts";
import { responsiveColumnCount } from "../responsive-columns.ts";
import meta, { componentExampleVocabulary } from "./grid.meta.ts";

/** Inputs accepted by the terminal Grid renderer. */
export interface GridCliProps extends CliPresentationOptions {
  readonly blocks: readonly string[];
  readonly gap?: SpaceStep;
  readonly minimum?: number;
  readonly width?: number;
}

const cliExampleImplementations = [
  {
    name: "default",
    props: {
      blocks: ["Alpha", "Beta", "Gamma", "Delta"],
      minimum: 8,
      width: 32,
    },
  },
  {
    name: "single-column",
    props: { blocks: ["Alpha", "Beta", "Gamma"], minimum: 12, width: 12 },
  },
] as const satisfies readonly CliExample<GridCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Grid states rendered by `deno task catalogue:cli grid`. */
export const cliExamples: readonly CliExample<GridCliProps>[] =
  cliExampleImplementations;

/** Flow terminal blocks through responsive rows using the foundation column layout. */
const renderGridCli: CliRenderer<GridCliProps> = (props, capabilities) => {
  if (
    props.blocks.some((block) =>
      /[\p{Cc}\p{Cf}]/u.test(block.replaceAll("\n", ""))
    )
  ) {
    throw new TypeError("grid blocks must be control-free");
  }
  if (props.blocks.length === 0) return "";
  const requestedWidth = props.width ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 1) {
    throw new TypeError(
      `grid width must be a positive safe integer; received ${requestedWidth}`,
    );
  }
  const width = Math.min(requestedWidth, capabilities.columns);
  const minimum = props.minimum ?? 14;
  if (!Number.isSafeInteger(minimum) || minimum < 1) {
    throw new TypeError(
      `grid minimum must be a positive safe integer; received ${minimum}`,
    );
  }
  const step = props.gap ?? 5;
  const gap = step === 0 ? 0 : resolveTerminalTheme(props).spacing[
    `--discern-space-${step}` as TerminalSpacingTokenName
  ] ?? 1;
  const columnCount = responsiveColumnCount(
    props.blocks.length,
    width,
    minimum,
    gap,
  );
  const rows: string[] = [];
  for (let index = 0; index < props.blocks.length; index += columnCount) {
    const row = props.blocks.slice(index, index + columnCount);
    const padded = [
      ...row,
      ...Array.from({ length: columnCount - row.length }, () => ""),
    ];
    rows.push(layoutColumns(padded, { columns: width, gap }));
  }
  return joinVertical(rows, { spacing: Math.max(0, gap - 1) });
};

export default renderGridCli;
