/**
 * Pure terminal renderer and deterministic example states for Related content.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import { measureText, wrapText } from "../../../cli/text.ts";
import {
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
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
export interface RelatedContentCliProps {
  readonly eyebrow?: string;
  readonly title: string;
  readonly items: readonly RelatedContentCliItem[];
  readonly surface?: RelatedContentSurface;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Related content states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<RelatedContentCliProps>[] = [
  {
    name: "next-reading",
    props: {
      eyebrow: "Continue",
      title: "Related reading",
      items: [
        {
          eyebrow: "Guide",
          title: "Terminal reading patterns",
          description: "How hierarchy survives capability changes.",
          href: "/guides/terminal-reading",
          meta: "6 min",
        },
      ],
    },
  },
] as const;

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
  const theme = terminalThemes[props.theme ?? "dark"];
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
