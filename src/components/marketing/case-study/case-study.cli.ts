/**
 * Pure terminal renderer and deterministic example states for Case study.
 *
 * @module
 */

import { renderBox } from "../../../cli/box.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical, layoutColumns } from "../../../cli/layout.ts";
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

/** One outcome metric in a terminal Case study. */
export interface CaseStudyCliStat {
  readonly value: string;
  readonly label: string;
}

/** Inputs accepted by the terminal Case study renderer. */
export interface CaseStudyCliProps {
  readonly title: string;
  readonly summary: string;
  readonly eyebrow?: string;
  readonly body?: string;
  readonly stats?: readonly CaseStudyCliStat[];
  readonly action?: string;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** Deterministic Case study states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<CaseStudyCliProps>[] = [
  {
    name: "proof",
    props: {
      eyebrow: "Case study",
      title: "From surprises to a reviewable release habit",
      summary: "A small team made each release repeatable.",
      body: "Shared evidence replaced private checklists.",
      stats: [
        { value: "42%", label: "less rework" },
        { value: "11", label: "teams enrolled" },
        { value: "2 wk", label: "to adoption" },
      ],
      action: "Read the full story",
    },
  },
] as const;

/** Render a framed terminal proof story with compact outcome metrics. */
const renderCaseStudyCli: CliRenderer<CaseStudyCliProps> = (
  props,
  capabilities,
) => {
  const width = marketingCliWidth(props.width, capabilities);
  const stats = props.stats ?? [];
  const statBlocks = stats.map((stat) => `${stat.value}\n${stat.label}`);
  const statRows = statBlocks.length === 0
    ? ""
    : width >= 48
    ? layoutColumns(statBlocks, { columns: width - 2, gap: 2 })
    : joinVertical(statBlocks);
  const body = joinVertical([
    wrapMarketingCliText(props.summary, width - 4),
    props.body === undefined ? "" : wrapMarketingCliText(props.body, width - 4),
    statRows,
    props.action === undefined ? "" : `[${props.action}]`,
  ], { spacing: 1 });
  const theme = terminalThemes[props.theme ?? "dark"];
  return joinVertical([
    renderMarketingCliHeader({
      title: props.title,
      ...(props.eyebrow === undefined ? {} : { eyebrow: props.eyebrow }),
      ...(props.theme === undefined ? {} : { theme: props.theme }),
      width,
    }, capabilities),
    renderBox({
      body,
      title: "Evidence",
      width,
      borderStyle: { color: terminalToneColor(theme, "accent") },
    }, capabilities),
  ]);
};

export default renderCaseStudyCli;
