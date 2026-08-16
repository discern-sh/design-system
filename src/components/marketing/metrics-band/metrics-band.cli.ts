/**
 * Pure terminal renderer and deterministic example states for Metrics band.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical, layoutColumns } from "../../../cli/layout.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import type { MetricsBandTone } from "./metrics-band.types.ts";
import {
  marketingCliWidth,
  renderMarketingCliHeader,
} from "../marketing-frame.ts";

/** One value-and-label entry in a terminal Metrics band. */
export interface MetricsBandCliItem {
  readonly value: string;
  readonly label: string;
  readonly detail?: string;
}

/** Inputs accepted by the terminal Metrics band renderer. */
export interface MetricsBandCliProps {
  readonly title?: string;
  readonly eyebrow?: string;
  readonly items: readonly MetricsBandCliItem[];
  readonly tone?: MetricsBandTone;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** Deterministic Metrics band states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<MetricsBandCliProps>[] = [
  {
    name: "outcomes",
    props: {
      eyebrow: "Measured outcomes",
      title: "Proof at a glance",
      tone: "accent",
      items: [
        { value: "42%", label: "less rework" },
        { value: "3.4×", label: "faster review" },
        { value: "99.9%", label: "successful runs" },
      ],
    },
  },
] as const;

/** Render a compact adaptive terminal stat row. */
const renderMetricsBandCli: CliRenderer<MetricsBandCliProps> = (
  props,
  capabilities,
) => {
  if (props.items.length === 0) {
    throw new TypeError("metrics band requires at least one item");
  }
  const width = marketingCliWidth(props.width, capabilities);
  const tone = props.tone ?? "surface";
  const semanticTone = tone === "surface" ? "neutral" : "accent";
  const blocks = props.items.map((item) =>
    joinVertical([
      item.value,
      item.label,
      item.detail ?? "",
    ])
  );
  const metrics = width >= 48
    ? layoutColumns(blocks, { columns: width, gap: 2 })
    : joinVertical(blocks, { spacing: 1 });
  const theme = terminalThemes[props.theme ?? "dark"];
  const heading = props.title === undefined
    ? props.eyebrow ?? "Metrics"
    : renderMarketingCliHeader({
      title: props.title,
      ...(props.eyebrow === undefined ? {} : { eyebrow: props.eyebrow }),
      tone: semanticTone,
      ...(props.theme === undefined ? {} : { theme: props.theme }),
      width,
    }, capabilities);
  return joinVertical([
    heading,
    styleText(
      metrics,
      {
        ...theme.typography.strong,
        color: terminalToneColor(theme, semanticTone),
      },
      capabilities,
    ),
  ], { spacing: 1 });
};

export default renderMetricsBandCli;
