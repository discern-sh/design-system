/**
 * Pure terminal renderer and deterministic example states for Pull quote.
 *
 * @module
 */

import { renderStyledSpans, styleText } from "../../../cli/ansi.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type {
  CliExample,
  CliPresentationOptions,
  CliRenderer,
} from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import { wrapText } from "../../../cli/text.ts";
import {
  resolveTerminalTheme,
  terminalThemeColor,
  terminalToneColor,
} from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./pull-quote.meta.ts";
import type { PullQuoteAlign } from "./pull-quote.types.ts";

/** Inputs accepted by the terminal Pull quote renderer. */
export interface PullQuoteCliProps extends CliPresentationOptions {
  readonly quote: string;
  readonly attribution?: string;
  readonly citation?: string;
  readonly citeUrl?: string;
  readonly align?: PullQuoteAlign;
  readonly maxWidth?: number;
}

const cliExampleImplementations = [{
  name: "default",
  props: {
    quote:
      "A good reading experience lets the ideas lead and the interface recede.",
    attribution: "Example contributor",
    citation: "Collected essays",
  },
}] as const satisfies readonly CliExample<PullQuoteCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Pull quote states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<PullQuoteCliProps>[] =
  cliExampleImplementations;

const ALIGN_COLUMNS: Readonly<Record<PullQuoteAlign, number>> = {
  inline: 64,
  wide: 88,
};

/** Render a set-off quotation with a capability-aware editorial rail. */
const renderPullQuoteCli: CliRenderer<PullQuoteCliProps> = (
  props,
  capabilities,
) => {
  if (props.quote.trim() === "") {
    throw new TypeError("pull quote must be non-empty");
  }
  const requested = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requested) || requested < 8) {
    throw new TypeError(
      `pull quote width must be a safe integer of at least 8; received ${requested}`,
    );
  }
  const align = props.align ?? "wide";
  const width = Math.min(requested, capabilities.columns, ALIGN_COLUMNS[align]);
  const theme = resolveTerminalTheme(props);
  const open = capabilities.unicode ? "“" : '"';
  const close = capabilities.unicode ? "”" : '"';
  const rail = capabilities.unicode ? "┃" : "|";
  const lines = wrapText(`${open}${props.quote}${close}`, width - 2);
  const quote = lines.map((line) =>
    renderStyledSpans([
      {
        text: `${rail} `,
        style: {
          ...theme.typography.strong,
          color: terminalToneColor(theme, "accent"),
        },
      },
      { text: line, style: theme.typography.emphasis },
    ], capabilities)
  ).join("\n");
  const blocks = [quote];
  if (props.attribution !== undefined || props.citation !== undefined) {
    const separator = capabilities.unicode ? " — " : " - ";
    const attribution = `${capabilities.unicode ? "—" : "-"} ${
      props.attribution ?? ""
    }${
      props.attribution !== undefined && props.citation !== undefined
        ? separator
        : ""
    }${props.citation ?? ""}`;
    blocks.push(styleText(
      wrapText(attribution, width - 2).map((line) => `  ${line}`).join("\n"),
      {
        ...theme.typography.annotation,
        color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      },
      capabilities,
    ));
  }
  if (props.citeUrl !== undefined) {
    blocks.push(styleText(
      wrapText(props.citeUrl, width - 2).map((line) => `  ${line}`).join("\n"),
      {
        ...theme.typography.annotation,
        color: terminalThemeColor(theme, "--discern-color-ink-faint"),
      },
      capabilities,
    ));
  }
  return joinVertical(blocks);
};

export default renderPullQuoteCli;
