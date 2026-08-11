/**
 * Pure terminal renderer and deterministic example states for Footnotes.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import { measureText, wrapText } from "../../../cli/text.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";

/** One terminal Footnotes entry. */
export interface FootnoteCliItem {
  readonly id?: string;
  readonly content: string;
  readonly returnLabel?: string;
}

/** Inputs accepted by the terminal Footnotes renderer. */
export interface FootnotesCliProps {
  readonly title?: string;
  readonly items: readonly FootnoteCliItem[];
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Footnotes states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<FootnotesCliProps>[] = [
  {
    name: "sources",
    props: {
      items: [
        { content: "Terminal widths were measured in character cells." },
        {
          content:
            "Source labels remain plain text when links are unavailable.",
          returnLabel: "return",
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

/** Render a numbered end-note section with stable hanging indentation. */
const renderFootnotesCli: CliRenderer<FootnotesCliProps> = (
  props,
  capabilities,
) => {
  if (props.items.length === 0) {
    throw new TypeError("footnotes items must be non-empty");
  }
  const requested = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requested) || requested < 8) {
    throw new TypeError(
      `footnotes width must be a safe integer of at least 8; received ${requested}`,
    );
  }
  const width = Math.min(requested, capabilities.columns);
  const theme = terminalThemes[props.theme ?? "dark"];
  const mark = capabilities.unicode ? "†" : "+";
  const heading = styleText(`${mark} ${props.title ?? "Notes & sources"}`, {
    ...theme.typography.strong,
    color: terminalToneColor(theme, "accent"),
  }, capabilities);
  const digits = Math.max(2, String(props.items.length).length);
  const notes = props.items.map((item, index) => {
    const prefix = `[${String(index + 1).padStart(digits, "0")}] `;
    const suffix = item.returnLabel === undefined
      ? ""
      : ` ${capabilities.unicode ? "↩" : "<-"} ${item.returnLabel}`;
    return hanging(prefix, `${item.content}${suffix}`, width);
  });
  return joinVertical([heading, ...notes], { spacing: 1 });
};

export default renderFootnotesCli;
