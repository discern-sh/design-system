/**
 * Pure terminal renderer and deterministic example states for Data figure.
 *
 * The frame is lossless: no authored character of the visual, the title, or
 * a legend label is silently dropped at any width, colour depth, or charset.
 * Each surface has its own width-aware mechanism, chosen so the mechanisms
 * agree in meaning under Unicode and ASCII alike:
 *
 * - Visual lines render through the shared box authority: a line that fits
 *   the inner measure passes byte-intact, and an over-wide line reflows at
 *   word boundaries through the styled wrapping authority, so every token
 *   reaches the reader. Reflow collapses a line's interior alignment
 *   spacing; the facts survive.
 * - The title embeds in the top border when it fits the border's title
 *   slot. A border row cannot wrap, so an over-wide title moves inside the
 *   frame as border-styled wrapped rows above the visual, separated from it
 *   by one blank row — the complete title is always printed.
 * - Legend labels keep their tone marker and hang wrapped continuations
 *   under the label column, mirroring the package's narration and list
 *   hanging pattern.
 * - A single grapheme wider than the inner measure (a two-cell grapheme at
 *   inner width one) cannot render truthfully, so the renderer throws a
 *   `TypeError` instead of eliding it or overflowing the frame.
 *
 * @module
 */

import { renderStyledSpans, styleText } from "../../../cli/ansi.ts";
import { renderBox } from "../../../cli/box.ts";
import type { TerminalCapabilities } from "../../../cli/capabilities.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import { measureText, wrapText } from "../../../cli/text.ts";
import {
  type TerminalColor,
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import type {
  DataFigureLegendTone,
  DataFigureSurface,
} from "./data-figure.types.ts";

/** One terminal Data figure legend entry. */
export interface DataFigureCliLegendItem {
  readonly label: string;
  readonly tone?: DataFigureLegendTone;
}

/** Inputs accepted by the terminal Data figure renderer. */
export interface DataFigureCliProps {
  readonly eyebrow?: string;
  readonly title: string;
  readonly visual: string;
  readonly legend?: readonly DataFigureCliLegendItem[];
  readonly caption: string;
  readonly source?: string;
  readonly surface?: DataFigureSurface;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Data figure states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<DataFigureCliProps>[] = [
  {
    name: "comparison",
    props: {
      eyebrow: "Survey",
      title: "Preferred reading mode",
      visual: "Terminal  ███████  70%\nBrowser   ███      30%",
      legend: [
        { label: "Terminal", tone: "accent" },
        { label: "Browser", tone: "ink" },
      ],
      caption: "Share of respondents by primary reading mode.",
      source: "Documentation survey",
    },
  },
  {
    name: "lossless-narrow",
    props: {
      eyebrow: "Survey",
      title: "Preferred reading mode",
      visual: "Terminal  ███████  70%\nBrowser   ███      30%",
      legend: [
        { label: "Terminal respondents", tone: "accent" },
        { label: "Browser respondents", tone: "ink" },
      ],
      caption: "The same figure at a narrow measure keeps every character.",
      source: "Documentation survey",
    },
    capabilities: { columns: 24 },
  },
] as const;

const LEGEND_TONES = {
  accent: "accent",
  ink: "neutral",
  success: "success",
  warning: "warning",
} as const;

function wrapLegendLabel(label: string, columns: number): readonly string[] {
  const flattened = label.replaceAll("\n", " ");
  if (measureText(flattened) <= columns) return [flattened];
  return wrapText(flattened, columns);
}

function renderFigureFrame(
  visual: string,
  heading: string,
  width: number,
  borderColor: TerminalColor,
  capabilities: TerminalCapabilities,
): string {
  const borderStyle = { color: borderColor };
  const flattenedHeading = heading.replaceAll("\n", " ");
  const embedded = measureText(flattenedHeading) <= width - 6;
  const interiorHeading = heading
    .split("\n")
    .map((line) => styleText(line, borderStyle, capabilities))
    .join("\n");
  const frame = renderBox(
    embedded
      ? { body: visual, title: flattenedHeading, width, borderStyle }
      : { body: `${interiorHeading}\n\n${visual}`, width, borderStyle },
    capabilities,
  );
  for (const line of frame.split("\n")) {
    if (measureText(line) > width) {
      throw new TypeError(
        `data figure content carries a grapheme wider than the frame's inner measure at width ${width}; widen the figure`,
      );
    }
  }
  return frame;
}

/** Render a captioned text figure with semantic legend marks. */
const renderDataFigureCli: CliRenderer<DataFigureCliProps> = (
  props,
  capabilities,
) => {
  if (
    props.title.trim() === "" || props.visual.trim() === "" ||
    props.caption.trim() === ""
  ) {
    throw new TypeError(
      "data figure title, visual, and caption must be non-empty",
    );
  }
  const requested = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requested) || requested < 5) {
    throw new TypeError(
      `data figure width must be a safe integer of at least 5; received ${requested}`,
    );
  }
  const width = Math.min(requested, capabilities.columns);
  const theme = terminalThemes[props.theme ?? "dark"];
  const heading = props.eyebrow === undefined
    ? props.title
    : `${props.eyebrow.toLocaleUpperCase()}: ${props.title}`;
  const frame = renderFigureFrame(
    props.visual,
    heading,
    width,
    props.surface === "sunken"
      ? terminalToneColor(theme, "accent")
      : terminalThemeColor(theme, "--discern-color-ink-faint"),
    capabilities,
  );
  const blocks = [frame];
  if ((props.legend?.length ?? 0) > 0) {
    const marker = capabilities.unicode ? "●" : "*";
    const entries = (props.legend ?? []).flatMap((item) => {
      const [first = "", ...continuations] = wrapLegendLabel(
        item.label,
        Math.max(1, width - 2),
      );
      return [
        renderStyledSpans([
          {
            text: marker,
            style: {
              color: terminalToneColor(
                theme,
                LEGEND_TONES[item.tone ?? "accent"],
              ),
            },
          },
          { text: ` ${first}` },
        ], capabilities),
        ...continuations.map((line) => `  ${line}`),
      ];
    });
    blocks.push(entries.join("\n"));
  }
  blocks.push(wrapText(props.caption, width).join("\n"));
  if (props.source !== undefined) {
    blocks.push(styleText(
      wrapText(`Source: ${props.source}`, width).join("\n"),
      {
        ...theme.typography.annotation,
        color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      },
      capabilities,
    ));
  }
  return joinVertical(blocks);
};

export default renderDataFigureCli;
