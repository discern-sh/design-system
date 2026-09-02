/**
 * Pure terminal renderer and deterministic example states for Comparison table.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import type { TerminalCapabilities } from "../../../cli/capabilities.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import {
  type CliExample,
  type CliPresentationOptions,
  cliPresentationPassthrough,
  type CliRenderer,
} from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import { padText, truncateText } from "../../../cli/text.ts";
import { resolveTerminalTheme, terminalToneColor } from "../../../cli/theme.ts";
import {
  marketingCliWidth,
  renderMarketingCliHeader,
  wrapMarketingCliText,
} from "../marketing-frame.ts";
import meta, { componentExampleVocabulary } from "./comparison-table.meta.ts";

/** One terminal comparison row. */
export interface ComparisonTableCliRow {
  readonly feature: string;
  readonly first: string;
  readonly second: string;
}

/** Inputs accepted by the terminal Comparison table renderer. */
export interface ComparisonTableCliProps extends CliPresentationOptions {
  readonly title: string;
  readonly eyebrow?: string;
  readonly description?: string;
  readonly featureLabel?: string;
  readonly firstLabel: string;
  readonly secondLabel: string;
  readonly secondBadge?: string;
  readonly rows: readonly ComparisonTableCliRow[];
  readonly width?: number;
}

const cliExampleImplementations = [
  {
    name: "default",
    props: {
      eyebrow: "Compare approaches",
      title: "Make the trade-off visible.",
      description:
        "A good comparison clarifies the decision without turning every row into a sales claim.",
      firstLabel: "Approach A",
      secondLabel: "Approach B",
      secondBadge: "Example choice",
      rows: [
        {
          feature: "Setup",
          first: "Configured separately",
          second: "Uses a shared starting point",
        },
        {
          feature: "Review",
          first: "Context gathered later",
          second: "Context stays with the work",
        },
        {
          feature: "Quality",
          first: "Checked case by case",
          second: "Checked consistently",
        },
        {
          feature: "Portability",
          first: "Designed for one workflow",
          second: "Designed for several workflows",
        },
      ],
    },
  },
] as const satisfies readonly CliExample<ComparisonTableCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Comparison table states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<ComparisonTableCliProps>[] =
  cliExampleImplementations;

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
  const secondHeading = `${props.secondLabel}${
    props.secondBadge === undefined ? "" : ` · ${props.secondBadge}`
  } *`;
  const header = row([
    props.featureLabel ?? "Capability",
    props.firstLabel,
    secondHeading,
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
  const secondHeading = `${props.secondLabel}${
    props.secondBadge === undefined ? "" : ` · ${props.secondBadge}`
  }*`;
  return props.rows.map((row) =>
    joinVertical([
      wrapMarketingCliText(row.feature, width),
      wrapMarketingCliText(`${props.firstLabel}: ${row.first}`, width),
      wrapMarketingCliText(`${secondHeading}: ${row.second}`, width),
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
  const theme = resolveTerminalTheme(props);
  return joinVertical([
    renderMarketingCliHeader({
      title: props.title,
      ...(props.eyebrow === undefined ? {} : { eyebrow: props.eyebrow }),
      ...(props.description === undefined
        ? {}
        : { description: props.description }),
      ...cliPresentationPassthrough(props),
      width,
    }, capabilities),
    styleText(table, {
      color: terminalToneColor(theme, "neutral"),
    }, capabilities),
  ], { spacing: 1 });
};

export default renderComparisonTableCli;
