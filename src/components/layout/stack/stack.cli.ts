/**
 * Pure terminal renderer and deterministic example states for Stack.
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
import { padText } from "../../../cli/text.ts";
import {
  resolveTerminalTheme,
  type TerminalSpacingTokenName,
} from "../../../cli/theme.ts";
import type { SpaceStep } from "../space.ts";
import type { StackAlign } from "./stack.types.ts";
import meta, { componentExampleVocabulary } from "./stack.meta.ts";

/** Inputs accepted by the terminal Stack renderer. */
export interface StackCliProps extends CliPresentationOptions {
  readonly blocks: readonly string[];
  readonly gap?: SpaceStep;
  readonly align?: StackAlign;
  readonly width?: number;
}

const cliExampleImplementations = [
  {
    name: "default",
    props: {
      blocks: ["First block", "Second block", "Third block"],
      width: 24,
    },
  },
  {
    name: "centred",
    props: { blocks: ["One", "Two"], align: "center", gap: 2, width: 20 },
  },
] as const satisfies readonly CliExample<StackCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Stack states rendered by `deno task catalogue:cli stack`. */
export const cliExamples: readonly CliExample<StackCliProps>[] =
  cliExampleImplementations;

/** Join terminal blocks vertically using Token-constrained gaps and alignment. */
const renderStackCli: CliRenderer<StackCliProps> = (props, capabilities) => {
  if (
    props.blocks.some((block) =>
      /[\p{Cc}\p{Cf}]/u.test(block.replaceAll("\n", ""))
    )
  ) {
    throw new TypeError("stack blocks must be control-free");
  }
  const requestedWidth = props.width ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 1) {
    throw new TypeError(
      `stack width must be a positive safe integer; received ${requestedWidth}`,
    );
  }
  const width = Math.min(requestedWidth, capabilities.columns);
  const align = props.align ?? "stretch";
  const blocks = props.blocks.map((block) =>
    layoutColumns([block], { columns: width, gap: 0 }).split("\n").map((line) =>
      align === "center" || align === "end"
        ? padText(line, width, align).trimEnd()
        : line
    ).join("\n")
  );
  const step = props.gap ?? 4;
  const cells = step === 0 ? 0 : resolveTerminalTheme(props).spacing[
    `--discern-space-${step}` as TerminalSpacingTokenName
  ] ?? 1;
  return joinVertical(blocks, { spacing: Math.max(0, cells - 1) });
};

export default renderStackCli;
