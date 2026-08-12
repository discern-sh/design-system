/**
 * Pure terminal renderer and deterministic example states for Stat.
 *
 * @module
 */

import { renderStyledSpans } from "../../../cli/ansi.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import { truncateText } from "../../../cli/text.ts";
import {
  type TerminalSemanticTone,
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import type { StatTrend } from "./stat.types.ts";

/** Inputs accepted by the terminal Stat renderer. */
export interface StatCliProps {
  readonly label: string;
  readonly value: string;
  readonly context?: string;
  readonly trend?: StatTrend;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Stat states rendered by `deno task catalogue:cli stat`. */
export const cliExamples: readonly CliExample<StatCliProps>[] = [
  {
    name: "neutral",
    props: {
      label: "Components",
      value: "111",
      context: "Across twelve groups",
    },
  },
  {
    name: "positive",
    props: {
      label: "Checks",
      value: "42",
      context: "+4 this week",
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
] as const;

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
  const theme = terminalThemes[props.theme ?? "dark"];
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
  return joinVertical(blocks);
};

export default renderStatCli;
