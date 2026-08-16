/**
 * Pure terminal renderer and deterministic example states for Data figure.
 *
 * @module
 */

import { renderStyledSpans, styleText } from "../../../cli/ansi.ts";
import type { TerminalCapabilities } from "../../../cli/capabilities.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import {
  measureText,
  padText,
  truncateText,
  wrapText,
} from "../../../cli/text.ts";
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
] as const;

const LEGEND_TONES = {
  accent: "accent",
  ink: "neutral",
  success: "success",
  warning: "warning",
} as const;

function renderFigureFrame(
  visual: string,
  title: string,
  width: number,
  borderColor: TerminalColor,
  capabilities: TerminalCapabilities,
): string {
  const glyphs = capabilities.unicode
    ? {
      topLeft: "┌",
      topRight: "┐",
      bottomLeft: "└",
      bottomRight: "┘",
      horizontal: "─",
      vertical: "│",
    }
    : {
      topLeft: "+",
      topRight: "+",
      bottomLeft: "+",
      bottomRight: "+",
      horizontal: "-",
      vertical: "|",
    };
  const framedTitle = ` ${
    truncateText(
      title,
      Math.max(0, width - 6),
      capabilities.unicode ? "…" : ".",
    )
  } `;
  const border = (value: string): string =>
    styleText(value, { color: borderColor }, capabilities);
  const top = `${border(glyphs.topLeft)}${border(framedTitle)}${
    border(glyphs.horizontal.repeat(width - 2 - measureText(framedTitle)))
  }${border(glyphs.topRight)}`;
  const innerWidth = width - 4;
  const content = visual.split("\n").map((line) => {
    const bounded = truncateText(
      line,
      innerWidth,
      capabilities.unicode ? "…" : ".",
    );
    return `${border(glyphs.vertical)} ${padText(bounded, innerWidth)} ${
      border(glyphs.vertical)
    }`;
  });
  const bottom = border(
    `${glyphs.bottomLeft}${
      glyphs.horizontal.repeat(width - 2)
    }${glyphs.bottomRight}`,
  );
  return [top, ...content, bottom].join("\n");
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
    const entries = (props.legend ?? []).map((item) =>
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
        {
          text: ` ${
            truncateText(
              item.label,
              Math.max(1, width - 2),
              capabilities.unicode ? "…" : ".",
            )
          }`,
        },
      ], capabilities)
    );
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
