/**
 * Pure terminal renderer and deterministic example states for Related content.
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
import { measureText, wrapText } from "../../../cli/text.ts";
import {
  resolveTerminalTheme,
  terminalThemeColor,
  terminalToneColor,
} from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./related-content.meta.ts";
import type { RelatedContentSurface } from "./related-content.types.ts";

/** One terminal Related content entry. */
export interface RelatedContentCliItem {
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: string;
  readonly href: string;
  readonly meta?: string;
}

/** Inputs accepted by the terminal Related content renderer. */
export interface RelatedContentCliProps extends CliPresentationOptions {
  readonly eyebrow?: string;
  readonly title: string;
  readonly items: readonly RelatedContentCliItem[];
  readonly surface?: RelatedContentSurface;
  readonly maxWidth?: number;
}

const cliExampleImplementations = [{
  name: "default",
  props: {
    eyebrow: "Continue reading",
    title: "The next useful question.",
    items: [
      {
        eyebrow: "Essay",
        title: "Designing for legibility",
        description:
          "How structure turns complexity into something a reader can challenge.",
        href: "#legibility",
        meta: "9 min",
      },
      {
        eyebrow: "Guide",
        title: "Choosing a reading measure",
        description: "How line length and spacing support sustained reading.",
        href: "#reading-measure",
        meta: "14 min",
      },
      {
        eyebrow: "Field note",
        title: "Editing a complex introduction",
        description:
          "A practical account of simplifying the opening without losing context.",
        href: "#introduction",
        meta: "6 min",
      },
    ],
  },
}] as const satisfies readonly CliExample<RelatedContentCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Related content states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<RelatedContentCliProps>[] =
  cliExampleImplementations;

function hanging(prefix: string, value: string, width: number): string {
  const lines = wrapText(value, Math.max(1, width - measureText(prefix)));
  return lines.map((line, index) =>
    `${index === 0 ? prefix : " ".repeat(measureText(prefix))}${line}`
  ).join("\n");
}

/** Render a continuation list with descriptions and visible destinations. */
const renderRelatedContentCli: CliRenderer<RelatedContentCliProps> = (
  props,
  capabilities,
) => {
  if (props.title.trim() === "" || props.items.length === 0) {
    throw new TypeError("related content title and items must be non-empty");
  }
  const requested = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requested) || requested < 10) {
    throw new TypeError(
      `related content width must be a safe integer of at least 10; received ${requested}`,
    );
  }
  const width = Math.min(requested, capabilities.columns);
  const theme = resolveTerminalTheme(props);
  const headingTone = props.surface === "canvas" ? "neutral" : "accent";
  const blocks: string[] = [];
  if (props.eyebrow !== undefined) {
    blocks.push(styleText(props.eyebrow.toLocaleUpperCase(), {
      ...theme.typography.annotation,
      color: terminalToneColor(theme, headingTone),
    }, capabilities));
  }
  blocks.push(styleText(wrapText(props.title, width).join("\n"), {
    ...theme.typography.display,
    color: terminalThemeColor(theme, "--discern-color-ink"),
  }, capabilities));
  for (const [index, item] of props.items.entries()) {
    const prefix = `${String(index + 1).padStart(2, "0")}  `;
    const label = item.eyebrow === undefined
      ? item.title
      : `[${item.eyebrow.toLocaleUpperCase()}] ${item.title}`;
    const itemBlocks = [styleText(hanging(prefix, label, width), {
      ...theme.typography.strong,
      color: terminalToneColor(theme, "accent"),
    }, capabilities)];
    if (item.description !== undefined) {
      itemBlocks.push(hanging("    ", item.description, width));
    }
    const separator = capabilities.unicode ? " · " : " | ";
    itemBlocks.push(styleText(
      hanging(
        "    ",
        `${item.href}${
          item.meta === undefined ? "" : `${separator}${item.meta}`
        }`,
        width,
      ),
      {
        ...theme.typography.annotation,
        color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      },
      capabilities,
    ));
    blocks.push(joinVertical(itemBlocks));
  }
  return joinVertical(blocks, { spacing: 1 });
};

export default renderRelatedContentCli;
