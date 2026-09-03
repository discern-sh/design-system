/**
 * Pure terminal renderer and deterministic example states for Stat.
 *
 * @module
 */

import { renderStyledSpans } from "../../../cli/ansi.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import {
  type CliExample,
  type CliPresentationOptions,
  cliPresentationPassthrough,
  type CliRenderer,
} from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import { truncateText } from "../../../cli/text.ts";
import {
  resolveTerminalTheme,
  type TerminalSemanticTone,
  terminalThemeColor,
  terminalToneColor,
} from "../../../cli/theme.ts";
import renderSparklineCli from "../sparkline/sparkline.cli.ts";
import type { SparklineValue } from "../sparkline/sparkline.shared.ts";
import meta, { componentExampleVocabulary } from "./stat.meta.ts";
import type { StatTrend } from "./stat.types.ts";

/** Inputs accepted by the terminal Stat renderer. */
export interface StatCliProps extends CliPresentationOptions {
  readonly label: string;
  readonly value: string;
  readonly context?: string;
  readonly trend?: StatTrend;
  /** Recent movement rendered as an annotated Sparkline beneath the trend. */
  readonly sparkline?: readonly SparklineValue[];
  readonly maxWidth?: number;
}

const cliExampleImplementations = [
  {
    name: "default",
    props: {
      label: "Entries",
      value: "128",
      context: "Across four collections",
    },
  },
  {
    name: "positive",
    props: {
      label: "Checks",
      value: "42",
      context: "Up 4 this week",
      trend: "positive",
    },
  },
  {
    name: "negative",
    props: {
      label: "Failures",
      value: "2",
      context: "Needs attention",
      trend: "negative",
    },
  },
  {
    name: "with-sparkline",
    props: {
      label: "Throughput",
      value: "9.1",
      context: "Up 5.9 from last period",
      trend: "positive",
      sparkline: [3.2, 4.1, 3.8, 5.5, 7.4, 9.1],
    },
  },
] as const satisfies readonly CliExample<StatCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Stat states rendered by `deno task catalogue:cli stat`. */
export const cliExamples: readonly CliExample<StatCliProps>[] =
  cliExampleImplementations;

/** Render one labelled terminal figure and semantic context line. */
const renderStatCli: CliRenderer<StatCliProps> = (props, capabilities) => {
  for (const value of [props.label, props.value, props.context]) {
    if (value !== undefined && /[\p{Cc}\p{Cf}]/u.test(value)) {
      throw new TypeError("stat content must be control-free");
    }
  }
  if (props.label === "" || props.value === "") {
    throw new TypeError("stat label and value must be non-empty");
  }
  const requestedWidth = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 1) {
    throw new TypeError(
      `stat width must be a positive safe integer; received ${requestedWidth}`,
    );
  }
  const width = Math.min(requestedWidth, capabilities.columns);
  const theme = resolveTerminalTheme(props);
  const contextTone: TerminalSemanticTone | undefined =
    props.trend === "positive"
      ? "success"
      : props.trend === "negative"
      ? "danger"
      : undefined;
  const blocks = [
    renderStyledSpans([{
      text: truncateText(
        props.label.toUpperCase(),
        width,
        capabilities.unicode ? "…" : ".",
      ),
      style: {
        ...theme.typography.muted,
        color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      },
    }], capabilities),
    renderStyledSpans([{
      text: truncateText(props.value, width, capabilities.unicode ? "…" : "."),
      style: theme.typography.display,
    }], capabilities),
  ];
  if (props.context !== undefined && props.context !== "") {
    blocks.push(renderStyledSpans([{
      text: truncateText(
        props.context,
        width,
        capabilities.unicode ? "…" : ".",
      ),
      style: {
        ...theme.typography.muted,
        color: contextTone === undefined
          ? terminalThemeColor(theme, "--discern-color-ink-muted")
          : terminalToneColor(theme, contextTone),
      },
    }], capabilities));
  }
  if (props.sparkline !== undefined) {
    blocks.push(renderSparklineCli(
      {
        ...cliPresentationPassthrough(props),
        values: props.sparkline,
        maxWidth: width,
      },
      capabilities,
    ));
  }
  return joinVertical(blocks);
};

export default renderStatCli;
