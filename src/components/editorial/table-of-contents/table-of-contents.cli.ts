/**
 * Pure terminal renderer and deterministic example states for Table of contents.
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
import { triangleGlyph, TRIANGLES } from "../../../cli/triangles.ts";
import {
  resolveTerminalTheme,
  terminalThemeColor,
  terminalToneColor,
} from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./table-of-contents.meta.ts";
import {
  type TableOfContentsNumbering,
  tableOfContentsNumbers,
} from "./table-of-contents.numbers.ts";

/** One terminal Table of contents destination. */
export interface TableOfContentsCliItem extends TableOfContentsNumbering {
  readonly label: string;
  readonly href: string;
  readonly current?: boolean;
}

/** Inputs accepted by the terminal Table of contents renderer. */
export interface TableOfContentsCliProps extends CliPresentationOptions {
  readonly title?: string;
  readonly items: readonly TableOfContentsCliItem[];
  readonly progress?: string;
  readonly showTargets?: boolean;
  readonly maxWidth?: number;
}

const cliExampleImplementations = [{
  name: "default",
  props: {
    items: [
      { label: "The opening scene", href: "#opening", current: true },
      { label: "A closer look", href: "#closer-look", nested: true },
      { label: "What changed", href: "#changed" },
      { label: "Notes and sources", href: "#notes" },
    ],
    progress: "12 minute read · 1 of 4",
  },
}, {
  name: "authored-numbers",
  props: {
    items: [
      { label: "Starting state", href: "#starting-state", number: false },
      { label: "Find the source", href: "#find-the-source", number: "1" },
      { label: "Write the rule", href: "#write-the-rule", number: "2" },
      { label: "Check the result", href: "#check-the-result", nested: true },
      { label: "Completion", href: "#completion", number: false },
    ],
  },
}, {
  name: "mixed-numbers",
  props: {
    items: [
      { label: "Overview", href: "#overview", number: false },
      { label: "Prepare", href: "#prepare" },
      { label: "Appendix", href: "#appendix", number: "A" },
      { label: "Apply", href: "#apply", current: true },
    ],
  },
}] as const satisfies readonly CliExample<TableOfContentsCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Table of contents states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<TableOfContentsCliProps>[] =
  cliExampleImplementations;

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
  const theme = resolveTerminalTheme(props);
  const blocks = [styleText(props.title ?? "On this page", {
    ...theme.typography.strong,
    color: terminalToneColor(theme, "accent"),
  }, capabilities)];
  const numbers = tableOfContentsNumbers(props.items);
  for (const [index, item] of props.items.entries()) {
    const number = numbers[index];
    const marker = item.current === true
      ? triangleGlyph(TRIANGLES.filled.right, capabilities.unicode)
      : " ";
    const hasFollowingNestedItem = props.items[index + 1]?.nested === true;
    const branch = capabilities.unicode
      ? (hasFollowingNestedItem ? "├─" : "└─")
      : (hasFollowingNestedItem ? "+-" : "\\-");
    const prefix = number === undefined
      ? `${marker} ${branch} `
      : `${marker} ${number.padEnd(2)} `;
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
