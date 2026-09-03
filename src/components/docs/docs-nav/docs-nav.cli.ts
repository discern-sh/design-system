/**
 * Pure terminal renderer and deterministic example states for Docs nav.
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
import meta, { componentExampleVocabulary } from "./docs-nav.meta.ts";

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
export interface DocsNavCliProps extends CliPresentationOptions {
  readonly sections: readonly DocsNavCliSection[];
  readonly label?: string;
  readonly showTargets?: boolean;
  readonly maxWidth?: number;
}

const cliExampleImplementations = [{
  name: "default",
  props: {
    sections: [
      {
        title: "Orientation",
        items: [
          { label: "Overview", href: "#top", current: true },
          { label: "Getting started", href: "#components" },
          { label: "Concepts", href: "#group-docs" },
        ],
      },
      {
        title: "Reference",
        items: [
          { label: "Configuration", href: "#component-docs-nav" },
          { label: "Glossary", href: "#component-pager" },
        ],
      },
    ],
  },
}] as const satisfies readonly CliExample<DocsNavCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Docs nav states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<DocsNavCliProps>[] =
  cliExampleImplementations;

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
  const theme = resolveTerminalTheme(props);
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
        ? triangleGlyph(TRIANGLES.filled.right, capabilities.unicode)
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
