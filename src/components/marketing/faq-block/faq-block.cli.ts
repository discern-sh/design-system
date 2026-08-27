/**
 * Pure terminal renderer and deterministic example states for FAQ block.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
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
import meta, { componentExampleVocabulary } from "./faq-block.meta.ts";

/** One terminal FAQ disclosure. */
export interface FaqBlockCliItem {
  readonly question: string;
  readonly answer: string;
}

/** Inputs accepted by the terminal FAQ block renderer. */
export interface FaqBlockCliProps {
  readonly title: string;
  readonly eyebrow?: string;
  readonly description?: string;
  readonly aside?: string;
  readonly items: readonly FaqBlockCliItem[];
  readonly openIndices?: readonly number[];
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** Deterministic FAQ block states rendered by the CLI catalogue. */
export const cliExamples = defineCliExamples(
  meta,
  componentExampleVocabulary,
  [
    {
      name: "default",
      props: {
        eyebrow: "Questions, answered",
        title: "The details readers need before they continue.",
        description:
          "Use plain answers to remove uncertainty without interrupting the main story.",
        aside: "Ask another question",
        items: [
          {
            question: "What belongs in this section?",
            answer:
              "Include questions that remove a concrete uncertainty from the surrounding story.",
          },
          {
            question: "How long should an answer be?",
            answer:
              "Use the shortest explanation that answers the question without creating another one.",
          },
          {
            question: "When should an answer stay closed?",
            answer:
              "Keep supporting details collapsed until a reader chooses to inspect them.",
          },
          {
            question: "What should the final answer include?",
            answer:
              "State the useful conclusion directly, then add only the context needed to act on it.",
          },
        ],
        openIndices: [0],
      },
    },
  ] as const satisfies readonly CliExample<FaqBlockCliProps>[],
);

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
      ...(props.eyebrow === undefined ? {} : { eyebrow: props.eyebrow }),
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
    props.aside === undefined ? "" : `[${props.aside}]`,
  ], { spacing: 1 });
};

export default renderFaqBlockCli;
