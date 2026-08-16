/**
 * Pure terminal renderer and deterministic example states for Docs nav.
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

/** One terminal Docs nav destination. */
export interface DocsNavCliItem {
  readonly label: string;
  readonly href: string;
  readonly current?: boolean;
}

/** One terminal Docs nav section. */
export interface DocsNavCliSection {
  readonly title?: string;
  readonly items: readonly DocsNavCliItem[];
}

/** Inputs accepted by the terminal Docs nav renderer. */
export interface DocsNavCliProps {
  readonly sections: readonly DocsNavCliSection[];
  readonly label?: string;
  readonly showTargets?: boolean;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Docs nav states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<DocsNavCliProps>[] = [
  {
    name: "sections",
    props: {
      sections: [
        {
          title: "Foundations",
          items: [
            { label: "Capabilities", href: "/cli/capabilities" },
            { label: "Text layout", href: "/cli/text", current: true },
          ],
        },
        {
          title: "Components",
          items: [{ label: "Editorial", href: "/cli/editorial" }],
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

/** Render sectioned documentation navigation as a terminal tree. */
const renderDocsNavCli: CliRenderer<DocsNavCliProps> = (
  props,
  capabilities,
) => {
  if (
    props.sections.length === 0 ||
    props.sections.some((section) => section.items.length === 0)
  ) {
    throw new TypeError(
      "docs nav sections and section items must be non-empty",
    );
  }
  const requested = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requested) || requested < 8) {
    throw new TypeError(
      `docs nav width must be a safe integer of at least 8; received ${requested}`,
    );
  }
  const width = Math.min(requested, capabilities.columns);
  const theme = terminalThemes[props.theme ?? "dark"];
  const blocks = [styleText(props.label ?? "Section navigation", {
    ...theme.typography.strong,
    color: terminalToneColor(theme, "accent"),
  }, capabilities)];
  for (const section of props.sections) {
    const lines: string[] = [];
    if (section.title !== undefined) {
      lines.push(styleText(section.title.toLocaleUpperCase(), {
        ...theme.typography.annotation,
        color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      }, capabilities));
    }
    for (const [index, item] of section.items.entries()) {
      const last = index === section.items.length - 1;
      const connector = capabilities.unicode
        ? (last ? "└─" : "├─")
        : (last ? "\\-" : "+-");
      const marker = item.current === true
        ? (capabilities.unicode ? "▶" : ">")
        : " ";
      const target = props.showTargets === true ? ` (${item.href})` : "";
      const line = hanging(
        `${marker} ${connector} `,
        `${item.label}${target}`,
        width,
      );
      lines.push(
        item.current === true
          ? styleText(line, {
            ...theme.typography.strong,
            color: terminalToneColor(theme, "accent"),
          }, capabilities)
          : line,
      );
    }
    blocks.push(lines.join("\n"));
  }
  return joinVertical(blocks, { spacing: 1 });
};

export default renderDocsNavCli;
