/**
 * Pure terminal renderer and deterministic example states for FAQ block.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import { triangleGlyph, TRIANGLES } from "../../../cli/triangles.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import {
  marketingCliWidth,
  renderMarketingCliHeader,
  wrapMarketingCliText,
} from "../marketing-frame.ts";

/** One terminal FAQ disclosure. */
export interface FaqBlockCliItem {
  readonly question: string;
  readonly answer: string;
}

/** Inputs accepted by the terminal FAQ block renderer. */
export interface FaqBlockCliProps {
  readonly title: string;
  readonly description?: string;
  readonly items: readonly FaqBlockCliItem[];
  readonly openIndices?: readonly number[];
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** Deterministic FAQ block states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<FaqBlockCliProps>[] = [
  {
    name: "first-open",
    props: {
      title: "Questions before you begin",
      items: [
        {
          question: "Can I start small?",
          answer: "Yes. Begin with one workflow.",
        },
        {
          question: "Can I expand later?",
          answer: "Add more surfaces when the evidence is clear.",
        },
      ],
      openIndices: [0],
    },
  },
] as const;

/** Render static open and closed FAQ disclosure frames. */
const renderFaqBlockCli: CliRenderer<FaqBlockCliProps> = (
  props,
  capabilities,
) => {
  if (props.items.length === 0) {
    throw new TypeError("FAQ block requires at least one item");
  }
  const width = marketingCliWidth(props.width, capabilities);
  const open = new Set(props.openIndices ?? []);
  for (const index of open) {
    if (
      !Number.isSafeInteger(index) || index < 0 || index >= props.items.length
    ) {
      throw new TypeError(`FAQ open index is out of range: ${index}`);
    }
  }
  const body = props.items.map((item, index) => {
    const expanded = open.has(index);
    const marker = triangleGlyph(
      expanded ? TRIANGLES.filledSmall.down : TRIANGLES.filledSmall.right,
      capabilities.unicode,
    );
    return joinVertical([
      `${marker} ${wrapMarketingCliText(item.question, width - 2)}`,
      expanded ? wrapMarketingCliText(item.answer, width - 2) : "",
    ]);
  }).join("\n\n");
  const theme = terminalThemes[props.theme ?? "dark"];
  return joinVertical([
    renderMarketingCliHeader({
      title: props.title,
      ...(props.description === undefined
        ? {}
        : { description: props.description }),
      ...(props.theme === undefined ? {} : { theme: props.theme }),
      width,
    }, capabilities),
    styleText(
      body,
      { color: terminalToneColor(theme, "neutral") },
      capabilities,
    ),
  ], { spacing: 1 });
};

export default renderFaqBlockCli;
