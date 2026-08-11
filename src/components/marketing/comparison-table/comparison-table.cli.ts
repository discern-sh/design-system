/**
 * Pure terminal renderer and deterministic example states for Comparison table.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import type { TerminalCapabilities } from "../../../cli/capabilities.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import { padText, truncateText } from "../../../cli/text.ts";
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

/** One terminal comparison row. */
export interface ComparisonTableCliRow {
  readonly feature: string;
  readonly first: string;
  readonly second: string;
}

/** Inputs accepted by the terminal Comparison table renderer. */
export interface ComparisonTableCliProps {
  readonly title: string;
  readonly description?: string;
  readonly featureLabel?: string;
  readonly firstLabel: string;
  readonly secondLabel: string;
  readonly rows: readonly ComparisonTableCliRow[];
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** Deterministic Comparison table states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<ComparisonTableCliProps>[] = [
  {
    name: "comparison",
    props: {
      title: "Make the trade-off visible",
      firstLabel: "Manual",
      secondLabel: "Discern",
      rows: [
        { feature: "Evidence", first: "Ad hoc", second: "Attached" },
        { feature: "Reruns", first: "Risky", second: "Safe" },
      ],
    },
  },
] as const;

function wideTable(
  props: ComparisonTableCliProps,
  width: number,
  capabilities: TerminalCapabilities,
): string {
  const gap = "  ";
  const columnWidth = Math.floor((width - 4) / 3);
  const row = (cells: readonly string[]): string =>
    cells.map((cell, index) => {
      const value = truncateText(
        cell,
        columnWidth,
        capabilities.unicode ? "…" : ".",
      );
      return index === cells.length - 1 ? value : padText(value, columnWidth);
    }).join(gap);
  const header = row([
    props.featureLabel ?? "Capability",
    props.firstLabel,
    `${props.secondLabel} *`,
  ]);
  return [
    header,
    (capabilities.unicode ? "─" : "-").repeat(
      Math.min(width, header.length),
    ),
    ...props.rows.map((item) => row([item.feature, item.first, item.second])),
  ].join("\n");
}

function narrowTable(props: ComparisonTableCliProps, width: number): string {
  return props.rows.map((row) =>
    joinVertical([
      wrapMarketingCliText(row.feature, width),
      wrapMarketingCliText(`${props.firstLabel}: ${row.first}`, width),
      wrapMarketingCliText(`${props.secondLabel}*: ${row.second}`, width),
    ])
  ).join("\n\n");
}

/** Render a real three-column table or labeled narrow row cards. */
const renderComparisonTableCli: CliRenderer<ComparisonTableCliProps> = (
  props,
  capabilities,
) => {
  if (props.rows.length === 0) {
    throw new TypeError("comparison table requires at least one row");
  }
  const width = marketingCliWidth(props.width, capabilities);
  const table = width >= 42
    ? wideTable(props, width, capabilities)
    : narrowTable(props, width);
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
    styleText(table, {
      color: terminalToneColor(theme, "neutral"),
    }, capabilities),
  ], { spacing: 1 });
};

export default renderComparisonTableCli;
