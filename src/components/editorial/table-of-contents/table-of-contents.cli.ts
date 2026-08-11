/**
 * Pure terminal renderer and deterministic example states for Table of contents.
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

/** One terminal Table of contents destination. */
export interface TableOfContentsCliItem {
  readonly label: string;
  readonly href: string;
  readonly current?: boolean;
  readonly nested?: boolean;
}

/** Inputs accepted by the terminal Table of contents renderer. */
export interface TableOfContentsCliProps {
  readonly title?: string;
  readonly items: readonly TableOfContentsCliItem[];
  readonly progress?: string;
  readonly showTargets?: boolean;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Table of contents states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<TableOfContentsCliProps>[] = [
  {
    name: "article",
    props: {
      items: [
        { label: "Context", href: "#context" },
        { label: "Evidence", href: "#evidence", current: true },
        { label: "Methods", href: "#methods", nested: true },
        { label: "Decision", href: "#decision" },
      ],
      progress: "2 of 3 sections",
    },
  },
] as const;

function hanging(prefix: string, value: string, width: number): string {
  const lines = wrapText(value, Math.max(1, width - measureText(prefix)));
  return lines.map((line, index) =>
    `${index === 0 ? prefix : " ".repeat(measureText(prefix))}${line}`
  ).join("\n");
}

/** Render a numbered, indented terminal navigation tree. */
const renderTableOfContentsCli: CliRenderer<TableOfContentsCliProps> = (
  props,
  capabilities,
) => {
  if (props.items.length === 0) {
    throw new TypeError("table of contents items must be non-empty");
  }
  const requested = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requested) || requested < 8) {
    throw new TypeError(
      `table of contents width must be a safe integer of at least 8; received ${requested}`,
    );
  }
  const width = Math.min(requested, capabilities.columns);
  const theme = terminalThemes[props.theme ?? "dark"];
  const blocks = [styleText(props.title ?? "On this page", {
    ...theme.typography.strong,
    color: terminalToneColor(theme, "accent"),
  }, capabilities)];
  let section = 0;
  for (const [index, item] of props.items.entries()) {
    if (item.nested !== true) section += 1;
    const marker = item.current === true
      ? (capabilities.unicode ? "▶" : ">")
      : " ";
    const hasFollowingNestedItem = props.items[index + 1]?.nested === true;
    const branch = capabilities.unicode
      ? (hasFollowingNestedItem ? "├─" : "└─")
      : (hasFollowingNestedItem ? "+-" : "\\-");
    const prefix = item.nested === true
      ? `${marker} ${branch} `
      : `${marker} ${String(section).padStart(2, "0")} `;
    const target = props.showTargets === true ? ` (${item.href})` : "";
    const line = hanging(prefix, `${item.label}${target}`, width);
    blocks.push(
      item.current === true
        ? styleText(line, {
          ...theme.typography.strong,
          color: terminalToneColor(theme, "accent"),
        }, capabilities)
        : line,
    );
  }
  if (props.progress !== undefined) {
    blocks.push(styleText(wrapText(props.progress, width).join("\n"), {
      ...theme.typography.annotation,
      color: terminalThemeColor(theme, "--discern-color-ink-muted"),
    }, capabilities));
  }
  return joinVertical(blocks);
};

export default renderTableOfContentsCli;
